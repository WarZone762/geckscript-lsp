import { ancestors, find_ancestor } from "../ast";
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
import { Node, NodeOrToken } from "../types/syntax_node";

export function find_references(node: Name): NameRef[] {
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

export function find_definitions(node: NameRef): Name[] {
    const defs: Name[] = [];
    if (node.green.parent == undefined || node.name_ref() == undefined) {
        return defs;
    }

    for (const a of ancestors(node.green.parent)) {
        for (const def of find_scope_definitions(a)) {
            if (def.name()?.text === node.name_ref()!.text) {
                defs.push(def);
            }
        }
    }

    return defs;
}

export function* find_scope_definitions(node: NodeOrToken) {
    switch (node.kind) {
        case SyntaxKind.STMT_LIST:
            yield* find_stmt_list_definitions(node);
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

export function* find_stmt_list_definitions(node: Node) {
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
