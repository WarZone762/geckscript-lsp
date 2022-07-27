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

import * as Tokens from "./geckscript/tokens";
import * as Wiki from "./wiki";
import * as ST from "./semantic_tokens";

import * as Lexer from "./geckscript/lexer";
import * as Parser from "./geckscript/parser";


type HierarchicalData = {
  name: string,
  children?: HierarchicalData[]
}
function ObjectToHierarchy(obj: any, root_name?: string, exclude = {}): HierarchicalData {
  if (typeof obj !== "object" || obj === null) return {
    name: root_name ?? "root",
    children: [{ name: obj.toString() }]
  };

  const hierarchical: HierarchicalData = {
    name: root_name ?? `root: ${obj.constructor.name}`,
    children: []
  };

  for (const [k, v] of Object.entries(obj as object)) {
    if (k in exclude) continue;
    hierarchical.children!.push(ObjectToHierarchy(v, `${k}: ${v.constructor.name}`, exclude));
  }

  return hierarchical;
}


let tree_view_server: TreeViewServer.TreeViewServer | undefined;
if (process.argv.find(e => e === "--tree-view-server") !== undefined) {
  console.log("Running tree view server");
  tree_view_server = new TreeViewServer.TreeViewServer();
}

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const documents_tokens: Record<string, Lexer.TokensStorage> = {};

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
    documents_tokens[params.document.uri] = Lexer.GetTokens(params.document.getText());
    tree_view_server?.write_message(JSON.stringify(ObjectToHierarchy(
      Parser.GetAST(params.document.getText()),
      undefined,
      {
        "type": true,
        "range": true,
        "position": true,
        "length": true,
        "token": true,
      }
    )));
  }
);

connection.onCompletion(
  (params) => {
    const token = documents_tokens[params.textDocument.uri].getTokenAtPos(params.position);
    if (token == null) return Tokens.CompletionItems.All;

    if (token.type === Lexer.TokenType.comment || token.type === Lexer.TokenType.string) {
      return null;
    }

    return Tokens.CompletionItems.All;
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
    const token = documents_tokens[params.textDocument.uri].getTokenAtPos(params.position)?.content.toLowerCase();
    if (token == null) return null;

    const page_title = Tokens.All[Tokens.TokensLower.All[token]];

    if (page_title == null) return null;

    return {
      contents: await Wiki.GetPageMarkdown(page_title)
    };
  }
);

connection.onRequest(SemanticTokensRequest.method, (
  params: SemanticTokensParams
) => {
  return ST.onSemanticTokenRequestFull(documents.get(params.textDocument.uri), params.partialResultToken, params.workDoneToken);
});

connection.onExit(() => {
  tree_view_server?.close();
});

documents.listen(connection);

connection.listen();
