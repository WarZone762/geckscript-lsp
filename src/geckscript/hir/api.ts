import * as ast from "../ast.js";
import { LambdaExpr, LambdaInlineExpr, NameRef, Script, StmtList } from "../ast/generated.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { NodeOrToken, Token } from "../types/syntax_node.js";
import { FileDatabase, ScopeNode, Symbol, SymbolTable } from "./hir.js";

/** Get all symbols that are visible from `node` */
export function visibleSymbols(node: NodeOrToken, db: FileDatabase): Symbol[] {
    const symbols: Symbol[] = [];

    let symbolTable = nodeSymbolTable(node, db);
    if (symbolTable === undefined) {
        return symbols;
    }

    while (symbolTable !== undefined) {
        for (const symbol of symbolTable.symbols.values()) {
            symbols.push(symbol);
        }
        symbolTable = symbolTable.parent;
    }

    return symbols;
}

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

export function findReferences(symbol: Symbol, db: FileDatabase): NameRef[] {
    const refs: NameRef[] = [];

    if (symbol.parent.parent?.node instanceof Script) {
        for (const script of db.files.values()) {
            ast.forEachChildRecursive(script.root.green, (n) => {
                if (n.kind === SyntaxKind.NAME_REF) {
                    const nameRef = new NameRef(n);
                    if (nameRef.nameRef()?.text === symbol.name) {
                        refs.push(nameRef);
                    }
                }
            });
        }
    } else {
        ast.forEachChildRecursive(symbol.parent.node.green, (n) => {
            if (n.kind === SyntaxKind.NAME_REF) {
                const nameRef = new NameRef(n);
                if (nameRef.nameRef()?.text === symbol.name) {
                    refs.push(nameRef);
                }
            }
        });
    }

    return refs;
}

export function findDefinition(node: NameRef, db: FileDatabase): Symbol | undefined {
    const name = node.nameRef()?.text;
    if (name === undefined) {
        return;
    }

    // search the symbol in the current file
    const symbol = (() => {
        let st = nodeSymbolTable(node.green, db);
        if (st === undefined) {
            return;
        }

        while (st !== undefined) {
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

    if (node.green.parent?.kind === SyntaxKind.MEMBER_EXPR) {
        for (const script of db.files.values()) {
            const symbol = script.symbolTable.children.at(-1)?.symbols.get(name);
            if (symbol !== undefined) {
                return symbol;
            }
        }
    }
}

/** Get the nearest symbol table that contains `node` */
export function nodeSymbolTable(node: NodeOrToken, db: FileDatabase): SymbolTable | undefined {
    const scope = findContainingScope(node);
    if (scope === undefined) {
        return;
    }

    return scopeSymbolTable(scope, db);
}

/** Get the symbol table corresponding to `scope` */
export function scopeSymbolTable(scope: ScopeNode, db: FileDatabase): SymbolTable | undefined {
    if (scope.green.parent === undefined) {
        if (!(scope instanceof Script)) {
            return;
        }

        return db.findScript(scope.green)?.symbolTable;
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

/** Get the nearest scope node that contains `node` */
export function findContainingScope(node: NodeOrToken): ScopeNode | undefined {
    for (const a of ast.ancestors(node)) {
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
