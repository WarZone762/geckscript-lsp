import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";
import { FindAllOccurrencesOfText, FindAllReferences, GetTokenAtPosition } from "../geckscript/ast";
import { BinaryExpression, Identifier, IsAssignmentOperator, Script, SyntaxKind, Token, VariableDeclarationStatement } from "../geckscript/types";

export function GetHighlight(
  script: Script,
  position: Position
): DocumentHighlight[] | null {
  const highlights: DocumentHighlight[] = [];

  const token = GetTokenAtPosition(script, position);

  if (token?.kind === SyntaxKind.Identifier) {
    const refs = FindAllReferences(token, (token as Identifier).content);
    if (refs.length !== 0) {

      for (const ref of refs) {
        let kind: DocumentHighlightKind;
        if (
          ref.parent?.kind === SyntaxKind.SetStatement ||
          ref.parent?.kind === SyntaxKind.LetStatement ||
          ref.parent?.parent?.kind === SyntaxKind.LetStatement ||
          (ref.parent?.parent as VariableDeclarationStatement).expression != undefined ||
          (
            ref.parent?.kind === SyntaxKind.BinaryExpresison &&
            IsAssignmentOperator((ref.parent as BinaryExpression).op.kind)
          )
        )
          kind = DocumentHighlightKind.Write;
        else
          kind = DocumentHighlightKind.Read;

        highlights.push({ range: ref.range, kind: kind });
      }

      return highlights;
    }
  }

  for (const occurrence of FindAllOccurrencesOfText(script, (token as Token).content)) {
    highlights.push({ range: occurrence.range });
  }

  return highlights;
}


