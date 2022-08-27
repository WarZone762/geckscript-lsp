import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  SemanticTokensRequest,
  SemanticTokensParams,
  HoverParams,
  Hover,
} from "vscode-languageserver/node";

import { Range, TextDocument } from "vscode-languageserver-textdocument";

import * as TreeViewServer from "./tree_view/server";

// import * as Wiki from "./wiki/wiki";
import { Environment, Token } from "./geckscript/types";
import * as AST from "./geckscript/ast";
import * as ST from "./language_features/semantic_tokens";
import * as FD from "./geckscript/function_data";


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
        completionProvider: {
          resolveProvider: true
        },
        hoverProvider: true,
      }
    };

    if (capabilities.textDocument?.semanticTokens) {
      result.capabilities.semanticTokensProvider = {
        documentSelector: [{
          language: "GECKScript",
          scheme: "file"
        }],
        legend: ST.Legend,
        full: true
      };
    }

    if (process.argv.find(e => e === "--tree-view-server") !== undefined) {
      console.log("Running tree view server");
      tree_view_server = new TreeViewServer.TreeViewServer();
    }

    if (process.argv.find(arg => arg === "--update-functions") !== undefined)
      await FD.PopulateFunctionData(true);

    return result;
  });

documents.onDidChangeContent(
  (params) => {
    const doc = params.document;

    const script = environment.processDocument(doc);
    tree_view_server?.write_tree_data(AST.NodeToTreeData(script));

    connection.sendDiagnostics({ uri: doc.uri, diagnostics: script.diagnostics });
  }
);

connection.onCompletion(
  (params) => {
    return null;
  }
);

connection.onCompletionResolve(
  async (item: CompletionItem): Promise<CompletionItem> => {
    if (item.data != undefined) {
      item.detail = item.label;
      // item.documentation = await Wiki.GetPageMarkdown(item.data);
    }

    return item;
  }
);

connection.onHover(
  async (params: HoverParams): Promise<Hover | null> => {
    const token = AST.GetTokenAtPosition(environment.map[params.textDocument.uri], params.position);

    return {
      contents: String((token as Token)?.content)
    };
  }
);

connection.onRequest(
  SemanticTokensRequest.method,
  async (params: SemanticTokensParams) => {
    const script = environment.map[params.textDocument.uri];

    return ST.BuildSemanticTokens(script);
  });

connection.onNotification(
  "GECKScript/updateFunctionData",
  () => FD.PopulateFunctionData(true)
);

connection.onExit(() => {
  tree_view_server?.close();
});

documents.listen(connection);

connection.listen();
