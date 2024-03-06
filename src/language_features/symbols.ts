import { findScopeDefs } from "../geckscript/hir/api.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind } from "../geckscript/syntax_kind/generated.js";
import { Node } from "../geckscript/types/syntax_node.js";
import { SymbolInformation, SymbolKind } from "vscode-languageserver";

export function symbols(parsed: ParsedString): SymbolInformation[] {
    const syms: SymbolInformation[] = [];

    symbolsRecursive(parsed.root.green);

    return syms;

    function symbolsRecursive(node: Node) {
        for (const sym of findScopeDefs(node)) {
            let kind: SymbolKind;
            if (sym.green.parent?.kind === SyntaxKind.SCRIPT) {
                kind = SymbolKind.Function;
            } else {
                kind = SymbolKind.Variable;
            }

            syms.push({
                name: sym.name()!.text,
                location: { uri: parsed.doc.uri, range: parsed.rangeOf(sym.green) },
                kind: kind,
            });
        }

        for (const child of node.children) {
            if (!child.isNode()) {
                continue;
            }

            symbolsRecursive(child);
        }
    }
}
