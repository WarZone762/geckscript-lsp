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

import * as Tokens from "./geckscript/tokens";
import * as Wiki from "./wiki";
import * as st from "./semantic_tokens";

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

connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
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
  async (hover_params: HoverParams): Promise<Hover> => {
    const doc = documents.get(hover_params.textDocument.uri);
    const text = doc?.getText();
    const offset = doc?.offsetAt(hover_params.position);

    const word = text?.match(new RegExp(`\\b\\w*(?<=^.{${offset}})\\w*\\b`, "s"))?.[0];

    const token = Tokens.CompletionItems.All.find(element => word?.toLowerCase() === element.label.toLowerCase());

    const hover: Hover = {
      contents: token?.label != undefined ? await Wiki.GetPageMarkdown(token.label) : ""
    };

    return hover;
  }
);

connection.onRequest(SemanticTokensRequest.method, (
  params: SemanticTokensParams
) => {
  return st.onSemanticTokenRequestFull(documents.get(params.textDocument.uri), params.partialResultToken, params.workDoneToken);
});

documents.listen(connection);

connection.listen();
