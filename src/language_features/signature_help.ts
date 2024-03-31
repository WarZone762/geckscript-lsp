import { ParameterInformation, SignatureHelp } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { NodeOrToken, SyntaxKind, ast, hir } from "../geckscript.js";

export function signatureHelp(
    db: hir.FileDatabase,
    file: hir.File,
    pos: Position
): SignatureHelp | undefined {
    let token: NodeOrToken | undefined = ast.nearestToken(file.root.green, file.offsetAt(pos));
    if (token === undefined) {
        return;
    }
    let activeParameter = 0;
    if (
        token.kind === SyntaxKind.WHITESPACE ||
        token.kind === SyntaxKind.NEWLINE ||
        token.kind === SyntaxKind.COMMA
    ) {
        activeParameter = 1;
    }
    token = ast.nearestTokenPredicate(
        file.root.green,
        file.offsetAt(pos),
        (t) =>
            t.kind !== SyntaxKind.WHITESPACE &&
            t.kind !== SyntaxKind.NEWLINE &&
            t.kind !== SyntaxKind.COMMA
    )?.parent;
    if (token === undefined) {
        return;
    }

    const hirNode = hir.syntaxToHir(db, token);
    if (hirNode === undefined) {
        return;
    }
    for (const ancestor of hir.ancestors(db, hirNode)) {
        if (
            !(ancestor instanceof hir.FuncExpr) ||
            !(ancestor.func.type instanceof hir.ExprTypeFunction)
        ) {
            continue;
        }

        if (activeParameter === 0) {
            for (const child of hir.visit(ancestor.func)) {
                if (child === hirNode) {
                    return;
                }
            }
        }

        outer: for (const param of ancestor.args) {
            for (const child of hir.visit(param)) {
                if (child === hirNode) {
                    break outer;
                }
            }
            ++activeParameter;
        }
        if (activeParameter === ancestor.args.length + 1) {
            activeParameter = 0;
        }

        const name = ancestor.func.type.name ?? "[unnamed]";

        const parameters: ParameterInformation[] = [];
        // 2 for parens + 2 spaces
        let lastParamIndex = ancestor.func.type.ret.toString().length + 2 + name.length + 2;
        for (const param of ancestor.func.type.args) {
            const str = param.toString();
            parameters.push({ label: [lastParamIndex, lastParamIndex + str.length] });
            lastParamIndex += str.length + 1;
        }
        return {
            signatures: [
                {
                    label: ancestor.func.type.toStringWithName(name),
                    parameters,
                    activeParameter,
                },
            ],
        };
    }
}
