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

import { TokenType } from "./geckscript/tokens";
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
    children: [{ name: String(obj) }]
  };

  const hierarchical: HierarchicalData = {
    name: root_name ?? `root: ${obj.constructor.name}`,
    children: []
  };

  for (const [k, v] of Object.entries(obj as object)) {
    if (k in exclude || v === undefined) continue;
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
        "semantic_type": true,
        "range": true,
        "position": true,
        "length": true,
        "token": true,
        "content": true,
      }
    )));
  }
);

connection.onCompletion(
  (params) => {
    const token = documents_tokens[params.textDocument.uri].getTokenAtPos(params.position);
    const completion_items: CompletionItem[] = [];
    if (token == null) return completion_items.concat(
      Tokens.Typenames.completion_items,
      Tokens.Keywords.completion_items,
      Tokens.BlockTypes.completion_items,
      Tokens.Functions.completion_items,
    );

    if (token.type === TokenType.COMMENT || token.type === TokenType.STRING) {
      return null;
    }

    return completion_items.concat(
      Tokens.Typenames.completion_items,
      Tokens.Keywords.completion_items,
      Tokens.BlockTypes.completion_items,
      Tokens.Functions.completion_items,
    );
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
    const token = documents_tokens[params.textDocument.uri].getTokenAtPos(params.position);
    if (token == null) return null;

    const token_type = token.type;

    let page_title: string | undefined;
    switch (token_type) {
      case TokenType.TYPENAME:
        page_title = Tokens.Typenames.getTokenPageName(token.content.toLowerCase());
        break;

      case TokenType.KEYWORD:
        page_title = Tokens.Keywords.getTokenPageName(token.content.toLowerCase());
        break;

      case TokenType.BLOCK_TYPE:
        page_title = Tokens.BlockTypes.getTokenPageName(token.content.toLowerCase());
        break;

      case TokenType.OPERATOR:
        page_title = Tokens.Operators.getTokenPageName(token.content.toLowerCase());
        break;

      case TokenType.FUNCTION:
        page_title = Tokens.Functions.getTokenPageName(token.content.toLowerCase());
        break;
    }

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
