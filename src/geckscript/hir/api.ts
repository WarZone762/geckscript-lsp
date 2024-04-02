import assert from "node:assert";
import { DiagnosticSeverity } from "vscode-languageserver";

import * as ast from "../ast.js";
import { GlobalFunction } from "../function_data.js";
import {
    BeginStmt,
    BinExpr,
    Blocktype,
    Branch,
    Expr,
    ExprType,
    ExprTypeFunction,
    ExprTypeSimple,
    FieldExpr,
    File,
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
    LocalSymbol,
    Name,
    NameRef,
    Number,
    ParamType,
    Script,
    ScriptVar,
    SetStmt,
    StmtList,
    String,
    Symbol,
    SymbolTable,
    UnaryExpr,
    UnresolvedSymbol,
    VarDeclStmt,
    VarOrVarDeclList,
    WhileStmt,
} from "../hir.js";
import { NodeOrToken, SyntaxKind, Token } from "../syntax.js";

export class Analyzer {
    scriptVarMap: SymbolTable<File[]> = new SymbolTable();
    file!: File;

    constructor(public db: FileDatabase) {
        for (const file of db.files.values()) {
            if (file.hir === undefined) {
                continue;
            }
            for (const symbolName of file.hir.symbolTable.keys()) {
                const files = this.scriptVarMap.get(symbolName);
                if (files !== undefined) {
                    files.push(file);
                } else {
                    this.scriptVarMap.set(symbolName, [file]);
                }
            }
        }
    }

    analyzeFile(file: File) {
        this.file = file;
        if (file.hir !== undefined) {
            this.analyzeNode(file.hir);
        }
    }

    analyzeNode(node: HirNode) {
        if (node instanceof Script) {
            this.analyzeNode(node.stmtList);
        } else if (node instanceof StmtList) {
            for (const stmt of node.stmts) {
                this.analyzeNode(stmt);
            }
        } else if (node instanceof SetStmt) {
            this.analyzeBinOp(node.var_, node.value);
        } else if (node instanceof IfStmt) {
            this.analyzeExpr(node.cond);
            this.propagateType(node.cond, new ExprTypeSimple("Bool"));
            this.analyzeNode(node.trueBranch);
            if (node.falseBranch !== undefined) {
                this.analyzeNode(node.falseBranch);
            }
        } else if (node instanceof Branch) {
            if (node.cond !== undefined) {
                this.analyzeExpr(node.cond);
                this.propagateType(node.cond, new ExprTypeSimple("Bool"));
            }
            this.analyzeNode(node.trueBranch);
            if (node.falseBranch !== undefined) {
                this.analyzeNode(node.falseBranch);
            }
        } else if (node instanceof WhileStmt) {
            this.analyzeExpr(node.cond);
            this.propagateType(node.cond, new ExprTypeSimple("Bool"));
            this.analyzeNode(node.stmtList);
        } else if (node instanceof BeginStmt) {
            this.analyzeNode(node.stmtList);
        } else if (node instanceof ForeachStmt) {
            this.analyzeBinOp(node.nameRef, node.iter);
            this.analyzeNode(node.stmtList);
        } else if (node instanceof VarDeclStmt) {
            if (node.value !== undefined) {
                this.analyzeBinOp(node.name, node.value);
            }
        } else if (
            node instanceof UnaryExpr ||
            node instanceof BinExpr ||
            node instanceof FieldExpr ||
            node instanceof IndexExpr ||
            node instanceof FuncExpr ||
            node instanceof LetExpr ||
            node instanceof LambdaInlineExpr ||
            node instanceof LambdaExpr
        ) {
            this.analyzeExpr(node);
        } else if (node instanceof VarOrVarDeclList) {
            for (const param of node.list) {
                this.analyzeExpr(param);
            }
        } else if (
            node instanceof Blocktype ||
            node instanceof Name ||
            node instanceof NameRef ||
            node instanceof Literal ||
            node instanceof String ||
            node instanceof Number
        ) {
            undefined;
        }
    }

    analyzeBinOp(lhs: Expr | Name, rhs: Expr): ExprType {
        const lhsType = this.analyzeExpr(lhs);
        const rhsType = this.analyzeExpr(rhs);
        if (rhsType.kind !== "<unknown>") {
            return this.propagateType(lhs, rhsType);
        } else {
            return this.propagateType(rhs, lhsType);
        }
    }

