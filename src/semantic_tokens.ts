import { ProgressToken, SemanticTokensLegend } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as vsc from "vscode-languageserver/node";
import * as Lexer from "./geckscript/lexer";
import { TokenType } from "./geckscript/types";

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

// TokenTypeMap[TokenType.Unknown] = Legend.tokenTypes.indexOf("variable");
// TokenTypeMap[TokenType.Comment] = Legend.tokenTypes.indexOf("comment");
// TokenTypeMap[TokenType.Expression] = Legend.tokenTypes.indexOf("function");
// TokenTypeMap[TokenType.Keyword] = Legend.tokenTypes.indexOf("keyword");
// TokenTypeMap[TokenType.Literal] = Legend.tokenTypes.indexOf("number");
// TokenTypeMap[TokenType.Operator] = Legend.tokenTypes.indexOf("operator");
// TokenTypeMap[TokenType.Literal] = Legend.tokenTypes.indexOf("string");
// TokenTypeMap[TokenType.Typename] = Legend.tokenTypes.indexOf("type");
// TokenTypeMap[TokenType.Identifier] = Legend.tokenTypes.indexOf("variable");


export function OnSemanticTokenRequestFull(
  document: TextDocument | undefined,
  partialResultToken?: ProgressToken,
  workDoneToken?: ProgressToken
): vsc.SemanticTokens {
  const tokensBuilder = new vsc.SemanticTokensBuilder();
  if (document === undefined) return tokensBuilder.build();

  const tokens = Lexer.Lexer.Lex(document.getText());

  for (const token of tokens) {
    if (token.token_type == TokenType.Unknown) continue;

    tokensBuilder.push(
      token.range.start.line,
      token.range.start.character,
      token.range.end.character - token.range.start.character,
      TokenTypeMap[token.token_type],
      Legend.tokenModifiers.indexOf("declaration")
    );
  }

  return tokensBuilder.build();
}
