import * as ast from "../geckscript/ast";
import { ParsedString, ScopeNode } from "../geckscript/hir";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

export function get_highlight(parsed: ParsedString, pos: Position): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token == undefined) {
        return null;
    }

    if (token.kind === SyntaxKind.IDENT) {
        const scope = ScopeNode.build(parsed.root.green);
        scope.traverse((s) => {
            s.decls
                .filter((e) => e.name()?.text === token.text)
                .forEach((e) => {
                    highlights.push({
                        range: {
                            start: parsed.pos_at(e.green.offset),
                            end: parsed.pos_at(e.green.end()),
                        },
                        kind: DocumentHighlightKind.Text,
                    });
                });
            s.refs
                .filter((e) => e.name_ref()?.text === token.text)
                .forEach((e) => {
                    highlights.push({
                        range: {
                            start: parsed.pos_at(e.green.offset),
                            end: parsed.pos_at(e.green.end()),
                        },
                        kind: DocumentHighlightKind.Text,
                    });
                });
        });
    } else {
        for (const e of ast.str_occurences(parsed.root.green, token.text)) {
            highlights.push({
                range: { start: parsed.pos_at(e.offset), end: parsed.pos_at(e.end()) },
                kind: DocumentHighlightKind.Text,
            });
        }
    }

    return highlights;
}

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
