import { SymbolInformation, SymbolKind } from "vscode-languageserver";

import { hir } from "../geckscript.js";

export function symbols(parsed: hir.ParsedString): SymbolInformation[] | null {
    const symbols: SymbolInformation[] = [];

    if (parsed.hir === undefined) {
        return null;
    }

    for (const child of hir.visit(parsed.hir)) {
        if ("symbolTable" in child) {
            for (const symbol of child.symbolTable.values()) {
                let kind: SymbolKind;
                switch (symbol.type.kind) {
                    case hir.ExprKind.Function:
                        kind = SymbolKind.Function;
                        break;
                    case hir.ExprKind.Script:
                        kind = SymbolKind.File;
                        break;
                    default:
                        kind = SymbolKind.Variable;
                        break;
                }
                symbols.push({
                    name: symbol.name,
                    location: {
                        uri: parsed.doc.uri,
                        range: parsed.rangeOf(symbol.decl.node.green),
                    },
                    kind,
                });
            }
        }
    }

    return symbols;
}
