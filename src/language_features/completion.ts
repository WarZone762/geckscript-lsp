import { TokenData } from "../geckscript/token_data";
import { FunctionData, GetFunctionInfo } from "../geckscript/function_data";
import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { IsTypename, IsKeyword, IsOperator, Script, SyntaxKind } from "../geckscript/types";
import { Position } from "vscode-languageserver-textdocument";
import * as ast from "../geckscript/ast";
import * as functions from "../wiki/functions";


export async function GetCompletionItems(
  script: Script,
  position: Position
): Promise<CompletionItem[] | null> {
  const token = ast.GetTokenAtPosition(script, position);

  if (
    token?.kind === SyntaxKind.Comment ||
    token?.kind === SyntaxKind.String
  ) return null;

  const completion_items: CompletionItem[] = [];

  for (const v of Object.values(TokenData)) {
    if (IsOperator(v.kind)) continue;

    completion_items.push({
      label: v.canonical_name,
      data: v.wiki_page_name ?? v.canonical_name,
      kind:
        IsTypename(v.kind) ? CompletionItemKind.TypeParameter :
          IsKeyword(v.kind) ? CompletionItemKind.Keyword :
            CompletionItemKind.Constant,
    });
  }

  for (const v of Object.values(FunctionData)) {
    completion_items.push({
      label: v.canonical_name,
      data: v.wiki_page_name ?? v.canonical_name,
      kind: CompletionItemKind.Function,
    });
  }

  return completion_items;
}

export async function GetCompletionItemDoc(item: CompletionItem): Promise<CompletionItem> {
  if (item.data == undefined) return item;

  const doc = await functions.GetFunctionDocumentation(item.data);
  const func_info = GetFunctionInfo(item.data);

  item.detail =
    "(" +
    (doc.template.returnVal != undefined ? `${doc.template.returnVal}:` : "") +
    `${doc.template.returnType}) ${doc.template.name ?? func_info?.canonical_name} `;

  for (const arg of doc.template.arguments ?? []) {
    if ((arg as functions.FunctionArgumentTemplate)?.Name != undefined)
      item.detail += `${(arg as functions.FunctionArgumentTemplate).Name}:`;
    if ((arg as functions.FunctionArgumentTemplate)?.Type != undefined)
      item.detail += `${(arg as functions.FunctionArgumentTemplate).Type} `;
    else
      item.detail += arg + " ";
  }

  let text = doc.template.summary ?? "";
  text += "\n\n" + doc.text;


  item.documentation = {
    kind: "markdown",
    value: text,
  };

  // item.documentation.kind = "plaintext";

  return item;
}
