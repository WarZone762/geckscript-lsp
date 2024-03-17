#!/bin/env -S node --loader ts-node/esm

type InfoMap = { [key: string]: NodeInfo };

interface NodeInfo {
    syntaxKind: string;
    members: { [key: string]: string[] };
}

function funcs(info: NodeInfo): string {
    return `${Object.entries(info.members)
        .map((m) =>
            `
    ${m[0]}(): ${retType(m[1])} {
        return ${ret(m[1])};
    }
    `.trim()
        )
        .join("\n    ")}`;
}

function ret(info: string[]): string {
    switch (info[0]) {
        case "Token": {
            const predBody = info
                .slice(1)
                .map((d) => `k === SyntaxKind.${d}`)
                .join(" || ");
            const predTypeRet = info
                .slice(1)
                .map((d) => `SyntaxKind.${d}`)
                .join(" | ");

            return `token(this, (k => ${predBody}) as (k: SyntaxKind) => k is ${predTypeRet})`;
        }
        case "Type":
            return "token(this, isType)";
        case "Op":
            return "token(this, isOp)";
        case "VarOrVarDecl":
            return "VarOrVarDecl(child(this, isVarOrVarDecl))";
        case "Expr":
            if (info.at(1) !== undefined) {
                return `Expr(child(this, isExpr, ${info[1]}))`;
            } else {
                return "Expr(child(this, isExpr))";
            }
        case "Stmt":
            return "Stmt(child(this, isStmt))";
        default: {
            const syntaxKind =
                NODE_INFO_MAP[info[0]]?.syntaxKind ?? LIST_INFO_MAP[info[0]]?.syntaxKind;
            return `${info[0]}.fromGreen(child(this, (k => k === SyntaxKind.${syntaxKind}) as (k: SyntaxKind) => k is SyntaxKind.${syntaxKind}))`;
        }
    }
}

function retType(info: string[]): string {
    switch (info[0]) {
        case "Token": {
            const predTypeRet = info
                .slice(1)
                .map((d) => `SyntaxKind.${d}`)
                .join(" | ");

            return `Token<${predTypeRet}> | undefined`;
        }
        case "Type":
            return "Token<TypeSyntaxKind> | undefined";
        case "Op":
            return "Token<OpSyntaxKind> | undefined";
        case "VarOrVarDecl":
            return "VarOrVarDecl | undefined";
        case "Expr":
            return "Expr | undefined";
        case "Stmt":
            return "Stmt | undefined";
        default: {
            return `${info[0]} | undefined`;
        }
    }
}

const VAR_OR_VAR_DECL_INFO_MAP: InfoMap = {
    VarDecl: {
        syntaxKind: "VAR_DECL",
        members: {
            type: ["Type"],
            ident: ["Name"],
        },
    },
    Name: {
        syntaxKind: "NAME",
        members: {
            name: ["Token", "IDENT"],
        },
    },
    NameRef: {
        syntaxKind: "NAME_REF",
        members: {
            nameRef: ["Token", "IDENT"],
        },
    },
};

