// import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
// import { Position } from "vscode-languageserver-textdocument";
// import * as ast from "../geckscript/ast";
// import { Identifier, IsAssignmentOperator, Script, SyntaxKind, Token, VariableDeclarationStatement } from "../geckscript/types";

// export function GetHighlight(
//   script: Script,
//   position: Position
// ): DocumentHighlight[] | null {
//   const highlights: DocumentHighlight[] = [];

//   const token = ast.GetTokenAtPosition(script, position);

//   if (token?.kind === SyntaxKind.Identifier) {
//     const refs = ast.FindAllReferences(token, (token as Identifier).content);
//     if (refs.length !== 0) {

//       for (const ref of refs) {
//         let kind: DocumentHighlightKind;
//         if (
//           ref.parent.kind === SyntaxKind.SetStatement ||
//           ref.parent.kind === SyntaxKind.LetStatement ||
//           "parent" in ref.parent && (
//             ref.parent.parent.kind === SyntaxKind.LetStatement ||
//             (ref.parent.parent as VariableDeclarationStatement).children.expression != undefined
//           ) || (
//             ref.parent.kind === SyntaxKind.BinaryExpresison &&
//             IsAssignmentOperator(ref.parent.children.op.kind)
//           )
//         ) {
//           kind = DocumentHighlightKind.Write;
//         } else {
//           kind = DocumentHighlightKind.Read;
//         }

//         highlights.push({ range: ref.range, kind: kind });
//       }

//       return highlights;
//     }
//   }

//   for (const occurrence of ast.FindAllOccurrencesOfText(script, (token as Token).content)) {
//     highlights.push({ range: occurrence.range });
//   }

//   return highlights;
// }


