import { Diagnostic } from "vscode-languageserver/node.js";

import * as ast from "../ast.js";
import {
    BeginStmt,
    BinExpr,
    BinExprOp,
    Blocktype,
    Branch,
    Expr,
    ExprTypeFunction,
    ExprTypeSimple,
    FieldExpr,
    FieldExprOp,
    ForeachStmt,
    FuncExpr,
    IfStmt,
    IndexExpr,
    LambdaExpr,
    LambdaInlineExpr,
    LetExpr,
    Literal,
    Name,
    NameRef,
    Number,
    ParamType,
    Script,
    SetStmt,
    Stmt,
    StmtList,
    String,
    Symbol,
    SymbolTable,
    UnaryExpr,
    UnaryExprOp,
    UnresolvedSymbol,
    VarDeclStmt,
    VarOrVarDecl,
    VarOrVarDeclList,
    WhileStmt,
} from "../hir.js";
import { SyntaxKind, Token, TypeSyntaxKind } from "../syntax.js";

export class LowerContext {
    diagnostics: Diagnostic[] = [];
    globalSymbols: UnresolvedSymbol[] = [];

    script(node: ast.Script | undefined): Script | undefined {
        if (node === undefined) {
            return;
        }

        const name = node.name()?.name()?.text;
        if (name === undefined) {
            return;
        }

        const symbolTable = new SymbolTable();
        const stmtList = this.stmtList(node.body(), symbolTable);
        if (stmtList === undefined) {
            return;
        }

        return new Script(name, stmtList, symbolTable, node);
    }

    stmtList(
        node: ast.StmtList | undefined,
        symbolTable: SymbolTable<Symbol>
    ): StmtList | undefined {
        if (node === undefined) {
            return;
        }

        const stmts: Stmt[] = [];
        for (const stmt of node.iter()) {
            const s = this.stmt(stmt, symbolTable);
            if (s !== undefined) {
                stmts.push(s);
            }
        }

        return new StmtList(stmts, node);
    }

    stmt(node: ast.Stmt | undefined, symbolTable: SymbolTable<Symbol>): Stmt | undefined {
        if (node === undefined) {
            return;
        }

        if (node instanceof ast.IfStmt) {
            return this.ifStmt(node);
        } else if (node instanceof ast.WhileStmt) {
            return this.whileStmt(node);
        } else if (node instanceof ast.BeginStmt) {
            return this.beginStmt(node);
        } else if (node instanceof ast.ForeachStmt) {
            return this.foreachStmt(node);
        } else if (node instanceof ast.SetStmt) {
            return this.setStmt(node, symbolTable);
        } else if (node instanceof ast.VarDeclStmt) {
            return this.varDeclStmt(node, symbolTable);
        } else {
            return this.expr(node, symbolTable);
        }
    }

    ifStmt(node: ast.IfStmt | undefined): IfStmt | undefined {
        if (node === undefined) {
            return;
        }

        const symbolTable = new SymbolTable();
        const cond = this.expr(node.cond(), symbolTable);
        if (cond === undefined) {
            return;
        }

        const trueBranch = this.stmtList(node.trueBranch(), symbolTable);
        if (trueBranch === undefined) {
            return;
        }

        const falseBranch = this.branch(node.falseBranch());

        return new IfStmt(cond, trueBranch, falseBranch, symbolTable, node);
    }

    branch(node: ast.Branch | undefined): Branch | undefined {
        if (node === undefined) {
            return;
        }

        const symbolTable = new SymbolTable();
        const cond = this.expr(node.cond(), symbolTable);

        const trueBranch = this.stmtList(node.trueBranch(), symbolTable);
        if (trueBranch === undefined) {
            return;
        }

        const falseBranch = this.branch(node.falseBranch());

        return new Branch(cond, trueBranch, falseBranch, symbolTable, node);
    }

    whileStmt(node: ast.WhileStmt | undefined): WhileStmt | undefined {
        if (node === undefined) {
            return;
        }

        const symbolTable = new SymbolTable();
        const cond = this.expr(node.cond(), symbolTable);
        if (cond === undefined) {
            return;
        }

        const stmtList = this.stmtList(node.body(), symbolTable);
        if (stmtList === undefined) {
            return;
        }

        return new WhileStmt(cond, stmtList, symbolTable, node);
    }