    analyzeExpr(node: Expr | Name): ExprType {
        if (node.type.kind !== "<unknown>" && node.type.kind !== "Function") {
            return node.type;
        }

        if (node instanceof UnaryExpr) {
            node.type = this.analyzeExpr(node.operand);
        } else if (node instanceof BinExpr) {
            node.type = this.analyzeBinOp(node.lhs, node.rhs);
        } else if (node instanceof FieldExpr) {
            const lhs = this.analyzeExpr(node.lhs);
            if (!(lhs instanceof ExprTypeFunction)) {
                const globalSymbol = this.db.globalSymbols.get(node.field.symbol.name);
                if (globalSymbol !== undefined) {
                    node.type = this.analyzeExpr(node.field);
                } else {
                    if (lhs.file === undefined) {
                        lhs.members.push(node.field.symbol);
                        const files = this.scriptVarMap.get(node.field.symbol.name);
                        if (files === undefined) {
                            // TODO: report error 'unable to resolve symbol'
                        } else {
                            const possibleFiles = [];
                            for (const file of files) {
                                possibleFiles.push(file);
                                for (const symbol of lhs.members) {
                                    if (!file.hir!.symbolTable.has(symbol.name)) {
                                        possibleFiles.pop();
                                    }
                                }
                            }
                            if (possibleFiles.length === 0) {
                                // TODO: report error 'unable to resolve symbol'
                            } else if (possibleFiles.length === 1) {
                                lhs.file = possibleFiles[0];
                                lhs.members = [...lhs.file.hir!.symbolTable.values()];
                            }
                        }
                    }

                    if (lhs.file !== undefined) {
                        const symbol = lhs.file.hir!.symbolTable.get(node.field.symbol.name);
                        if (symbol !== undefined) {
                            node.field.symbol = new ScriptVar(
                                symbol.name,
                                symbol.type,
                                lhs.file.doc.uri
                            );
                            node.type = node.field.symbol.type;
                        } else {
                            //TODO: report error 'unable to resolve symbol'
                        }
                    } else {
                        //TODO: report error 'unable to resolve symbol'
                    }
                }
            } else {
                // TODO: report error 'function can not use dot syntax'
            }
        } else if (node instanceof IndexExpr) {
            this.analyzeExpr(node.lhs);
            this.analyzeExpr(node.index);
            node.type = new ExprTypeSimple("Ambiguous");
        } else if (node instanceof FuncExpr) {
            const func = this.analyzeExpr(node.func);
            if (func instanceof ExprTypeFunction) {
                node.type = func.ret;
                for (let i = 0; i < Math.min(node.args.length, func.args.length); ++i) {
                    this.analyzeExpr(node.args[i]);
                    if (node.args[i].type.kind === "<unknown>") {
                        this.propagateType(node.args[i], func.args[i].type);
                    }
                }
            } else if (func.kind === "<unknown>") {
                const type = new ExprTypeFunction(undefined, undefined, new ExprTypeSimple());
                for (const arg of node.args) {
                    this.analyzeExpr(arg);
                    type.args.push(new ParamType(undefined, arg.type));
                }

                this.propagateType(node.func, type);
            } else {
                // TODO: emit error
                node.type = func;
            }
        } else if (node instanceof LetExpr) {
            node.type = this.analyzeBinOp(node.lhs, node.expr);
        } else if (node instanceof LambdaInlineExpr) {
            this.analyzeNode(node.params);
            const ret = this.analyzeExpr(node.expr);
            const args = [];
            for (const arg of node.params.list) {
                args.push(new ParamType(arg.symbol.name, arg.type));
            }
            node.type.ret = ret;
            node.type.args = args;
        } else if (node instanceof LambdaExpr) {
            this.analyzeNode(node.params);
            this.analyzeNode(node.stmtList);
            const args = [];
            for (const arg of node.params.list) {
                args.push(new ParamType(arg.symbol.name, arg.type));
            }
            node.type.args = args;
        } else if (node instanceof NameRef) {
            const symbol = resolveSymbol(this.db, node);
            if (
                symbol === undefined ||
                (symbol instanceof UnresolvedSymbol && symbol.referencingFiles.size !== 0)
            ) {
                // TODO
                // this.reportDiagnostic(
                //     `unable to resolve symbol ${node.symbol.name}`,
                //     node,
                //     DiagnosticSeverity.Information
                // );

                if (symbol === undefined) {
                    const unresolvedSymbol = new UnresolvedSymbol(
                        node.symbol.name,
                        new ExprTypeSimple()
                    );
                    this.addUnresolvedSymbol(unresolvedSymbol);
                } else {
                    this.addUnresolvedSymbol(symbol);
                }
            } else {
                node.symbol = symbol;
            }
        }

        return node.type;
    }

    /** Prapagates `type` to `expr`. Returns `type`, or type of `expr` if it is more general than `type`. */
    propagateType(expr: Expr | Name, type: ExprType): ExprType {
        if (expr.type.kind === "<unknown>") {
            if (expr instanceof BinExpr) {
                expr.type = type;
                this.propagateType(expr.lhs, type);
                this.propagateType(expr.rhs, type);
            } else if (expr instanceof UnaryExpr) {
                expr.type = type;
                this.propagateType(expr.operand, type);
            } else if (expr instanceof FieldExpr) {
                expr.type = type;
                this.propagateType(expr.field, type);
            } else if (expr instanceof IndexExpr) {
                expr.type = type;
                // TODO: make array type
            } else if (expr instanceof FuncExpr) {
                expr.type = type;

                const fnType = new ExprTypeFunction(undefined, undefined, type);
                for (const arg of expr.args) {
                    fnType.args.push(new ParamType(undefined, arg.type));
                }
                this.propagateType(expr.func, fnType);
            } else if (expr instanceof LetExpr) {
                expr.type = type;
                this.propagateType(expr.expr, type);
            } else if (expr instanceof LambdaInlineExpr) {
                this.propagateType(expr.expr, type);
                expr.type.ret = type;
            } else if (expr instanceof LambdaExpr) {
                expr.type.ret = type;
            } else if (expr instanceof NameRef) {
                if (expr.symbol instanceof GlobalFunction) {
                    console.error(
                        `tried to propogate type '${type}' to global function '${expr.symbol.signature()}'`
                    );
                    return expr.type;
                }
                expr.symbol.type = type;
            } else if (expr instanceof Name) {
                expr.symbol.type = type;
            }
            // TODO: type analysis
            // } else if (!type.isAssignableTo(expr.type)) {
            //     this.file.diagnostics.push({
            //         range: this.file.rangeOf(expr.node.green),
            //         message: `'${type}' is not assignable to '${expr.type}'`,
            //         severity: DiagnosticSeverity.Error,
            //     });
            //     return type;
        }

        return expr.type;
        // TODO
        // return type.isChildOf(expr.type) ? expr.type : type;
    }

