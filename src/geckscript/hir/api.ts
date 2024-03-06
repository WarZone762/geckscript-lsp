import { ancestors, findAncestor } from "../ast.js";
import {
    LambdaExpr,
    LambdaInlineExpr,
    LetStmt,
    Name,
    NameRef,
    Script,
    VarDecl,
    VarDeclStmt,
} from "../ast/generated.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../types/syntax_node.js";

export function findDefFromToken(token: Token): Name | undefined {
    if (token.kind !== SyntaxKind.IDENT) {
        return undefined;
    }

    const parent = token.parent;
    if (parent == undefined) {
        return undefined;
    }

    if (parent.kind === SyntaxKind.NAME) {
        return new Name(parent);
    } else if (parent.kind === SyntaxKind.NAME_REF) {
        return findDef(new NameRef(parent));
    }
}

export function findDef(node: NameRef): Name | undefined {
    if (node.green.parent == undefined || node.nameRef() == undefined) {
        return undefined;
    }

    for (const a of ancestors(node.green.parent)) {
        for (const def of findScopeDefs(a)) {
            if (def.name()?.text === node.nameRef()!.text) {
                return def;
            }
        }
    }
}

export function findRefs(node: Name): NameRef[] {
    const refs: NameRef[] = [];

    const text = node.name()?.text;
    if (text == undefined) {
        return refs;
    }
    const stmtList = findAncestor(node.green, (n) => n.kind === SyntaxKind.STMT_LIST);
    if (stmtList == undefined) {
        return refs;
    }

    findReferencesRecursive(stmtList as Node);

    return refs;

    function findReferencesRecursive(node: Node) {
        for (const c of node.children) {
            if (c.kind === SyntaxKind.NAME_REF) {
                const ref = new NameRef(c);
                if (ref.nameRef()?.text === text) {
                    refs.push(ref);
                }
            } else if (c.isNode()) {
                findReferencesRecursive(c);
            }
        }
    }
}

export function* findScopeDefs(node: NodeOrToken) {
    switch (node.kind) {
        case SyntaxKind.STMT_LIST:
            yield* findStmtListDefs(node);
            break;
        case SyntaxKind.SCRIPT: {
            const name = new Script(node).name();
            if (name != undefined) {
                yield name;
            }
            break;
        }
        case SyntaxKind.LAMBDA_EXPR: {
            const varOrVarDeclList = new LambdaExpr(node).params();
            if (varOrVarDeclList != undefined) {
                for (const varOrVarDecl of varOrVarDeclList.iter()) {
                    if (varOrVarDecl instanceof VarDecl) {
                        const def = varOrVarDecl.ident();
                        if (def != undefined) {
                            yield def;
                        }
                    }
                }
            }
            break;
        }
        case SyntaxKind.LAMBDA_INLINE_EXPR: {
            const varOrVarDeclList = new LambdaInlineExpr(node).params();
            if (varOrVarDeclList != undefined) {
                for (const varOrVarDecl of varOrVarDeclList.iter()) {
                    if (varOrVarDecl instanceof VarDecl) {
                        const def = varOrVarDecl.ident();
                        if (def != undefined) {
                            yield def;
                        }
                    }
                }
            }
            break;
        }
        default:
            return;
        // TODO: add other nodes that create a scope
    }
}

function* findStmtListDefs(node: Node) {
    for (const c of node.children) {
        switch (c.kind) {
            case SyntaxKind.VAR_DECL_STMT: {
                const def = new VarDeclStmt(c).var()?.ident();
                if (def != undefined) {
                    yield def;
                }
                break;
            }
            case SyntaxKind.LET_STMT: {
                const varOrVarDecl = new LetStmt(c).var();
                if (varOrVarDecl instanceof Name) {
                    yield varOrVarDecl;
                } else if (varOrVarDecl instanceof VarDecl) {
                    const def = varOrVarDecl.ident();
                    if (def != undefined) {
                        yield def;
                    }
                }
                break;
            }
        }
    }
}
