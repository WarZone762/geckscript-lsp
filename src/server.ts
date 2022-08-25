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

import * as Wiki from "./wiki";
import { Environment, Token } from "./geckscript/types";
import * as AST from "./geckscript/ast";
// import * as ST from "./semantic_tokens";


let tree_view_server: TreeViewServer.TreeViewServer | undefined;
if (process.argv.find(e => e === "--tree-view-server") !== undefined) {
  console.log("Running tree view server");
  tree_view_server = new TreeViewServer.TreeViewServer();
}

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const scripts: Environment = new Environment();

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

    const script = scripts.processDocument(doc);
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
      item.documentation = await Wiki.GetPageMarkdown(item.data);
    }

    return item;
  }
);

connection.onHover(
  async (params: HoverParams): Promise<Hover | null> => {
    const token = AST.GetTokenAtPosition(scripts.map[params.textDocument.uri], params.position);

    return {
      contents: String((token as Token)?.content)
    };
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
