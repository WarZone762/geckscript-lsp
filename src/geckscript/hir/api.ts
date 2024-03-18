import { DiagnosticSeverity } from "vscode-languageserver";

import { FileDatabase, ParsedString } from "../hir.js";
import { NodeOrToken, SyntaxKind, Token } from "../syntax.js";
import {
    BeginStmt,
    BinExpr,
    Blocktype,
    Expr,
    ExprKind,
    ExprType,
    ExprTypeFunction,
    ExprTypeSimple,
    ForeachStmt,
    FuncExpr,
    GlobalSymbol,
    HirNode,
    IfStmt,
    LambdaExpr,
    LambdaInlineExpr,
    LetExpr,
    Literal,
    MemberExpr,
    Name,
    NameRef,
    Script,
    SetStmt,
    StmtList,
    Symbol,
    UnaryExpr,
    VarDeclStmt,
    VarOrVarDeclList,
    WhileStmt,
} from "./hir.js";

export class Analyzer {
    constructor(
        public db: FileDatabase,
        public parsed: ParsedString
    ) {}

    analyze(node: HirNode) {
        for (const child of visitPost(node)) {
            if (child instanceof Script) {
                continue;
            } else if (child instanceof StmtList) {
                continue;
            } else if (child instanceof SetStmt) {
                continue;
            } else if (child instanceof IfStmt) {
                continue;
            } else if (child instanceof WhileStmt) {
                continue;
            } else if (child instanceof BeginStmt) {
                continue;
            } else if (child instanceof ForeachStmt) {
                continue;
            } else if (child instanceof VarDeclStmt) {
                continue;
            } else if (
                child instanceof UnaryExpr ||
                child instanceof BinExpr ||
                child instanceof MemberExpr ||
                child instanceof FuncExpr ||
                child instanceof LetExpr ||
                child instanceof LambdaInlineExpr ||
                child instanceof LambdaExpr
            ) {
                child.type = this.analyzeExpr(child);
            } else if (child instanceof Literal) {
                continue;
            } else if (child instanceof VarOrVarDeclList) {
                continue;
            } else if (child instanceof Name) {
                continue;
            } else if (child instanceof NameRef) {
                continue;
            } else if (child instanceof Blocktype) {
                continue;
            } else if (child instanceof String) {
                continue;
            } else if (child instanceof Number) {
                continue;
            }
        }
    }

    analyzeExpr(node: Expr): ExprType {
        if (node instanceof UnaryExpr) {
            node.type = this.analyzeExpr(node.operand);
            return node.type;
        } else if (node instanceof BinExpr) {
            const lhs = this.analyzeExpr(node.lhs);
            const rhs = this.analyzeExpr(node.rhs);
            // TODO: proper equality
            if (lhs.kind === rhs.kind) {
                node.type = lhs;
            } else {
                this.parsed.diagnostics.push({
                    range: this.parsed.rangeOf(node.node.green),
                    message: `ambiguous expression type: ${lhs} ${node.node.op()?.text} ${rhs}`,
                    severity: DiagnosticSeverity.Warning,
                });
                node.type = new ExprTypeSimple(ExprKind.Ambiguous);
            }
            return node.type;
        } else if (node instanceof MemberExpr) {
            // TODO
        } else if (node instanceof FuncExpr) {
            const func = this.analyzeExpr(node.func);
            if (func instanceof ExprTypeFunction) {
                node.type = func.signature.ret;
            } else {
                // TODO: emit error
                node.type = func;
            }
            return node.type;
        } else if (node instanceof LetExpr) {
            node.type = this.analyzeExpr(node.expr);
            return node.type;
        } else if (node instanceof LambdaInlineExpr) {
            // TODO
        } else if (node instanceof LambdaExpr) {
            // TODO
        } else if (node instanceof Literal) {
            return node.type;
        } else if (node instanceof NameRef) {
            const symbol = findDefinition(this.db, node);
            if (symbol !== undefined) {
                node.symbol = symbol;
            } else {
                this.parsed.diagnostics.push({
                    range: this.parsed.rangeOf(node.node.green),
                    message: `unable to resolve symbol ${node.symbol.name}`,
                    severity: DiagnosticSeverity.Warning,
                });

                const globalSymbol = new GlobalSymbol(
                    node.symbol.name,
                    new ExprTypeSimple(ExprKind.Unknown)
                );
                globalSymbol.referencingFiles.add(this.parsed.doc.uri);

                this.db.globalSymbols.set(node.symbol.name, globalSymbol);
            }
            return node.symbol.type;
        }
        return new ExprTypeSimple(ExprKind.Unknown);
    }
}

export function syntaxToHir<T extends NodeOrToken, H extends HirNode & { node: { green: T } | T }>(
    db: FileDatabase,
    node: T
): H | undefined {
    if (node.parent === undefined) {
        for (const file of db.files.values()) {
            if (file.hir?.node.green === node) {
                return file.hir as H;
            }
        }
    } else {
        let parent = syntaxToHir(db, node.parent);
        if (parent === undefined) {
            // TODO: hack because ast and hir tree structure is not 1-to-1
            if (node.parent.parent !== undefined) {
                parent = syntaxToHir(db, node.parent.parent);
                if (parent === undefined) {
                    return;
                }
            } else {
                return;
            }
        }
        for (const child of children(parent)) {
            if (child.node === node || ("green" in child.node && child.node.green === node)) {
                return child as H;
            }
        }
    }
}

