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

import { TextDocument } from "vscode-languageserver-textdocument";

import * as TreeViewServer from "./tree_view/server";

// import * as Wiki from "./wiki/wiki";
import { Token } from "./geckscript/types/syntax_node";
import { Environment } from "./geckscript/types/ast_node";
import * as ast from "./geckscript/ast";
// import * as ST from "./language_features/semantic_tokens";
import * as FD from "./geckscript/function_data";
// import * as completion from "./language_features/completion";
// import { GetHighlight as GetHighlights } from "./language_features/highlight";

import * as fs from "fs/promises";
import * as path from "path";


let tree_view_server: TreeViewServer.TreeViewServer | undefined;

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const environment: Environment = new Environment();

connection.onInitialize(
    async (params: InitializeParams) => {
        const capabilities = params.capabilities;

        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
                documentHighlightProvider: true,
                completionProvider: {
                    resolveProvider: true
                },
                hoverProvider: true,
            }
        };

        // if (capabilities.textDocument?.semanticTokens) {
        //   result.capabilities.semanticTokensProvider = {
        //     documentSelector: [{
        //       language: "GECKScript",
        //       scheme: "file"
        //     }],
        //     legend: ST.Legend,
        //     full: true
        //   };
        // }

        if (process.argv.find(e => e === "--tree-view-server") !== undefined) {
            console.log("Running tree view server");
            tree_view_server = new TreeViewServer.TreeViewServer();
        }

        if (process.argv.find(arg => arg === "--update-functions") !== undefined) {
            await FD.PopulateFunctionData(true);
        }

        return result;
    }
);

documents.onDidChangeContent(
    async (params) => {
        const doc = params.document;

        const script = await environment.processDocument(doc);

        fs.writeFile(path.join(__dirname, "..", "..", "test.html"), ast.ToHTML(script.parsed.script));

        tree_view_server?.write_tree_data(ast.ToTreeDataFull(script.parsed.script));

        connection.sendDiagnostics({ uri: doc.uri, diagnostics: script.parsed.diagnostics });
    }
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

connection.onHover(
    async (params: HoverParams): Promise<Hover | null> => {
        const doc = documents.get(params.textDocument.uri)!;

        const token = ast.TokenAtPosition(environment.map[doc.uri].parsed.script, doc.offsetAt(params.position));

        return {
            contents: String(token?.text)
        };
    }
);

// connection.onDocumentHighlight(
//   (params) => {
//     return GetHighlights(environment.map[params.textDocument.uri], params.position);
//   }
// );

// connection.onRequest(
//   SemanticTokensRequest.method,
//   async (params: SemanticTokensParams) => {
//     const script = environment.map[params.textDocument.uri];

//     return ST.BuildSemanticTokens(script);
//   }
// );

connection.onNotification(
    "GECKScript/updateFunctionData",
    () => FD.PopulateFunctionData(true)
);

connection.onExit(() => tree_view_server?.close());

documents.listen(connection);

connection.listen();
