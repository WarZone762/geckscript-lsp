import * as ast from "./geckscript/ast";
import * as FD from "./geckscript/function_data";
import { Environment } from "./geckscript/hir";
// import * as Wiki from "./wiki/wiki";
import { get_highlight } from "./language_features/highlight";
import { build_semantic_tokens, legend } from "./language_features/semantic_tokens";
import * as TreeViewServer from "./tree_view/server";
// import * as completion from "./language_features/completion";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    SemanticTokensRequest,
    SemanticTokensParams,
    HoverParams,
    Hover,
} from "vscode-languageserver/node";

let tree_view_server: TreeViewServer.TreeViewServer | undefined;

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const ENV = new Environment();

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

documents.onDidChangeContent(async (params) => {
    const doc = params.document;

    const parsed = ENV.parse_doc(doc);

    tree_view_server?.write_tree_data(ast.to_tree_data(parsed.root));

    connection.sendDiagnostics({ uri: doc.uri, diagnostics: parsed.diagnostics });
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
    const parsed = ENV.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    const token = ast.token_at_offset(parsed.root, parsed.offset_at(params.position));
    if (token == undefined) {
        return null;
    }

    return {
        contents: token.text,
        range: { start: parsed.pos_at(token.offset), end: parsed.pos_at(token.end()) },
    };
});

connection.onDocumentHighlight(async (params) => {
    const parsed = ENV.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    return get_highlight(parsed, params.position);
});

connection.onRequest(SemanticTokensRequest.method, async (params: SemanticTokensParams) => {
    const parsed = ENV.files.get(params.textDocument.uri);
    if (parsed == undefined) {
        return null;
    }

    return build_semantic_tokens(parsed);
});

connection.onNotification("GECKScript/updateFunctionData", () => FD.PopulateFunctionData(true));

connection.onExit(() => tree_view_server?.close());

documents.listen(connection);

connection.listen();
