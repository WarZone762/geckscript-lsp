import assert from "node:assert";
import { DiagnosticSeverity } from "vscode-languageserver";

import { FunctionData } from "../function_data.js";
import {
    BeginStmt,
    BinExpr,
    Blocktype,
    Expr,
    ExprType,
    ExprTypeFunction,
    ExprTypeSimple,
    FieldExpr,
    FileDatabase,
    ForeachStmt,
    FuncExpr,
    GlobalSymbol,
    HirNode,
    IfStmt,
    IndexExpr,
    LambdaExpr,
    LambdaInlineExpr,
    LetExpr,
    Literal,
    Name,
    NameRef,
    ParsedString,
    Script,
    SetStmt,
    StmtList,
    Symbol,
    UnaryExpr,
    VarDeclStmt,
    VarOrVarDeclList,
    WhileStmt,
} from "../hir.js";
import { NodeOrToken, SyntaxKind, Token } from "../syntax.js";

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
                child instanceof FieldExpr ||
                child instanceof IndexExpr ||
                child instanceof FuncExpr ||
                child instanceof LetExpr ||
                child instanceof LambdaInlineExpr ||
                child instanceof LambdaExpr
            ) {
                this.analyzeExpr(child);
            } else if (child instanceof Literal) {
                continue;
            } else if (child instanceof VarOrVarDeclList) {
                continue;
            } else if (child instanceof Name) {
                continue;
            } else if (child instanceof NameRef) {
                this.analyzeExpr(child);
            } else if (child instanceof Blocktype) {
                continue;
            } else if (child instanceof String) {
                continue;
            } else if (child instanceof Number) {
                continue;
            }
        }
    }

    analyzeExpr(node: Expr): void {
        if (node.type.kind !== "<unknown>") {
            return;
        }

        if (node instanceof UnaryExpr) {
            node.type = node.operand.type;
        } else if (node instanceof BinExpr) {
            const lhs = node.lhs.type;
            const rhs = node.rhs.type;
            if (lhs.kind === rhs.kind) {
                node.type = lhs;
            } else {
                if (lhs.kind === "<unknown>") {
                    this.propagateType(node.lhs, rhs);
                } else if (rhs.kind === "<unknown>") {
                    this.propagateType(node.rhs, lhs);
                } else {
                    this.parsed.diagnostics.push({
                        range: this.parsed.rangeOf(node.node.green),
                        message: `ambiguous expression type: ${lhs} ${node.node.op()?.text} ${rhs}`,
                        severity: DiagnosticSeverity.Information,
                    });

                    node.type = new ExprTypeSimple("Ambiguous");
                }
            }
        } else if (node instanceof FieldExpr) {
            node.type = node.field.type;
        } else if (node instanceof IndexExpr) {
            // TODO
        } else if (node instanceof FuncExpr) {
            const func = node.func.type;
            if (func instanceof ExprTypeFunction) {
                node.type = func.ret;
                for (let i = 0; i < Math.min(node.args.length, func.args.length); ++i) {
                    if (node.args[i].type.kind === "<unknown>") {
                        this.propagateType(node.args[i], func.args[i]);
                    }
                }
            } else if (func.kind === "<unknown>") {
                const type = new ExprTypeFunction(new ExprTypeSimple());
                for (const arg of node.args) {
                    type.args.push(arg.type);
                }

                this.propagateType(node.func, type);
            } else {
                // TODO: emit error
                node.type = func;
            }
        } else if (node instanceof LetExpr) {
            node.type = node.expr.type;
        } else if (node instanceof LambdaInlineExpr) {
            // TODO
        } else if (node instanceof LambdaExpr) {
            // TODO
        } else if (node instanceof Literal) {
            //
        } else if (node instanceof NameRef) {
            const symbol = findDefinition(this.db, node);
            if (symbol !== undefined) {
                node.symbol = symbol;
            } else {
                this.parsed.diagnostics.push({
                    range: this.parsed.rangeOf(node.node.green),
                    message: `unable to resolve symbol ${node.symbol.name}`,
                    severity: DiagnosticSeverity.Information,
                });

                if (node.symbol instanceof GlobalSymbol) {
                    node.symbol.referencingFiles.add(this.parsed.doc.uri);
                    this.parsed.unresolvedSymbols.add(node.symbol);
                    this.db.globalSymbols.set(node.symbol.name.toLowerCase(), node.symbol);
                } else {
                    const globalSymbol = new GlobalSymbol(node.symbol.name, new ExprTypeSimple());
                    globalSymbol.referencingFiles.add(this.parsed.doc.uri);
                    this.db.globalSymbols.set(node.symbol.name.toLowerCase(), globalSymbol);
                }
            }
        }
    }

    propagateType(expr: Expr, type: ExprType) {
        // if (expr.type.kind !== ExprKind.Unknown) {
        //     console.error("tried to infer resolved type of", expr, `to ${type}`);
        //     return;
        // }

        if (expr instanceof BinExpr) {
            expr.type = type;
            this.propagateType(expr.lhs, type);
            this.propagateType(expr.rhs, type);
        } else if (expr instanceof UnaryExpr) {
            expr.type = type;
            this.propagateType(expr.operand, type);
        } else if (expr instanceof FieldExpr) {
            expr.type = type;
            // TODO: make container type
            this.propagateType(expr.field, type);
        } else if (expr instanceof IndexExpr) {
            expr.type = type;
            // TODO: make array type
            // this.propagateType(expr.lhs, type);
        } else if (expr instanceof FuncExpr) {
            expr.type = type;

            const fnType = new ExprTypeFunction(type);
            for (const arg of expr.args) {
                fnType.args.push(arg.type);
            }
            this.propagateType(expr.func, fnType);
        } else if (expr instanceof LetExpr) {
            expr.type = type;
            this.propagateType(expr.expr, type);
        } else if (expr instanceof LambdaInlineExpr) {
            expr.type = type;
        } else if (expr instanceof LambdaExpr) {
            expr.type = type;
        } else if (expr instanceof NameRef) {
            if (expr.symbol instanceof FunctionData) {
                console.error(
                    `tried to propogate type '${type}' to global function '${expr.symbol.signature()}'`
                );
                return;
            }
            expr.symbol.type = type;
        }
    }
}

