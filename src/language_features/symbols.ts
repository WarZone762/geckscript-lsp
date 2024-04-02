import { SymbolInformation, SymbolKind } from "vscode-languageserver";

import { hir } from "../geckscript.js";

export function symbols(file: hir.File): SymbolInformation[] | null {
    const symbols: SymbolInformation[] = [];

    if (file.hir === undefined) {
        return null;
    }

    for (const child of hir.visit(file.hir)) {
        if ("symbolTable" in child) {
            for (const symbol of child.symbolTable.values()) {
                let kind: SymbolKind;
                switch (symbol.type.kind) {
                    case "Function":
                        kind = SymbolKind.Function;
                        break;
                    case "ScriptVar":
                        kind = SymbolKind.File;
                        break;
                    default:
                        kind = SymbolKind.Variable;
                        break;
                }
                symbols.push({
                    name: symbol.name,
                    location: {
                        uri: file.doc.uri,
                        range: file.rangeOf(symbol.def.node.green),
                    },
                    kind,
                });
            }
        }
    }

    return symbols;
}
