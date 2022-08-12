import { ProgressToken, SemanticTokensLegend } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as vsc from "vscode-languageserver/node";
import * as Lexer from "./geckscript/lexer";
import { TokenType } from "./geckscript/token_data";

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

TokenTypeMap[TokenType.UNKNOWN] = Legend.tokenTypes.indexOf("variable");
TokenTypeMap[TokenType.COMMENT] = Legend.tokenTypes.indexOf("comment");
TokenTypeMap[TokenType.FUNCTION] = Legend.tokenTypes.indexOf("function");
TokenTypeMap[TokenType.KEYWORD] = Legend.tokenTypes.indexOf("keyword");
TokenTypeMap[TokenType.NUMBER] = Legend.tokenTypes.indexOf("number");
TokenTypeMap[TokenType.OPERATOR] = Legend.tokenTypes.indexOf("operator");
TokenTypeMap[TokenType.STRING] = Legend.tokenTypes.indexOf("string");
TokenTypeMap[TokenType.TYPENAME] = Legend.tokenTypes.indexOf("type");
TokenTypeMap[TokenType.ID] = Legend.tokenTypes.indexOf("variable");


export function OnSemanticTokenRequestFull(
  document: TextDocument | undefined,
  partialResultToken?: ProgressToken,
  workDoneToken?: ProgressToken
): vsc.SemanticTokens {
  const tokensBuilder = new vsc.SemanticTokensBuilder();
  if (document === undefined) return tokensBuilder.build();

  const tokens = Lexer.Lexer.Lex(document.getText());

  for (const token of tokens) {
    if (token.type == TokenType.UNKNOWN) continue;

    tokensBuilder.push(
      token.position.line,
      token.position.character,
      token.length,
      TokenTypeMap[token.type],
      Legend.tokenModifiers.indexOf("declaration")
    );
  }

  return tokensBuilder.build();
}
