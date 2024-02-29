import * as ast from "./geckscript/ast.js";
import * as FD from "./geckscript/function_data.js";
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
} from "vscode-languageserver/node.js";

const DB = new FileDatabase();

const check_index = process.argv.indexOf("--check");
if (check_index !== -1) {
    const path = process.argv.at(check_index + 1);
    if (path === undefined) {
        console.log("ERROR: expected path after --check");
        process.exit(1);
    }

    await DB.load_folder(path);
    for (const [path, doc] of DB.files.entries()) {
        if (doc.diagnostics.length > 0) {
            console.log(`${path}:`);
        }
        for (const diagnostic of doc.diagnostics) {
            console.log(
                `${diagnostic.range.start.line}:${diagnostic.range.start.character}: ${diagnostic.message}`
            );
        }
    }

    process.exit();
}

const connection = createConnection(ProposedFeatures.all);
let tree_view_server: TreeViewServer.TreeViewServer | undefined;

/** Helper to create a document reqest handler function */
function handler<RP extends { textDocument: { uri: string } }, T extends unknown[], R>(
    f: (parsed: ParsedString, ...params: T) => R,
    applied: (f: (...params: T) => R, request_params: RP) => R
): (request_params: RP) => Promise<R | null> {
    return async (request_params) => {
        const parsed = DB.files.get(request_params.textDocument.uri);
        if (parsed == null) {
            return null;
        }
        return applied((...params) => f(parsed, ...params), request_params);
    };
}

connection.onInitialize(async (params) => {
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
            legend: features.legend,
            full: true,
        };
    }

    if (process.argv.find((e) => e === "--tree-view-server") !== undefined) {
        console.log("Running tree view server");
        tree_view_server = new TreeViewServer.TreeViewServer(8000, "localhost");
    }

    if (process.argv.find((arg) => arg === "--update-functions") !== undefined) {
        await FD.PopulateFunctionData(true);
    }

    return result;
});

connection.onDidOpenTextDocument(async (params) => {
    const doc = params.textDocument;
    const parsed = DB.parse_doc(
        TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text)
    );

    tree_view_server?.write_tree_data(ast.to_tree_data(parsed.root.green));

    connection.sendDiagnostics({ uri: parsed.doc.uri, diagnostics: parsed.diagnostics });
});

connection.onDidChangeTextDocument(
    handler(
        (parsed, params: DidChangeTextDocumentParams) => {
            TextDocument.update(parsed.doc, params.contentChanges, params.textDocument.version);
            parsed = DB.parse_doc(parsed.doc);

            tree_view_server?.write_tree_data(ast.to_tree_data(parsed.root.green));

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

connection.onDefinition(handler(features.goto_def, (f, p) => f(p.position)));
connection.onDocumentFormatting(handler(features.format_doc, (f, p) => f(p.options)));
connection.onDocumentHighlight(handler(features.get_highlight, (f, p) => f(p.position)));
connection.onDocumentSymbol(handler(features.symbols, (f) => f()));
connection.onHover(
    handler(
        (parsed, params: HoverParams) => {
            const token = ast.token_at_offset(parsed.root.green, parsed.offset_at(params.position));
            if (token == undefined) {
                return null;
            }

            return {
                contents: token.text,
                range: { start: parsed.pos_at(token.offset), end: parsed.pos_at(token.end()) },
            };
        },
        (f, p) => f(p)
    )
);
connection.onReferences(handler(features.refs, (f, p) => f(p.position)));
connection.onPrepareRename(handler(features.prepare_rename, (f, p) => f(p.position)));
connection.onRenameRequest(handler(features.rename, (f, p) => f(p.newName, p.position)));
connection.onSelectionRanges(
    handler(
        () => null,
        (f) => f()
    )
);
connection.onRequest(
    SemanticTokensRequest.method,
    handler(features.build_semantic_tokens, (f) => f())
);

connection.onNotification("geckscript/updateFunctionData", () => FD.PopulateFunctionData(true));

connection.onExit(() => tree_view_server?.close());

connection.listen();
