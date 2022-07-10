import { ProgressToken, SemanticTokensLegend } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as vsc from "vscode-languageserver/node";
import * as Lexer from "./geckscript/lexer";

export const Legend: SemanticTokensLegend = {
  tokenTypes: [
    "comment",
    "function",
    "keyword",
    "number",
    "operator",
    "string",
    "type",
    "variable",
  ],
  tokenModifiers: [
    "declaration",
  ]
};

const TokenTypeMap: number[] = [];

TokenTypeMap[Lexer.TokenType.unknown] = Legend.tokenTypes.indexOf("variable");
TokenTypeMap[Lexer.TokenType.comment] = Legend.tokenTypes.indexOf("comment");
TokenTypeMap[Lexer.TokenType.function] = Legend.tokenTypes.indexOf("function");
TokenTypeMap[Lexer.TokenType.keyword] = Legend.tokenTypes.indexOf("keyword");
TokenTypeMap[Lexer.TokenType.number] = Legend.tokenTypes.indexOf("number");
TokenTypeMap[Lexer.TokenType.operator] = Legend.tokenTypes.indexOf("operator");
TokenTypeMap[Lexer.TokenType.string] = Legend.tokenTypes.indexOf("string");
TokenTypeMap[Lexer.TokenType.type] = Legend.tokenTypes.indexOf("type");
TokenTypeMap[Lexer.TokenType.variable] = Legend.tokenTypes.indexOf("variable");


export function onSemanticTokenRequestFull(
  document: TextDocument | undefined,
  partialResultToken?: ProgressToken,
  workDoneToken?: ProgressToken
): vsc.SemanticTokens {
  const tokensBuilder = new vsc.SemanticTokensBuilder();
  if (document === undefined) return tokensBuilder.build();

  const tokens = Lexer.GetTokens(document.getText());

  tokens.data.forEach((line_tokens: Lexer.Token[]) => {
    line_tokens.forEach((token: Lexer.Token) => {
      if (token.type == Lexer.TokenType.unknown) return;

      tokensBuilder.push(
        token.position.line,
        token.position.column,
        token.length,
        TokenTypeMap[token.type],
        Legend.tokenModifiers.indexOf("declaration")
      );
    });
  });

  return tokensBuilder.build();
}
