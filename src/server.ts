#!/bin/env node

import { URI } from "vscode-uri";
import * as ast from "./geckscript/ast.js";
// import * as FD from "./geckscript/function_data.js";
import { FileDatabase, ParsedString } from "./geckscript/hir/hir.js";
import * as features from "./language_features/features.js";
// import * as Wiki from "./wiki/wiki.js";
import * as TreeViewServer from "./tree_view/server.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    createConnection,
    ProposedFeatures,
    TextDocumentSyncKind,
    InitializeResult,
    SemanticTokensRequest,
    HoverParams,
    DidChangeTextDocumentParams,
    DiagnosticSeverity,
    WorkspaceFolder,
} from "vscode-languageserver/node.js";

const DB = new FileDatabase();

const checkIndex = process.argv.indexOf("--check");
if (checkIndex !== -1) {
    const path = process.argv.at(checkIndex + 1);
    if (path === undefined) {
        console.log("ERROR: expected path after --check");
        process.exit(1);
    }

    await DB.loadFolder(path);
    for (const [path, doc] of DB.files.entries()) {
        if (doc.diagnostics.filter((d) => d.severity === DiagnosticSeverity.Error).length > 0) {
            console.log(`${path}:`);
        }
        for (const diagnostic of doc.diagnostics) {
            if (diagnostic.severity === DiagnosticSeverity.Error) {
                console.log(
                    `${diagnostic.range.start.line}:${diagnostic.range.start.character}: ${diagnostic.message}`
                );
            }
        }
    }

    process.exit();
}

/** Helper to create a document reqest handler function */
function handler<RP extends { textDocument: { uri: string } }, T extends unknown[], R>(
    f: (parsed: ParsedString, ...params: T) => R,
    applied: (f: (...params: T) => R, requestParams: RP) => R
): (requestParams: RP) => Promise<R | null> {
    return async (requestParams) => {
        const parsed = DB.files.get(requestParams.textDocument.uri);
        if (parsed == null) {
            return null;
        }
        return applied((...params) => f(parsed, ...params), requestParams);
    };
}

const connection = createConnection(ProposedFeatures.all);
let treeViewServer: TreeViewServer.TreeViewServer | undefined;
let rootDirs: WorkspaceFolder[] = [];

connection.onInitialize(async (params) => {
    rootDirs = params.workspaceFolders ?? [];
    const capabilities = params.capabilities;

    const result: InitializeResult = {
        capabilities: {
            // completionProvider: { resolveProvider: true },
            definitionProvider: true,
            documentFormattingProvider: true,
            documentHighlightProvider: true,
            documentSymbolProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            renameProvider: { prepareProvider: true },
            selectionRangeProvider: true,
            textDocumentSync: TextDocumentSyncKind.Incremental,
        },
    };

    if (capabilities.textDocument?.semanticTokens) {
        result.capabilities.semanticTokensProvider = {
            documentSelector: [
                {
                    language: "geckscript",
                    scheme: "file",
                },
            ],
            legend: features.LEGEND,
            full: true,
        };
    }

    if (process.argv.find((e) => e === "--tree-view-server") !== undefined) {
        console.log("Running tree view server");
        treeViewServer = new TreeViewServer.TreeViewServer(8000, "localhost");
    }

    // if (process.argv.find((arg) => arg === "--update-functions") !== undefined) {
    //     await FD.PopulateFunctionData(true);
    // }

    return result;
});

connection.onInitialized(async () => {
    for (const dir of rootDirs) {
        await DB.loadFolder(URI.parse(dir.uri).fsPath);
    }

    for (const file of DB.files.values()) {
        connection.sendDiagnostics({ uri: file.doc.uri, diagnostics: file.diagnostics });
    }
});

connection.onDidOpenTextDocument(async (params) => {
    const doc = params.textDocument;
    const parsed = DB.parseDoc(TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text));

    treeViewServer?.writeTreeData(ast.toTreeData(parsed.root.green));

    connection.sendDiagnostics({ uri: parsed.doc.uri, diagnostics: parsed.diagnostics });
});

connection.onDidChangeTextDocument(
    handler(
        (parsed, params: DidChangeTextDocumentParams) => {
            TextDocument.update(parsed.doc, params.contentChanges, params.textDocument.version);
            parsed = DB.parseDoc(parsed.doc);

            treeViewServer?.writeTreeData(ast.toTreeData(parsed.root.green));

            connection.sendDiagnostics({ uri: parsed.doc.uri, diagnostics: parsed.diagnostics });
        },
        (f, p) => f(p)
    )
);

// connection.onCompletion(
//   async (params) => {
//     return completion.GetCompletionItems(
//       environment.map[params.textDocument.uri],
//       params.position
//     );
//   }
// );

// connection.onCompletionResolve(
//   async (item) => {
//     return completion.GetCompletionItemDoc(item);
//   }
// );

connection.onDefinition(handler(features.gotoDef, (f, p) => f(p.position)));
connection.onDocumentFormatting(handler(features.formatDoc, (f, p) => f(p.options)));
connection.onDocumentHighlight(handler(features.getHighlight, (f, p) => f(p.position)));
connection.onDocumentSymbol(handler(features.symbols, (f) => f()));
connection.onHover(
    handler(
        (parsed, params: HoverParams) => {
            const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(params.position));
            if (token == undefined) {
                return null;
            }

            return {
                contents: token.text,
                range: { start: parsed.posAt(token.offset), end: parsed.posAt(token.end()) },
            };
        },
        (f, p) => f(p)
    )
);
connection.onReferences(handler(features.refs, (f, p) => f(p.position)));
connection.onPrepareRename(handler(features.prepareRename, (f, p) => f(p.position)));
connection.onRenameRequest(handler(features.rename, (f, p) => f(p.newName, p.position)));
connection.onSelectionRanges(
    handler(
        () => null,
        (f) => f()
    )
);
connection.onRequest(
    SemanticTokensRequest.method,
    handler(features.buildSemanticTokens, (f) => f())
);

// connection.onNotification("geckscript/updateFunctionData", () => FD.PopulateFunctionData(true));

connection.onExit(() => treeViewServer?.close());

connection.listen();