    beginStmt(node: ast.BeginStmt | undefined): BeginStmt | undefined {
        if (node === undefined) {
            return;
        }

        const symbolTable = new SymbolTable();
        const stmtList = this.stmtList(node.body(), symbolTable);
        if (stmtList === undefined) {
            return;
        }

        const blocktype = this.blocktype(node.blocktype(), symbolTable);
        if (blocktype === undefined) {
            return;
        }

        return new BeginStmt(blocktype, stmtList, symbolTable, node);
    }

    blocktype(
        node: ast.BlocktypeDesig | undefined,
        symbolTable: SymbolTable<Symbol>
    ): Blocktype | undefined {
        if (node === undefined) {
            return;
        }

        const name = node.blocktype()?.text;
        if (name === undefined) {
            return;
        }

        const args = [];
        const exprs = node.args();
        if (exprs !== undefined) {
            for (const expr of exprs.iter()) {
                const arg = this.expr(expr, symbolTable);
                if (arg !== undefined) {
                    args.push(arg);
                }
            }
        }

        return new Blocktype(name, args, node);
    }

    foreachStmt(node: ast.ForeachStmt | undefined): ForeachStmt | undefined {
        if (node === undefined) {
            return;
        }

        const nameRef = this.nameRef(node.ident());
        if (nameRef === undefined) {
            return;
        }

        const symbolTable = new SymbolTable();
        const iter = this.expr(node.iterable(), symbolTable);
        if (iter === undefined) {
            return;
        }

        const stmtList = this.stmtList(node.body(), symbolTable);
        if (stmtList === undefined) {
            return;
        }

        return new ForeachStmt(nameRef, iter, stmtList, symbolTable, node);
    }

    setStmt(node: ast.SetStmt | undefined, symbolTable: SymbolTable<Symbol>): SetStmt | undefined {
        if (node === undefined) {
            return;
        }

        const nameRef = this.expr(node.var(), symbolTable);
        if (nameRef === undefined) {
            return;
        }

        const value = this.expr(node.expr(), symbolTable);
        if (value === undefined) {
            return;
        }

        return new SetStmt(nameRef, value, node);
    }

    varDeclStmt(
        node: ast.VarDeclStmt | undefined,
        symbolTable: SymbolTable<Symbol>
    ): VarDeclStmt | undefined {
        if (node === undefined) {
            return;
        }

        const name = this.name(node.var()?.ident(), node.var()?.type(), symbolTable);
        if (name === undefined) {
            return;
        }

        const value = this.expr(node.expr(), symbolTable);

        return new VarDeclStmt(name, value, node);
    }

    expr(node: ast.Expr | undefined, symbolTable: SymbolTable<Symbol>): Expr | undefined {
        if (node === undefined) {
            return;
        }
        if (node instanceof ast.UnaryExpr) {
            return this.unaryExpr(node, symbolTable);
        } else if (node instanceof ast.BinExpr) {
            return this.binExpr(node, symbolTable);
        } else if (node instanceof ast.FieldExpr) {
            return this.fieldExpr(node, symbolTable);
        } else if (node instanceof ast.IndexExpr) {
            return this.indexExpr(node, symbolTable);
        } else if (node instanceof ast.FuncExpr) {
            return this.funcExpr(node, symbolTable);
        } else if (node instanceof ast.LetExpr) {
            return this.letExpr(node, symbolTable);
        } else if (node instanceof ast.LambdaInlineExpr) {
            return this.lambdaInlineExpr(node, symbolTable);
        } else if (node instanceof ast.LambdaExpr) {
            return this.lambdaExpr(node, symbolTable);
        } else if (node instanceof ast.NameRef) {
            return this.nameRef(node);
        } else if (node instanceof ast.Literal) {
            return this.literal(node);
        }
    }

    unaryExpr(
        node: ast.UnaryExpr | undefined,
        symbolTable: SymbolTable<Symbol>
    ): UnaryExpr | undefined {
        if (node === undefined) {
            return;
        }

        // TODO
        const op = node.op()?.kind === SyntaxKind.EXCLAMATION ? UnaryExprOp.Not : UnaryExprOp.Not;

        const operand = this.expr(node.operand(), symbolTable);
        if (operand === undefined) {
            return;
        }

        return new UnaryExpr(new ExprTypeSimple(), op, operand, node);
    }

    binExpr(node: ast.BinExpr | undefined, symbolTable: SymbolTable<Symbol>): BinExpr | undefined {
        if (node === undefined) {
            return;
        }

        // TODO
        const op = node.op()?.kind === SyntaxKind.PLUS ? BinExprOp.Plus : BinExprOp.Minus;

        const lhs = this.expr(node.lhs(), symbolTable);
        if (lhs === undefined) {
            return;
        }

        const rhs = this.expr(node.rhs(), symbolTable);
        if (rhs === undefined) {
            return;
        }

        return new BinExpr(new ExprTypeSimple(), op, lhs, rhs, node);
    }

