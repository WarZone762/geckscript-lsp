import * as ast from "./geckscript/ast";
import * as FD from "./geckscript/function_data";
import { FileDatabase } from "./geckscript/hir";
import { format_doc } from "./language_features/format";
// import * as Wiki from "./wiki/wiki";
import { get_highlight } from "./language_features/highlight";
import { build_semantic_tokens, legend } from "./language_features/semantic_tokens";
import * as TreeViewServer from "./tree_view/server";
// import * as completion from "./language_features/completion";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    createConnection,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    SemanticTokensRequest,
    SemanticTokensParams,
    HoverParams,
    Hover,
    DocumentFormattingParams,
} from "vscode-languageserver/node";

let tree_view_server: TreeViewServer.TreeViewServer | undefined;

const connection = createConnection(ProposedFeatures.all);
const DB = new FileDatabase();

connection.onInitialize(async (params: InitializeParams) => {
    const capabilities = params.capabilities;

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            documentHighlightProvider: true,
            // completionProvider: {
            //     resolveProvider: true
            // },
            hoverProvider: true,
            documentFormattingProvider: true,
        },
    };

    if (capabilities.textDocument?.semanticTokens) {
        result.capabilities.semanticTokensProvider = {
            documentSelector: [
                {
                    language: "GECKScript",
                    scheme: "file",
                },
            ],
            legend: legend,
            full: true,
        };
    }

    if (process.argv.find((e) => e === "--tree-view-server") !== undefined) {
        console.log("Running tree view server");
        tree_view_server = new TreeViewServer.TreeViewServer();
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

connection.onDidChangeTextDocument(async (params) => {
    let parsed = DB.files.get(params.textDocument.uri)!;
    TextDocument.update(parsed.doc, params.contentChanges, params.textDocument.version);
    parsed = DB.parse_doc(parsed.doc);

    tree_view_server?.write_tree_data(ast.to_tree_data(parsed.root.green));

    connection.sendDiagnostics({ uri: parsed.doc.uri, diagnostics: parsed.diagnostics });
});

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

connection.onHover(async (params: HoverParams): Promise<Hover | null> => {
    const parsed = DB.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    const token = ast.token_at_offset(parsed.root.green, parsed.offset_at(params.position));
    if (token == undefined) {
        return null;
    }

    return {
        contents: token.text,
        range: { start: parsed.pos_at(token.offset), end: parsed.pos_at(token.end()) },
    };
});

connection.onDocumentHighlight(async (params) => {
    const parsed = DB.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    return get_highlight(parsed, params.position);
});

connection.onDocumentFormatting(async (params: DocumentFormattingParams) => {
    const parsed = DB.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    return format_doc(parsed, params.options);
});

connection.onRequest(SemanticTokensRequest.method, async (params: SemanticTokensParams) => {
    const parsed = DB.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    return build_semantic_tokens(parsed);
});

connection.onNotification("GECKScript/updateFunctionData", () => FD.PopulateFunctionData(true));

connection.onExit(() => tree_view_server?.close());

connection.listen();
