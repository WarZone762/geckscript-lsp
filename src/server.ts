#!/bin/env node
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    DiagnosticSeverity,
    InitializeResult,
    ProposedFeatures,
    SemanticTokensRequest,
    TextDocumentSyncKind,
    WorkspaceFolder,
    createConnection,
} from "vscode-languageserver/node.js";
import { URI } from "vscode-uri";

import * as ast from "./geckscript/ast.js";
import { FileDatabase, ParsedString } from "./geckscript/hir/hir.js";
import * as features from "./language_features/features.js";
import * as TreeViewServer from "./tree_view/server.js";

const DB = new FileDatabase();

const checkIndex = process.argv.indexOf("--check");
if (checkIndex !== -1) {
    const path = process.argv.at(checkIndex + 1);
    if (path === undefined) {
        console.log("ERROR: expected path after --check");
        process.exit(1);
    }

    await DB.loadFolder(path);
    for (const [uri, doc] of DB.files.entries()) {
        for (const diagnostic of doc.diagnostics) {
            if (diagnostic.severity === DiagnosticSeverity.Error) {
                console.log(
                    `${path}${uri.split(path).at(-1) ?? uri}:${diagnostic.range.start.line}:${diagnostic.range.start.character}: ${diagnostic.message}`
                );
            }
        }
    }

    process.exit();
}

/** Helper to create a document reqest handler function */
function handler<RP extends { textDocument: { uri: string } }, R>(
    f: (parsed: ParsedString, params: RP) => Promise<R>
): (requestParams: RP) => Promise<R | null> {
    return async (requestParams) => {
        const parsed = DB.files.get(requestParams.textDocument.uri);
        if (parsed == null) {
            return null;
        }
        return await f(parsed, requestParams);
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
            completionProvider: {},
            definitionProvider: true,
            documentFormattingProvider: true,
            documentHighlightProvider: true,
            documentSymbolProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            renameProvider: { prepareProvider: true },
            selectionRangeProvider: true,
            textDocumentSync: TextDocumentSyncKind.Full,
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
            range: false,
            full: { delta: false },
        };
    }

    if (process.argv.find((e) => e === "--tree-view-server") !== undefined) {
        console.log("Running tree view server");
        treeViewServer = new TreeViewServer.TreeViewServer(8000, "localhost");
    }

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
    handler(async (parsed, params) => {
        TextDocument.update(parsed.doc, params.contentChanges, params.textDocument.version);
        parsed = DB.parseDoc(parsed.doc);

        treeViewServer?.writeTreeData(ast.toTreeData(parsed.root.green));

        connection.sendDiagnostics({ uri: parsed.doc.uri, diagnostics: parsed.diagnostics });
    })
);

connection.onCompletion(
    handler(async (parsed, params) => features.completionItems(DB, parsed, params.position))
);

// connection.onCompletionResolve(
//   async (item) => {
//     return features.completion_doc(item);
//   }
// );

connection.onDefinition(
    handler(async (parsed, params) => features.gotoDef(DB, parsed, params.position))
);
connection.onDocumentFormatting(
    handler(async (parsed, params) => features.formatDoc(parsed, params.options))
);
connection.onDocumentHighlight(
    handler(async (parsed, params) => features.getHighlight(DB, parsed, params.position))
);
connection.onDocumentSymbol(handler(async (parsed) => features.symbols(parsed)));
connection.onHover(
    handler(async (parsed, params) => {
        const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(params.position));
        if (token == undefined) {
            return null;
        }

        return {
            contents: token.text,
            range: { start: parsed.posAt(token.offset), end: parsed.posAt(token.end()) },
        };
    })
);
connection.onReferences(
    handler(async (parsed, params) => features.refs(DB, parsed, params.position))
);
connection.onPrepareRename(
    handler(async (parsed, params) => features.prepareRename(parsed, params.position))
);
connection.onRenameRequest(
    handler(async (parsed, params) => features.rename(DB, parsed, params.newName, params.position))
);
connection.onSelectionRanges(handler(async () => null));
connection.onRequest(
    SemanticTokensRequest.method,
    handler(async (parsed) => features.buildSemanticTokens(parsed))
);

// connection.onNotification("geckscript/updateFunctionData", () => FD.PopulateFunctionData(true));

connection.onExit(() => treeViewServer?.close());

connection.listen();
