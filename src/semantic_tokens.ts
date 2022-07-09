import { ProgressToken, SemanticTokensLegend } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as vsc from "vscode-languageserver/node";
import * as Lexer from "./geckscript/lexer";

enum SemanticTokenTypes {
  comment,
  function,
  keyword,
  operator,
  number,
  string,
  type,
  variable,
  TOTAL
}

enum SemanticTokenModifiers {
  declaration,
  TOTAL
}

export const Legend: SemanticTokensLegend = {
  tokenTypes: [],
  tokenModifiers: []
};

for (let i = 0; i < SemanticTokenTypes.TOTAL; i++) {
  Legend.tokenTypes[i] = SemanticTokenTypes[i];
}
for (let i = 0; i < SemanticTokenModifiers.TOTAL; i++) {
  Legend.tokenModifiers[i] = SemanticTokenModifiers[i];
}

export function onSemanticTokenRequestFull(
  document: TextDocument | undefined,
  partialResultToken?: ProgressToken,
  workDoneToken?: ProgressToken
): vsc.SemanticTokens {
  const tokensBuilder = new vsc.SemanticTokensBuilder();
  if (document === undefined) return tokensBuilder.build();

  const text = document.getText();
  const lexer = new Lexer.Lexer(text);

  const tokens = lexer.getTokens();

  tokens.forEach((line_tokens: Lexer.Token[]) => {
    line_tokens.forEach((token: Lexer.Token) => {
      if (token.type == Lexer.TokenType.unknown) return;

      tokensBuilder.push(
        token.position.line,
        token.position.column,
        token.length,
        // eslint-disable-next-line
        // @ts-ignore
        SemanticTokenTypes[Lexer.TokenType[token.type]],
        SemanticTokenModifiers["declaration"]
      );
    });
  });

  return tokensBuilder.build();
}