    addUnresolvedSymbol(symbol: UnresolvedSymbol) {
        symbol.referencingFiles.add(this.file.doc.uri);
        this.file.unresolvedSymbols.add(symbol);
        this.db.unresolvedSymbols.set(symbol.name, symbol);
    }

    reportDiagnostic(msg: string, node: HirNode, severity: DiagnosticSeverity) {
        this.file.diagnostics.push({
            range: this.file.rangeOf("green" in node.node ? node.node.green : node.node),
            message: msg,
            severity,
        });
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
export function visibleSymbols(db: FileDatabase, node: NodeOrToken): LocalSymbol[] {
    let hirNode;
    if (!node.isNode() && node.parent !== undefined) {
        hirNode = syntaxToHir(db, node.parent);
    } else {
        hirNode = syntaxToHir(db, node);
    }
    if (hirNode === undefined) {
        return [];
    }

    const symbols: LocalSymbol[] = [];

    for (const parent of ancestors(db, hirNode)) {
        if ("symbolTable" in parent) {
            symbols.push(...parent.symbolTable.values());
        }
    }

    return symbols;
}

export function references(
    db: FileDatabase,
    symbol: LocalSymbol | UnresolvedSymbol | GlobalSymbol | GlobalFunction
): NameRef[] {
    const refs: NameRef[] = [];

    if (symbol instanceof LocalSymbol) {
        const scope = findNameScope(db, symbol.def);
        if (scope === undefined) {
            return refs;
        }
        for (const child of visit(scope)) {
            if (child instanceof NameRef && child.symbol === symbol) {
                refs.push(child);
            }
        }
        if (scope.node instanceof ast.Script) {
            const defFile = db.script(scope.node.green);
            if (defFile === undefined) {
                return refs;
            }
            for (const file of db.files.values()) {
                if (file.hir === undefined) {
                    continue;
                }
                for (const child of visit(file.hir)) {
                    if (
                        child instanceof FieldExpr &&
                        child.field.symbol.name === symbol.name &&
                        child.lhs.type instanceof ExprTypeSimple &&
                        child.lhs.type.file?.doc.uri === defFile.doc.uri
                    ) {
                        refs.push(child.field);
                    }
                }
            }
        }
    } else if (symbol instanceof UnresolvedSymbol || symbol instanceof GlobalSymbol) {
        for (const file of db.files.values()) {
            if (file.hir === undefined) {
                continue;
            }
            for (const child of visit(file.hir)) {
                if (
                    child instanceof NameRef &&
                    child.node.green.parent?.kind !== SyntaxKind.FIELD_EXPR &&
                    child.symbol.name.toLowerCase() === symbol.name.toLowerCase()
                ) {
                    refs.push(child);
                }
            }
        }
    } else if (symbol instanceof GlobalFunction) {
        for (const file of db.files.values()) {
            if (file.hir === undefined) {
                continue;
            }
            for (const child of visit(file.hir)) {
                if (
                    child instanceof NameRef &&
                    child.symbol.name.toLowerCase() === symbol.name.toLowerCase()
                ) {
                    refs.push(child);
                }
            }
        }
    }

    return refs;
}

export function symbolFromToken(token: Token, db: FileDatabase): Symbol | undefined {
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

export function defFromToken(token: Token, db: FileDatabase): Name | Script | undefined {
    const symbol = symbolFromToken(token, db);
    if (symbol instanceof UnresolvedSymbol || symbol instanceof GlobalFunction) {
        return;
    } else if (symbol instanceof LocalSymbol) {
        return symbol.def;
    } else if (symbol instanceof GlobalSymbol || symbol instanceof ScriptVar) {
        return symbol.def(db);
    }
}

export function resolveSymbol(db: FileDatabase, nameRef: NameRef): Symbol | undefined {
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
        db.unresolvedSymbols.get(nameRef.symbol.name) ?? db.globalSymbols.get(nameRef.symbol.name)
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
    } else if (node instanceof Branch) {
        if (node.cond !== undefined) {
            yield node.cond;
        }
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
        yield node.lhs;
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
