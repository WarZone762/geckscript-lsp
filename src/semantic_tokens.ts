import { ProgressToken, SemanticTokensLegend } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as vsc from "vscode-languageserver/node";
import * as Lexer from "./geckscript/lexer";
import { TokenType } from "./geckscript/tokens";

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

TokenTypeMap[Lexer.SemanticTokenType.UNKNOWN] = Legend.tokenTypes.indexOf("variable");
TokenTypeMap[Lexer.SemanticTokenType.COMMENT] = Legend.tokenTypes.indexOf("comment");
TokenTypeMap[Lexer.SemanticTokenType.FUNCTION] = Legend.tokenTypes.indexOf("function");
TokenTypeMap[Lexer.SemanticTokenType.KEYWORD] = Legend.tokenTypes.indexOf("keyword");
TokenTypeMap[Lexer.SemanticTokenType.NUMBER] = Legend.tokenTypes.indexOf("number");
TokenTypeMap[Lexer.SemanticTokenType.OPERATOR] = Legend.tokenTypes.indexOf("operator");
TokenTypeMap[Lexer.SemanticTokenType.STRING] = Legend.tokenTypes.indexOf("string");
TokenTypeMap[Lexer.SemanticTokenType.TYPE] = Legend.tokenTypes.indexOf("type");
TokenTypeMap[Lexer.SemanticTokenType.VARIABLE] = Legend.tokenTypes.indexOf("variable");


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
      if (token.type == TokenType.UNKNOWN) return;

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
