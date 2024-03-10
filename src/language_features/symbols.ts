import { SymbolInformation, SymbolKind } from "vscode-languageserver";

import { ParsedString } from "../geckscript/hir/hir.js";
import * as hir from "../geckscript/hir/hir.js";

export function symbols(parsed: ParsedString): SymbolInformation[] | null {
    const symbols: SymbolInformation[] = [];

    const stack = [parsed.symbolTable];

    while (stack.length !== 0) {
        const top = stack.pop()!;
        for (const symbol of top.symbols.values()) {
            let kind: SymbolKind;
            switch (symbol.kind) {
                case hir.SymbolKind.Function:
                    kind = SymbolKind.Function;
                    break;
                case hir.SymbolKind.Script:
                    kind = SymbolKind.File;
                    break;
                case hir.SymbolKind.Variable:
                    kind = SymbolKind.Variable;
                    break;
                default:
                    continue;
            }
            symbols.push({
                name: symbol.name,
                location: { uri: parsed.doc.uri, range: parsed.rangeOf(symbol.decl.green) },
                kind: kind,
            });
        }

        stack.push(...top.children);
    }

    return symbols;
}