export function syntaxToHir<T extends NodeOrToken, H extends HirNode & { node: { green: T } | T }>(
    db: FileDatabase,
    node: T
): H | undefined {
    if (node.parent === undefined) {
        assert.strictEqual(node.kind, SyntaxKind.SCRIPT);
        const file = db.scriptCache.get(node);
        return file?.hir as H;
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

export function findReferences(
    db: FileDatabase,
    symbol: Symbol | GlobalSymbol | FunctionData
): NameRef[] {
    const refs: NameRef[] = [];

    if (symbol instanceof Symbol) {
        const scope = findNameScope(db, symbol.decl);
        if (scope === undefined) {
            return refs;
        }
        for (const child of visit(scope)) {
            if (child instanceof NameRef && child.symbol === symbol) {
                refs.push(child);
            }
        }
    } else if (symbol instanceof GlobalSymbol || symbol instanceof FunctionData) {
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
): Symbol | GlobalSymbol | FunctionData | undefined {
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
): Symbol | GlobalSymbol | FunctionData | undefined {
    for (const parent of ancestors(db, nameRef)) {
        if ("symbolTable" in parent) {
            const symbol = parent.symbolTable.get(nameRef.symbol.name);
            if (symbol === undefined) {
                continue;
            }

            return symbol;
        }
    }

    return (
        db.globalSymbols.get(nameRef.symbol.name.toLowerCase()) ??
        db.builtinFunctions.get(nameRef.symbol.name.toLowerCase())
    );
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
    } else if (node instanceof FieldExpr) {
        yield node.lhs;
        yield node.field;
    } else if (node instanceof IndexExpr) {
        yield node.lhs;
        yield node.index;
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