    fieldExpr(
        node: ast.FieldExpr | undefined,
        symbolTable: SymbolTable<Symbol>
    ): FieldExpr | undefined {
        if (node === undefined) {
            return;
        }

        let op;
        switch (node.op()?.kind) {
            case SyntaxKind.DOT:
                op = FieldExprOp.Dot;
                break;
            case SyntaxKind.RARROW:
                op = FieldExprOp.RArrow;
                break;
            default:
                return;
        }

        const lhs = this.expr(node.lhs(), symbolTable);
        if (lhs === undefined) {
            return;
        }

        const field = this.expr(node.field(), symbolTable);
        if (field === undefined) {
            return;
        } else if (!(field instanceof NameRef)) {
            // TODO: report error
            return;
        }

        return new FieldExpr(new ExprTypeSimple(), op, lhs, field, node);
    }

    indexExpr(
        node: ast.IndexExpr | undefined,
        symbolTable: SymbolTable<Symbol>
    ): IndexExpr | undefined {
        if (node === undefined) {
            return;
        }

        const lhs = this.expr(node.lhs(), symbolTable);
        if (lhs === undefined) {
            return;
        }

        const index = this.expr(node.index(), symbolTable);
        if (index === undefined) {
            return;
        }

        return new IndexExpr(new ExprTypeSimple(), lhs, index, node);
    }

    funcExpr(
        node: ast.FuncExpr | undefined,
        symbolTable: SymbolTable<Symbol>
    ): FuncExpr | undefined {
        if (node === undefined) {
            return;
        }

        const func = this.expr(node.func(), symbolTable);
        if (func === undefined) {
            return;
        }

        const args = [];
        const exprs = node.args()?.iter();
        if (exprs === undefined) {
            return;
        }
        for (const expr of exprs) {
            const arg = this.expr(expr, symbolTable);
            if (arg !== undefined) {
                args.push(arg);
            }
        }

        return new FuncExpr(new ExprTypeSimple(), func, args, node);
    }

    letExpr(node: ast.LetExpr | undefined, symbolTable: SymbolTable<Symbol>): LetExpr | undefined {
        if (node === undefined) {
            return;
        }

        const lhs = this.expr(node.var(), symbolTable);
        if (lhs === undefined) {
            return;
        }

        let op;
        switch (node.op()?.kind) {
            case SyntaxKind.EQ:
            case SyntaxKind.COLONEQ:
            case SyntaxKind.PLUSEQ:
            case SyntaxKind.MINUSEQ:
            case SyntaxKind.ASTERISKEQ:
            case SyntaxKind.SLASHEQ:
            case SyntaxKind.PERCENTEQ:
            case SyntaxKind.CIRCUMFLEXEQ:
            case SyntaxKind.VBAREQ:
            case SyntaxKind.AMPERSANDEQ:
                op = BinExprOp.Eq;
                break;
            default:
                return;
        }

        const expr = this.expr(node.expr(), symbolTable);
        if (expr === undefined) {
            return;
        }

        return new LetExpr(new ExprTypeSimple(), lhs, op, expr, node);
    }

    lambdaInlineExpr(
        node: ast.LambdaInlineExpr | undefined,
        symbolTable: SymbolTable<Symbol>
    ): LambdaInlineExpr | undefined {
        if (node === undefined) {
            return;
        }

        const exprs = node.params();
        if (exprs === undefined) {
            return;
        }

        const params = this.varOrVarDeclList(node.params(), symbolTable);
        if (params === undefined) {
            return;
        }

        const expr = this.expr(node.expr(), symbolTable);
        if (expr === undefined) {
            return;
        }

        return new LambdaInlineExpr(
            new ExprTypeFunction(undefined, undefined, new ExprTypeSimple()),
            params,
            expr,
            symbolTable,
            node
        );
    }

