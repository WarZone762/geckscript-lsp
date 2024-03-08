import { FileDatabase, ParsedString } from "../geckscript/hir/hir.js";
import { SymbolInformation, SymbolKind } from "vscode-languageserver";
import * as hir from "../geckscript/hir/hir.js";

export function symbols(db: FileDatabase, parsed: ParsedString): SymbolInformation[] | null {
    const symbols: SymbolInformation[] = [];

    const scriptName = parsed.root.name()?.name()?.text;
    if (scriptName === undefined) {
        return null;
    }

    const symbolTable = db.scripts.get(scriptName);
    if (symbolTable === undefined) {
        return null;
    }

    const stack = [symbolTable];

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
