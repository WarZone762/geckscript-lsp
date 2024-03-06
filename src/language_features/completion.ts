import * as ast from "../geckscript/ast.js";
import { Script } from "../geckscript/ast/generated.js";
import { FunctionData, GetFunctionInfo } from "../geckscript/function_data.js";
import { TokenData } from "../geckscript/types/token_data.js";
import * as functions from "../wiki/functions.js";
import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

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

//   const completionItems: CompletionItem[] = [];

//   for (const v of Object.values(ast.GetVisibleSymbols(token))) {
//     completionItems.push({
//       label: v.name,
//       data: v.name,
//       kind: CompletionItemKind.Variable,
//     });
//   }

//   for (const v of Object.values(TokenData)) {
//     if (IsOperator(v.kind)) {
//       continue;
//     }

//     completionItems.push({
//       label: v.canonicalName,
//       data: v.wikiPageName ?? v.canonicalName,
//       kind:
//         IsTypename(v.kind) ? CompletionItemKind.TypeParameter :
//           IsKeyword(v.kind) ? CompletionItemKind.Keyword :
//             CompletionItemKind.Constant,
//     });
//   }

//   for (const v of Object.values(FunctionData)) {
//     completionItems.push({
//       label: v.canonicalName,
//       data: v.name,
//       kind: CompletionItemKind.Function,
//     });
//   }

//   return completionItems;
// }

export async function GetCompletionItemDoc(item: CompletionItem): Promise<CompletionItem> {
    if (item.data == undefined) {
        return item;
    }

    const funcInfo = GetFunctionInfo(item.data)!;
    if (funcInfo == undefined) {
        item.detail = item.data;
        return item;
    }

    const doc = await functions.GetFunctionDocumentation(funcInfo.wikiPageName);
    if (doc == undefined || doc.template == undefined) {
        item.detail = funcInfo.canonicalName;
        item.documentation = doc?.text ?? "Unable to get documentation";

        return item;
    }

    item.detail = functions.GetFunctionSignature(funcInfo, doc);

    let text = doc.template.summary ?? "";
    text += "\n\n" + doc.text;

    item.documentation = {
        kind: "markdown",
        value: text,
    };

    // item.documentation.kind = "plaintext";

    return item;
}
