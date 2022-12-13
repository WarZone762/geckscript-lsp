import { TokenData } from "../geckscript/types/token_data";
import { FunctionData, GetFunctionInfo } from "../geckscript/function_data";
import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { IsTypename, IsKeyword, IsOperator, Script, SyntaxKind } from "../geckscript/types/syntax_node";
import { Position } from "vscode-languageserver-textdocument";
import * as ast from "../geckscript/ast";
import * as functions from "../wiki/functions";


// export async function GetCompletionItems(
//   script: Script,
//   position: Position
// ): Promise<CompletionItem[] | null> {
//   const token = ast.GetNearestToken(script, position);

//   if (
//     token.kind === SyntaxKind.Comment ||
//     token.kind === SyntaxKind.String ||
//     token.kind === SyntaxKind.Script
//   ) {
//     return null;
//   }

//   const completion_items: CompletionItem[] = [];

//   for (const v of Object.values(ast.GetVisibleSymbols(token))) {
//     completion_items.push({
//       label: v.name,
//       data: v.name,
//       kind: CompletionItemKind.Variable,
//     });
//   }

//   for (const v of Object.values(TokenData)) {
//     if (IsOperator(v.kind)) {
//       continue;
//     }

//     completion_items.push({
//       label: v.canonical_name,
//       data: v.wiki_page_name ?? v.canonical_name,
//       kind:
//         IsTypename(v.kind) ? CompletionItemKind.TypeParameter :
//           IsKeyword(v.kind) ? CompletionItemKind.Keyword :
//             CompletionItemKind.Constant,
//     });
//   }

//   for (const v of Object.values(FunctionData)) {
//     completion_items.push({
//       label: v.canonical_name,
//       data: v.name,
//       kind: CompletionItemKind.Function,
//     });
//   }

//   return completion_items;
// }

export async function GetCompletionItemDoc(item: CompletionItem): Promise<CompletionItem> {
    if (item.data == undefined) {
        return item;
    }

    const func_info = GetFunctionInfo(item.data)!;
    if (func_info == undefined) {
        item.detail = item.data;
        return item;
    }

    const doc = await functions.GetFunctionDocumentation(func_info.wiki_page_name);
    if (doc == undefined || doc.template == undefined) {
        item.detail = func_info.canonical_name;
        item.documentation = doc?.text ?? "Unable to get documentation";

        return item;
    }

    item.detail = functions.GetFunctionSignature(func_info, doc);

    let text = doc.template.summary ?? "";
    text += "\n\n" + doc.text;


    item.documentation = {
        kind: "markdown",
        value: text,
    };

    // item.documentation.kind = "plaintext";

    return item;
}