    lambdaExpr(
        node: ast.LambdaExpr | undefined,
        symbolTable: SymbolTable<Symbol>
    ): LambdaExpr | undefined {
        if (node === undefined) {
            return;
        }

        const params = this.varOrVarDeclList(node.params(), symbolTable);
        if (params === undefined) {
            return;
        }

        const stmtList = this.stmtList(node.body(), symbolTable);
        if (stmtList === undefined) {
            return;
        }

        let type;
        // if this lambda is top level, add it to global symbols
        if (node.green.parent?.parent?.kind === SyntaxKind.SCRIPT) {
            const script = new ast.Script(node.green.parent.parent);
            const scriptName = script?.name()?.name()?.text;
            if (scriptName !== undefined) {
                type = new ExprTypeFunction(
                    scriptName,
                    undefined,
                    new ExprTypeSimple("Ambiguous"),
                    params.list.map((e) => new ParamType(e.symbol.name, e.type))
                );
                this.globalSymbols.push(new UnresolvedSymbol(scriptName, type));
            }
        }

        type ??= new ExprTypeFunction(undefined, undefined, new ExprTypeSimple());

        return new LambdaExpr(type, params, stmtList, symbolTable, node);
    }

    varOrVarDeclList(node: ast.VarOrVarDeclList | undefined, symbolTable: SymbolTable<Symbol>) {
        if (node === undefined) {
            return;
        }

        const list = [];
        for (const expr of node.iter()) {
            if (expr !== undefined) {
                const varOrVarDecl = this.varOrVarDecl(expr, symbolTable);
                if (varOrVarDecl !== undefined) {
                    list.push(varOrVarDecl);
                }
            }
        }

        return new VarOrVarDeclList(list, node);
    }

    varOrVarDecl(
        node: ast.VarOrVarDecl | undefined,
        symbolTable: SymbolTable<Symbol>
    ): VarOrVarDecl | undefined {
        if (node instanceof ast.Name) {
            return this.name(node, undefined, symbolTable);
        } else if (node instanceof ast.NameRef) {
            return this.nameRef(node);
        } else if (node instanceof ast.VarDecl) {
            return this.name(node.ident(), node.type(), symbolTable);
        }
    }

    name(
        node: ast.Name | undefined,
        typeToken: Token<TypeSyntaxKind> | undefined,
        symbolTable: SymbolTable<Symbol>
    ): Name | undefined {
        if (node === undefined) {
            return;
        }

        let type;
        switch (typeToken?.kind) {
            case SyntaxKind.SHORT_TYPE:
            case SyntaxKind.INT_TYPE:
            case SyntaxKind.LONG_TYPE:
                type = new ExprTypeSimple("Integer");
                break;
            case SyntaxKind.FLOAT_TYPE:
                type = new ExprTypeSimple("Float");
                break;
            case SyntaxKind.REFERENCE_TYPE:
                type = new ExprTypeSimple("ObjectRef");
                break;
            case SyntaxKind.STRING_VAR_TYPE:
                type = new ExprTypeSimple("StringVar");
                break;
            case SyntaxKind.ARRAY_VAR_TYPE:
                type = new ExprTypeSimple("Array");
                break;
            default:
                type = new ExprTypeSimple();
                break;
        }

        const name = node.name()?.text;
        if (name === undefined) {
            return;
        }

        // TODO: error if already exists
        const nameHir = new Name(name, type, node);
        symbolTable.set(name, nameHir.symbol);

        return nameHir;
    }

    nameRef(node: ast.NameRef | undefined): NameRef | undefined {
        if (node === undefined) {
            return;
        }

        const name = node.nameRef()?.text;
        if (name === undefined) {
            return;
        }

        return new NameRef(new UnresolvedSymbol(name, new ExprTypeSimple()), node);
    }

    literal(node: ast.Literal | undefined): Literal | undefined {
        if (node === undefined) {
            return;
        }

        const literal = node.literal();
        let stringOrNumber;
        let type_ = new ExprTypeSimple();
        if (literal?.kind === SyntaxKind.STRING) {
            stringOrNumber = this.string(literal);
            type_ = new ExprTypeSimple("String");
        } else if (literal?.kind === SyntaxKind.NUMBER_INT) {
            stringOrNumber = this.number(literal);
            type_ = new ExprTypeSimple("Number");
        }

        if (stringOrNumber !== undefined) {
            return new Literal(stringOrNumber, type_, node);
        }
    }

    string(node: Token<SyntaxKind.STRING> | undefined): String | undefined {
        if (node === undefined) {
            return;
        }

        return new String(node.text.slice(1, node.text.length - 1), node);
    }

    number(node: Token<SyntaxKind.NUMBER_INT> | undefined): Number | undefined {
        if (node === undefined) {
            return;
        }

        return new Number(
            node.text.at(1)?.toLowerCase() === "x" ? parseInt(node.text) : parseFloat(node.text),
            node
        );
    }
}
