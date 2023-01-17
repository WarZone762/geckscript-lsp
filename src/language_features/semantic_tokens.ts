import * as ast from "../geckscript/ast";
import { FuncExpr } from "../geckscript/ast/generated";
import { ParsedString } from "../geckscript/hir";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import { Node } from "../geckscript/types/syntax_node";
import {
    SemanticTokens,
    SemanticTokensBuilder,
    SemanticTokensLegend,
} from "vscode-languageserver/node";

export const legend: SemanticTokensLegend = {
    tokenTypes: ["variable", "function"],
    tokenModifiers: ["readonly"],
};

export function build_semantic_tokens(parsed: ParsedString): SemanticTokens {
    const builder = new SemanticTokensBuilder();

    for (const func of [...ast.descendants_df(parsed.root)].filter(
        (n) => n.kind === SyntaxKind.FUNC_EXPR
    )) {
        const node = new FuncExpr(func as Node<SyntaxKind.FUNC_EXPR>);
        const name = node.name();
        if (name != undefined) {
            const pos = parsed.pos_at(name.green.offset);
            builder.push(pos.line, pos.character, name.green.len(), 1, 0);
        }
    }

    return builder.build();
}
