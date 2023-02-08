import { ancestors, find_ancestor } from "../ast";
import * as ast from "../ast";
import {
    LambdaExpr,
    LambdaInlineExpr,
    LetStmt,
    Name,
    NameRef,
    Script,
    VarDecl,
    VarDeclStmt,
} from "../ast/generated";
import { SyntaxKind } from "../syntax_kind/generated";
import { Node, NodeOrToken, Token } from "../types/syntax_node";

export function find_def_from_token(token: Token): Name | undefined {
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
        return find_def(new NameRef(parent));
    }
}

export function find_def(node: NameRef): Name | undefined {
    if (node.green.parent == undefined || node.name_ref() == undefined) {
        return undefined;
    }

    for (const a of ancestors(node.green.parent)) {
        for (const def of find_scope_defs(a)) {
            if (def.name()?.text === node.name_ref()!.text) {
                return def;
            }
        }
    }
}

export function find_refs(node: Name): NameRef[] {
    const refs: NameRef[] = [];

    const text = node.name()?.text;
    if (text == undefined) {
        return refs;
    }
    const stmt_list = find_ancestor(node.green, (n) => n.kind === SyntaxKind.STMT_LIST);
    if (stmt_list == undefined) {
        return refs;
    }

    find_references_recursive(stmt_list as Node);

    return refs;

    function find_references_recursive(node: Node) {
        for (const c of node.children) {
            if (c.kind === SyntaxKind.NAME_REF) {
                const ref = new NameRef(c);
                if (ref.name_ref()?.text === text) {
                    refs.push(ref);
                }
            } else if (c.is_node()) {
                find_references_recursive(c);
            }
        }
    }
}

function* find_scope_defs(node: NodeOrToken) {
    switch (node.kind) {
        case SyntaxKind.STMT_LIST:
            yield* find_stmt_list_defs(node);
            break;
        case SyntaxKind.SCRIPT: {
            const name = new Script(node).name();
            if (name != undefined) {
                yield name;
            }
            break;
        }
        case SyntaxKind.LAMBDA_EXPR: {
            const var_or_var_decl_list = new LambdaExpr(node).params();
            if (var_or_var_decl_list != undefined) {
                for (const var_or_var_decl of var_or_var_decl_list.iter()) {
                    if (var_or_var_decl instanceof VarDecl) {
                        const def = var_or_var_decl.ident();
                        if (def != undefined) {
                            yield def;
                        }
                    }
                }
            }
            break;
        }
        case SyntaxKind.LAMBDA_INLINE_EXPR: {
            const var_or_var_decl_list = new LambdaInlineExpr(node).params();
            if (var_or_var_decl_list != undefined) {
                for (const var_or_var_decl of var_or_var_decl_list.iter()) {
                    if (var_or_var_decl instanceof VarDecl) {
                        const def = var_or_var_decl.ident();
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
    }
}

function* find_stmt_list_defs(node: Node) {
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
                const var_or_var_decl = new LetStmt(c).var();
                if (var_or_var_decl instanceof Name) {
                    yield var_or_var_decl;
                } else if (var_or_var_decl instanceof VarDecl) {
                    const def = var_or_var_decl.ident();
                    if (def != undefined) {
                        yield def;
                    }
                }
                break;
            }
        }
    }
}