const EXPR_INFO_MAP: InfoMap = {
    UnaryExpr: {
        syntaxKind: "UNARY_EXPR",
        members: {
            op: ["Op"],
            operand: ["Expr"],
        },
    },
    BinExpr: {
        syntaxKind: "BIN_EXPR",
        members: {
            lhs: ["Expr"],
            op: ["Op"],
            rhs: ["Expr", "1"],
        },
    },
    MemberExpr: {
        syntaxKind: "MEMBER_EXPR",
        members: {
            lhs: ["Expr"],
            leftOp: ["Token", "LSQBRACK", "RARROW", "DOT"],
            rhs: ["Expr", "1"],
        },
    },
    FuncExpr: {
        syntaxKind: "FUNC_EXPR",
        members: {
            name: ["NameRef"],
            args: ["ExprList"],
        },
    },
    LetExpr: {
        syntaxKind: "LET_EXPR",
        members: {
            let: ["Token", "LET_KW"],
            var: ["VarOrVarDecl"],
            op: ["Op"],
            expr: ["Expr"],
        },
    },
    LambdaInlineExpr: {
        syntaxKind: "LAMBDA_INLINE_EXPR",
        members: {
            lbrack: ["Token", "LBRACK"],
            params: ["VarOrVarDeclList"],
            rbrack: ["Token", "RBRACK"],
            arrow: ["Token", "EQGT"],
            expr: ["Expr"],
        },
    },
    LambdaExpr: {
        syntaxKind: "LAMBDA_EXPR",
        members: {
            begin: ["Token", "BEGIN_KW"],
            funcKw: ["NameRef"],
            lbrack: ["Token", "LBRACK"],
            params: ["VarOrVarDeclList"],
            rbrack: ["Token", "RBRACK"],
            body: ["StmtList"],
            end: ["Token", "END_KW"],
        },
    },
    NameRef: {
        syntaxKind: "NAME_REF",
        members: {
            nameRef: ["Token", "IDENT"],
        },
    },
    Literal: {
        syntaxKind: "LITERAL",
        members: {
            literal: ["Token", "STRING", "NUMBER_INT"],
        },
    },
};

const STMT_INFO_MAP: InfoMap = {
    VarDeclStmt: {
        syntaxKind: "VAR_DECL_STMT",
        members: {
            var: ["VarDecl"],
            op: ["Op"],
            expr: ["Expr"],
        },
    },
    SetStmt: {
        syntaxKind: "SET_STMT",
        members: {
            set: ["Token", "SET_KW"],
            var: ["Expr"],
            expr: ["Expr", "1"],
        },
    },
    BeginStmt: {
        syntaxKind: "BEGIN_STMT",
        members: {
            begin: ["Token", "BEGIN_KW"],
            blocktype: ["BlocktypeDesig"],
            body: ["StmtList"],
            end: ["Token", "END_KW"],
        },
    },
    ForeachStmt: {
        syntaxKind: "FOREACH_STMT",
        members: {
            foreach: ["Token", "FOREACH_KW"],
            ident: ["NameRef"],
            larrow: ["Token", "LARROW"],
            iterable: ["Expr"],
            body: ["StmtList"],
            loop: ["Token", "LOOP_KW"],
        },
    },
    WhileStmt: {
        syntaxKind: "WHILE_STMT",
        members: {
            while: ["Token", "WHILE_KW"],
            cond: ["Expr"],
            body: ["StmtList"],
            loop: ["Token", "LOOP_KW"],
        },
    },
    IfStmt: {
        syntaxKind: "IF_STMT",
        members: {
            if: ["Token", "IF_KW"],
            cond: ["Expr"],
            trueBranch: ["StmtList"],
            falseBranch: ["Branch"],
            endif: ["Token", "ENDIF_KW"],
        },
    },
};
const LIST_INFO_MAP: InfoMap = {
    VarOrVarDeclList: { syntaxKind: "VAR_OR_VAR_DECL_LIST", members: {} },
    ExprList: { syntaxKind: "EXPR_LIST", members: {} },
    StmtList: { syntaxKind: "STMT_LIST", members: {} },
};

const NODE_INFO_MAP: InfoMap = {
    BlocktypeDesig: {
        syntaxKind: "BLOCKTYPE_DESIG",
        members: {
            blocktype: ["Token", "IDENT"],
            args: ["ExprList"],
        },
    },
    Branch: {
        syntaxKind: "BRANCH",
        members: {
            elseif: ["Token", "ELSEIF_KW", "ELSE_KW"],
            cond: ["Expr"],
            trueBranch: ["StmtList"],
            falseBranch: ["Branch"],
        },
    },
    Script: {
        syntaxKind: "SCRIPT",
        members: {
            scriptname: ["Token", "SCRIPTNAME_KW"],
            name: ["Name"],
            body: ["StmtList"],
        },
    },
};

