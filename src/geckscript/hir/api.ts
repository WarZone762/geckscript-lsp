import { ancestors, forEachChildRecursive } from "../ast.js";
import { LambdaExpr, LambdaInlineExpr, NameRef, Script, StmtList } from "../ast/generated.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { NodeOrToken, Token } from "../types/syntax_node.js";
import { FileDatabase, ScopeNode, SymbolTable, Symbol } from "./hir.js";

export function findDefinitionFromToken(token: Token, db: FileDatabase): Symbol | undefined {
    if (token.kind !== SyntaxKind.IDENT) {
        return;
    }

    const parent = token.parent;
    if (parent?.kind === SyntaxKind.NAME_REF) {
        return findDefinition(new NameRef(parent), db);
    } else if (parent?.kind === SyntaxKind.NAME) {
        const symbolTable = nodeSymbolTable(parent, db);
        if (symbolTable === undefined) {
            return;
        }

        return symbolTable.symbols.get(token.text);
    }
}

export function findReferences(symbol: Symbol): NameRef[] {
    const refs: NameRef[] = [];
    forEachChildRecursive(symbol.parent.node.green, (n) => {
        if (n.kind === SyntaxKind.NAME_REF) {
            const nameRef = new NameRef(n);
            if (nameRef.nameRef()?.text === symbol.name) {
                refs.push(nameRef);
            }
        }
    });

    return refs;
}

export function findDefinition(node: NameRef, db: FileDatabase): Symbol | undefined {
    const name = node.nameRef()?.text;
    if (name === undefined) {
        return;
    }

    const symbol = (() => {
        let st = nodeSymbolTable(node.green, db);
        if (st === undefined) {
            return;
        }

        while (st !== undefined) {
            console.error("st while");
            const symbol = st.symbols.get(name);
            if (symbol !== undefined) {
                return symbol;
            }
            st = st.parent;
        }
    })();
    if (symbol !== undefined) {
        return symbol;
    }

    return db.scripts.get(name)?.symbols.get(name);
}

export function nodeSymbolTable(node: NodeOrToken, db: FileDatabase): SymbolTable | undefined {
    const scope = findContainingScope(node);
    if (scope === undefined) {
        return;
    }

    return scopeSymbolTable(scope, db);
}

export function scopeSymbolTable(scope: ScopeNode, db: FileDatabase): SymbolTable | undefined {
    if (scope.green.parent === undefined) {
        if (!(scope instanceof Script)) {
            return;
        }
        const scriptName = scope.name()?.name()?.text;
        if (scriptName === undefined) {
            return;
        }

        return db.scripts.get(scriptName);
    }

    const parentScope = findContainingScope(scope.green.parent);
    if (parentScope === undefined) {
        return;
    }

    const parentSymbolTable = scopeSymbolTable(parentScope, db);
    if (parentSymbolTable === undefined) {
        return;
    }

    for (const child of parentSymbolTable.children) {
        // TODO: proper equality
        if (child.node.green === scope.green) {
            return child;
        }
    }
}

export function findContainingScope(node: NodeOrToken): ScopeNode | undefined {
    for (const a of ancestors(node)) {
        if (a.kind === SyntaxKind.STMT_LIST) {
            return new StmtList(a);
        } else if (a.kind === SyntaxKind.SCRIPT) {
            return new Script(a);
        } else if (a.kind === SyntaxKind.LAMBDA_EXPR) {
            return new LambdaExpr(a);
        } else if (a.kind === SyntaxKind.LAMBDA_INLINE_EXPR) {
            return new LambdaInlineExpr(a);
        }
    }
}