/** Get all symbols that are visible from `node` */
export function visibleSymbols(db: FileDatabase, node: NodeOrToken): Symbol[] {
    let hirNode;
    if (!node.isNode() && node.parent !== undefined) {
        hirNode = syntaxToHir(db, node.parent);
    } else {
        hirNode = syntaxToHir(db, node);
    }
    if (hirNode === undefined) {
        return [];
    }

    const symbols: Symbol[] = [];

    for (const parent of ancestors(db, hirNode)) {
        if ("symbolTable" in parent) {
            symbols.push(...parent.symbolTable.values());
        }
    }

    return symbols;
}

export function findReferences(db: FileDatabase, symbol: Symbol | GlobalSymbol): NameRef[] {
    const refs: NameRef[] = [];

    if (symbol instanceof Symbol) {
        const scope = findNameScope(db, symbol.decl);
        if (scope === undefined) {
            return refs;
        }
        for (const child of visit(scope)) {
            if (child instanceof NameRef && child.symbol instanceof Symbol) {
                // console.error(child.symbol);
                // console.error(symbol);
                // console.error(child.symbol === symbol);
                // console.error();
            }
            if (child instanceof NameRef && child.symbol === symbol) {
                refs.push(child);
            }
        }
    } else if (symbol instanceof GlobalSymbol) {
        for (const file of db.files.values()) {
            if (file.hir === undefined) {
                continue;
            }
            for (const child of visit(file.hir)) {
                if (child instanceof NameRef && child.symbol === symbol) {
                    refs.push(child);
                }
            }
        }
    }

    return refs;
}

export function findDefinitionFromToken(
    token: Token,
    db: FileDatabase
): Symbol | GlobalSymbol | undefined {
    if (token.kind !== SyntaxKind.IDENT) {
        return;
    }

    if (token.parent === undefined) {
        return;
    }

    const hir = syntaxToHir(db, token.parent);
    if (hir instanceof NameRef || hir instanceof Name) {
        return hir.symbol;
    }
}

export function findDefinition(
    db: FileDatabase,
    nameRef: NameRef
): Symbol | GlobalSymbol | undefined {
    for (const parent of ancestors(db, nameRef)) {
        if ("symbolTable" in parent) {
            const symbol = parent.symbolTable.get(nameRef.symbol.name);
            if (symbol === undefined) {
                continue;
            }

            return symbol;
        }
    }

    return db.globalSymbols.get(nameRef.symbol.name);
}

export function findNameScope(db: FileDatabase, name: Name): HirNode | undefined {
    for (const parent of ancestors(db, name)) {
        if ("symbolTable" in parent && parent.symbolTable.get(name.symbol.name) !== undefined) {
            return parent;
        }
    }
}

export function* visit(node: HirNode): Generator<HirNode> {
    yield node;
    for (const child of children(node)) {
        yield* visit(child);
    }
}

export function* visitPost(node: HirNode): Generator<HirNode> {
    for (const child of children(node)) {
        yield* visitPost(child);
    }
    yield node;
}

export function* children(node: HirNode): Generator<HirNode, void, undefined> {
    if (node instanceof Script) {
        yield node.stmtList;
    } else if (node instanceof StmtList) {
        yield* node.stmts;
    } else if (node instanceof IfStmt) {
        yield node.cond;
        yield node.trueBranch;
        if (node.falseBranch !== undefined) {
            yield node.falseBranch;
        }
    } else if (node instanceof WhileStmt) {
        yield node.cond;
        yield node.stmtList;
    } else if (node instanceof BeginStmt) {
        yield node.blocktype;
        yield node.stmtList;
    } else if (node instanceof ForeachStmt) {
        yield node.nameRef;
        yield node.iter;
        yield node.stmtList;
    } else if (node instanceof SetStmt) {
        yield node.var_;
        yield node.value;
    } else if (node instanceof VarDeclStmt) {
        yield node.name;
        if (node.value !== undefined) {
            yield node.value;
        }
    } else if (node instanceof UnaryExpr) {
        yield node.operand;
    } else if (node instanceof BinExpr) {
        yield node.lhs;
        yield node.rhs;
    } else if (node instanceof MemberExpr) {
        yield node.lhs;
        yield node.rhs;
    } else if (node instanceof FuncExpr) {
        yield node.func;
        yield* node.args;
    } else if (node instanceof LetExpr) {
        yield node.varOrVarDecl;
        yield node.expr;
    } else if (node instanceof LambdaInlineExpr) {
        yield node.params;
        yield node.expr;
    } else if (node instanceof LambdaExpr) {
        yield node.params;
        yield node.stmtList;
    } else if (node instanceof Literal) {
        yield node.literal;
    } else if (node instanceof VarOrVarDeclList) {
        yield* node.list;
    } else if (node instanceof Blocktype) {
        yield* node.args;
    }
}

export function* ancestors(db: FileDatabase, node: HirNode): Generator<HirNode> {
    yield node;

    let parent: NodeOrToken | undefined = "green" in node.node ? node.node.green : node.node;
    while (true) {
        parent = parent.parent;
        if (parent === undefined) {
            break;
        }
        const parentHir = syntaxToHir(db, parent);
        if (parentHir !== undefined) {
            yield parentHir;
        }
    }
}
