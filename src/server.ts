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
  Hover
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import * as TreeViewServer from "./tree_view/server";

import * as Wiki from "./wiki";
// import * as ST from "./semantic_tokens";

import { Parser } from "./geckscript/parser";


let tree_view_server: TreeViewServer.TreeViewServer | undefined;
if (process.argv.find(e => e === "--tree-view-server") !== undefined) {
  console.log("Running tree view server");
  tree_view_server = new TreeViewServer.TreeViewServer();
}

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
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
  //     legend: st.Legend,
  //     full: true
  //   };
  // }

  return result;
});

documents.onDidChangeContent(
  (params) => {
    const doc = params.document;

    const ast = Parser.Parse(doc.getText());
    tree_view_server?.write_message(JSON.stringify(ast.toTree()));
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: ast.root.diagnostics });
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
      item.documentation = await Wiki.GetPageMarkdown(item.data);
    }

    return item;
  }
);

connection.onHover(
  async (params: HoverParams): Promise<Hover | null> => {
    return null;
  }
);

connection.onRequest(SemanticTokensRequest.method, (
  params: SemanticTokensParams
) => {
  // return ST.OnSemanticTokenRequestFull(documents.get(params.textDocument.uri), params.partialResultToken, params.workDoneToken);
});

connection.onExit(() => {
  tree_view_server?.close();
});

documents.listen(connection);

connection.listen();
