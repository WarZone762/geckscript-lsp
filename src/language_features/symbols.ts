import { SymbolInformation, SymbolKind } from "vscode-languageserver";

import { ExprKind, ParsedString, visit } from "../geckscript/hir.js";

export function symbols(parsed: ParsedString): SymbolInformation[] | null {
    const symbols: SymbolInformation[] = [];

    if (parsed.hir === undefined) {
        return null;
    }

    for (const child of visit(parsed.hir)) {
        if ("symbolTable" in child) {
            for (const symbol of child.symbolTable.values()) {
                let kind: SymbolKind;
                switch (symbol.type.kind) {
                    case ExprKind.Function:
                        kind = SymbolKind.Function;
                        break;
                    case ExprKind.Script:
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
