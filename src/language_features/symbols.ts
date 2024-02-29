import { find_scope_defs } from "../geckscript/hir/api.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind } from "../geckscript/syntax_kind/generated.js";
import { Node } from "../geckscript/types/syntax_node.js";
import { SymbolInformation, SymbolKind } from "vscode-languageserver";

export function symbols(parsed: ParsedString): SymbolInformation[] {
    const syms: SymbolInformation[] = [];

    symbols_recursive(parsed.root.green);

    return syms;

    function symbols_recursive(node: Node) {
        for (const sym of find_scope_defs(node)) {
            let kind: SymbolKind;
            if (sym.green.parent?.kind === SyntaxKind.SCRIPT) {
                kind = SymbolKind.Function;
            } else {
                kind = SymbolKind.Variable;
            }

            syms.push({
                name: sym.name()!.text,
                location: { uri: parsed.doc.uri, range: parsed.range_of(sym.green) },
                kind: kind,
            });
        }

        for (const child of node.children) {
            if (!child.is_node()) {
                continue;
            }

            symbols_recursive(child);
        }
    }
}