Object.assign(NODE_INFO_MAP, VAR_OR_VAR_DECL_INFO_MAP);
Object.assign(NODE_INFO_MAP, EXPR_INFO_MAP);
Object.assign(NODE_INFO_MAP, STMT_INFO_MAP);

function listType(name: string, syntaxKind: string, predicate: string): string {
    return `
export class ${name}List extends AstNode<SyntaxKind.${syntaxKind}_LIST> {
    *iter() {
        for (const child of children(this, ${predicate})) {
            yield ${name}(child);
        }
    }
}
`.trim();
}

function enumType(name: string, infoMap: InfoMap): string {
    return `
export type ${name} =
    | ${Object.keys(infoMap).join("\n    | ")}
    ;

export function ${name}(green: Node<${name}SyntaxKind> | undefined): ${name} | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        ${Object.entries(infoMap)
            .map((n) =>
                `
        case SyntaxKind.${n[1].syntaxKind}:
            return new ${n[0]}(green as Node<SyntaxKind.${n[1].syntaxKind}>);
        `.trim()
            )
            .join("\n        ")}
    }
}
`.trim();
}

function generate(): string {
    return `
import {
    ExprSyntaxKind,
    NodeSyntaxKind,
    OpSyntaxKind,
    StmtSyntaxKind,
    SyntaxKind,
    TokenSyntaxKind,
    TypeSyntaxKind,
    VarOrVarDeclSyntaxKind,
    isExpr,
    isOp,
    isStmt,
    isType,
    isVarOrVarDecl,
} from "../syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../types/syntax_node.js";

export class AstNode<T extends NodeSyntaxKind = NodeSyntaxKind> {
    green: Node<T>;
    constructor(green: Node<T>) {
        this.green = green;
    }

    static fromGreen<C, T extends NodeSyntaxKind>(this: { new(green: Node<T>): C; }, green: Node<T> | undefined): C | undefined {
        if (green != undefined) {
            return new this(green);
        }
    }
}

function token<T extends TokenSyntaxKind>(node: AstNode, predicate: (kind: SyntaxKind) => kind is T, idx = 0): Token<T> | undefined {
    for (const child of node.green.children) {
        if (predicate(child.kind)) {
            if (idx > 0) {
                --idx;
            } else {
                return child as Token<T>;
            }
        }
    }
}

function child<T extends NodeSyntaxKind>(node: AstNode, predicate: (kind: SyntaxKind) => kind is T, idx = 0): Node<T> | undefined {
    for (const child of node.green.children) {
        if (predicate(child.kind)) {
            if (idx > 0) {
                --idx;
            } else {
                return child as Node<T>;
            }
        }
    }
}

function* children<T extends SyntaxKind>(node: AstNode, predicate: (kind: SyntaxKind) => kind is T): Generator<NodeOrToken<T>, void, undefined> {
    for (const child of node.green.children) {
        if (predicate(child.kind)) {
            yield child as NodeOrToken<T>;
        }
    }
}

export type Type = Token<TypeSyntaxKind>;
export type Op = Token<OpSyntaxKind>;

${enumType("VarOrVarDecl", VAR_OR_VAR_DECL_INFO_MAP)}
${enumType("Expr", EXPR_INFO_MAP)}
${enumType("Stmt", STMT_INFO_MAP)}

${listType("VarOrVarDecl", "VAR_OR_VAR_DECL", "isVarOrVarDecl")}
${listType("Expr", "EXPR", "isExpr")}
${listType("Stmt", "STMT", "isStmt")}

${Object.entries(NODE_INFO_MAP)
    .map((n) =>
        `
export class ${n[0]} extends AstNode<SyntaxKind.${n[1].syntaxKind}> {
    ${funcs(n[1])}
}
`.trim()
    )
    .join("\n\n")}
`.trim();
}

console.log(generate());
