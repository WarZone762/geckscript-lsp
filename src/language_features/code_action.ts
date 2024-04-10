import { CodeAction, Command } from "vscode-languageserver";
import { Range } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";
import { GlobalFunction } from "../geckscript/function_data.js";

export function codeAction(
    db: hir.FileDatabase,
    file: hir.File,
    range: Range
): (Command | CodeAction)[] {
    const actions = new hir.SymbolTable();
    const tokens = ast.tokensInRange(
        file.root.green,
        file.offsetAt(range.start),
        file.offsetAt(range.end)
    );

    for (const token of tokens) {
        if (token.parent === undefined) {
            continue;
        }
        const hirNode = hir.syntaxToHir(db, token.parent);
        if (hirNode === undefined) {
            continue;
        }

        if ("symbol" in hirNode && hirNode.symbol instanceof GlobalFunction) {
            actions.set(hirNode.symbol.name, {
                title: `Open '${hirNode.symbol.name}' on GECKWiki`,
                command: { title: "Open", command: "open", arguments: [hirNode.symbol.name] },
            });
        }
    }

    return [...actions.values()];
}
