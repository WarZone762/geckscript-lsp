import { ProgressToken, SemanticTokensLegend } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as vsc from "vscode-languageserver/node";
import * as Lexer from "./geckscript/lexer";
import { SyntaxType } from "./geckscript/types";

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

TokenTypeMap[SyntaxType.Unknown] = Legend.tokenTypes.indexOf("variable");
TokenTypeMap[SyntaxType.Comment] = Legend.tokenTypes.indexOf("comment");
TokenTypeMap[SyntaxType.Expression] = Legend.tokenTypes.indexOf("function");
TokenTypeMap[SyntaxType.Keyword] = Legend.tokenTypes.indexOf("keyword");
TokenTypeMap[SyntaxType.Literal] = Legend.tokenTypes.indexOf("number");
TokenTypeMap[SyntaxType.Operator] = Legend.tokenTypes.indexOf("operator");
TokenTypeMap[SyntaxType.Literal] = Legend.tokenTypes.indexOf("string");
TokenTypeMap[SyntaxType.Typename] = Legend.tokenTypes.indexOf("type");
TokenTypeMap[SyntaxType.Identifier] = Legend.tokenTypes.indexOf("variable");


export function OnSemanticTokenRequestFull(
  document: TextDocument | undefined,
  partialResultToken?: ProgressToken,
  workDoneToken?: ProgressToken
): vsc.SemanticTokens {
  const tokensBuilder = new vsc.SemanticTokensBuilder();
  if (document === undefined) return tokensBuilder.build();

  const tokens = Lexer.Lexer.Lex(document.getText());

  for (const token of tokens) {
    if (token.type == SyntaxType.Unknown) continue;

    tokensBuilder.push(
      token.range.start.line,
      token.range.start.character,
      token.range.end.character - token.range.start.character,
      TokenTypeMap[token.type],
      Legend.tokenModifiers.indexOf("declaration")
    );
  }

  return tokensBuilder.build();
}
