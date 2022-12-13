import { SemanticTokens, SemanticTokensBuilder, SemanticTokensLegend } from "vscode-languageserver/node";

import { Script } from "../geckscript/types/syntax_node";

export const Legend: SemanticTokensLegend = {
    tokenTypes: [
        "variable"
    ],
    tokenModifiers: [
        "readonly",
    ]
};

// export function BuildSemanticTokens(script: Script): SemanticTokens {
//   const tokens_builder = new SemanticTokensBuilder();

//   for (const token of script.semantic_tokens) {
//     tokens_builder.push(
//       token.range.start.line,
//       token.range.start.character,
//       token.range.end.character - token.range.start.character,
//       0,
//       1,
//     );
//   }

//   return tokens_builder.build();
// }
