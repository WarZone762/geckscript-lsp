import * as ast from "../geckscript/ast.js";
import { FuncExpr } from "../geckscript/ast/generated.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind } from "../geckscript/syntax_kind/generated.js";
import { Node } from "../geckscript/types/syntax_node.js";
import {
    SemanticTokens,
    SemanticTokensBuilder,
    SemanticTokensLegend,
} from "vscode-languageserver/node.js";

export const LEGEND: SemanticTokensLegend = {
    tokenTypes: ["variable", "function"],
    tokenModifiers: ["readonly"],
};

export function buildSemanticTokens(parsed: ParsedString): SemanticTokens {
    const builder = new SemanticTokensBuilder();

    for (const func of [...ast.descendantsDf(parsed.root.green)].filter(
        (n) => n.kind === SyntaxKind.FUNC_EXPR
    )) {
        const node = new FuncExpr(func as Node<SyntaxKind.FUNC_EXPR>);
        const name = node.name();
        if (name != undefined) {
            const pos = parsed.posAt(name.green.offset);
            builder.push(pos.line, pos.character, name.green.len(), 1, 0);
        }
    }

    return builder.build();
}
