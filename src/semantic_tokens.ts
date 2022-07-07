import { ProgressToken, SemanticTokensLegend, TextDocumentIdentifier } from "vscode-languageserver/node";

import * as vsc from "vscode-languageserver/node";

enum TokenTypes {
  function,
  variable,
  total
}

enum TokenModifiers {
  declaration,
  total
}

export const Legend: SemanticTokensLegend = {
  tokenTypes: [],
  tokenModifiers: []
};

for (let i = 0; i < TokenTypes.total; i++) {
  Legend.tokenTypes[i] = TokenTypes[i];
}
for (let i = 0; i < TokenTypes.total; i++) {
  Legend.tokenModifiers[i] = TokenModifiers[i];
}

export function onSemanticTokenRequestFull(
  documentId: TextDocumentIdentifier,
  progressToken: ProgressToken
) {
  console.log(Legend);
  const tokensBuilder = new vsc.SemanticTokensBuilder();

  tokensBuilder.push(0, 0, 5, TokenTypes["function"], TokenModifiers["declaration"]);

  return tokensBuilder.build();
}
