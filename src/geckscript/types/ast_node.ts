import { Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    SyntaxKind,
    TypenameSyntaxKind,
    KeywordSynaxKind,
    BranchKeywordSyntaxKind,
    AssignmentOperatorSyntaxKind,
    OperatorSyntaxKind,
    VariableOrVariableDeclarationSyntaxKind,
    PrimaryExpressionSyntaxKind,
    ExpressionSyntaxKind,
    StatementSyntaxKind,
    IsTypename,
    IsOperator,
    IsBranchKeyword,
    IsVariableOrVariableDeclaration,
    IsPrimaryExpression,
    IsExpression,
    IsStatement,
    Token,
    Node,
    ChooseNodeOrToken
} from "./syntax_node";
import * as Parser from "../parser";

export class TreeData {
    name: string;
    children: TreeData[];

    constructor(name: string, children: TreeData[] = []) {
        this.name = name;
        this.children = children;
    }

    append(child: TreeData): void {
        this.children.push(child);
    }

    concat(children: TreeData[]): void {
        this.children = this.children.concat(children);
    }
}

export const enum Type {
    Unknown,
    Ambiguous,
    Integer,
    Float,
    Form,
    Reference,
    String,
    Array,
}

const TypeNames: { [key in Type]?: string } = {
    [Type.Unknown]: "unknown",
    [Type.Ambiguous]: "ambiguous",
    [Type.Integer]: "integer",
    [Type.Float]: "float",
    [Type.Form]: "form",
    [Type.Reference]: "reference",
    [Type.String]: "string",
    [Type.Array]: "array",
};

export function GetTypeName(type: Type): string {
    return TypeNames[type] ?? "unable to find Type name";
}

export const enum SymbolKind {
    Unknown,

    Variable,
    Function,
    Script,
}

export interface Symbol {
    name: string;
    kind: SymbolKind;
    // declaration?: AnyNode;
    declaration?: AstNode;
    type: Type;
}

export type SymbolTable = { [key: string]: Symbol };

export interface IAstNodeOrToken {
    green: Node | Token;
}

export class AstNode<T extends SyntaxKind = SyntaxKind> implements IAstNodeOrToken {
    green: ChooseNodeOrToken<T>;

    constructor(green: ChooseNodeOrToken<T>) {
        this.green = green;
    }
}

export class Comment extends AstNode<SyntaxKind.Comment> { }
export class NumberLiteral extends AstNode<SyntaxKind.Number> { }
export class StringLiteral extends AstNode<SyntaxKind.String> { }
export class Identifier extends AstNode<SyntaxKind.Identifier> {
    // symbol?: Symbol;
}

export class AssignmentOperator extends AstNode<AssignmentOperatorSyntaxKind> { }
export class Operator extends AstNode<OperatorSyntaxKind> { }
export class Keyword extends AstNode<KeywordSynaxKind> { }
export class BranchKeyword extends AstNode<BranchKeywordSyntaxKind> { }
export class Typename extends AstNode<TypenameSyntaxKind> { }

function NewIfDefined<T>(val: any, action: new (v: typeof val) => T): T | undefined {
    return val != undefined ? new action(val) : undefined;
}

export class PrimaryExpression extends AstNode<PrimaryExpressionSyntaxKind> { }
export class Expression extends AstNode<ExpressionSyntaxKind> { }
export class Statement extends AstNode<StatementSyntaxKind> { }

export class VariableDeclaration extends AstNode<SyntaxKind.VariableDeclaration> {
    type(): Typename | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsTypename), Typename);
    }

    variable(): Identifier | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Identifier), Identifier);
    }
}

export class UnaryExpression extends AstNode<SyntaxKind.UnaryExpression> {
    op(): Operator | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsOperator), Operator);
    }

    operand(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }
}

export class BinaryExpression extends AstNode<SyntaxKind.BinaryExpresison> {
    lhs(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }

    op(): Operator | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsOperator), Operator);
    }

    rhs(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression, 1), Expression);
    }
}

export class ElementAccessExpression extends AstNode<SyntaxKind.ElementAccessExpression> {
    lhs(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }

    left_op(): AstNode<SyntaxKind.LSQBracket> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.LSQBracket), AstNode<SyntaxKind.LSQBracket>);
    }

    rhs(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression, 1), Expression);
    }

    right_op(): AstNode<SyntaxKind.RSQBracket> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.RSQBracket), AstNode<SyntaxKind.RSQBracket>);
    }
}

export class ExpressionList extends AstNode<SyntaxKind.ExpressionList> {
    get_child(idx: number): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression, idx), Expression);
    }
}

export class FunctionExpression extends AstNode<SyntaxKind.FunctionExpression> {
    name(): Identifier | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Identifier), Identifier);
    }

    args(): ExpressionList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.ExpressionList), ExpressionList);
    }
}

type SyntaxKindPredicate<T extends SyntaxKind> = (kind: SyntaxKind) => kind is T;

export class VariableOrVariableDeclaration extends AstNode<VariableOrVariableDeclarationSyntaxKind> { }

export class VariableList extends AstNode<SyntaxKind.VariableList> {
    get_child(idx: number): VariableOrVariableDeclaration | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsVariableOrVariableDeclaration, idx), VariableOrVariableDeclaration);
    }
}

export class LambdaInlineExpression extends AstNode<SyntaxKind.LambdaInlineExpression> {
    lbracket(): AstNode<SyntaxKind.LBracket> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.LBracket), AstNode<SyntaxKind.LBracket>);
    }

    params(): VariableList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.VariableList), VariableList);
    }

    rbracket(): AstNode<SyntaxKind.RBracket> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.RBracket), AstNode<SyntaxKind.RBracket>);
    }

    arrow(): AstNode<SyntaxKind.EqualsGreater> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.EqualsGreater), AstNode<SyntaxKind.EqualsGreater>);
    }

    expression(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }
}

export class LambdaExpression extends AstNode<SyntaxKind.LambdaExpression> {
    begin(): AstNode<SyntaxKind.Begin> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Begin), AstNode<SyntaxKind.Begin>);
    }

    function(): AstNode<SyntaxKind.BlockTypeFunction> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.BlockTypeFunction), AstNode<SyntaxKind.BlockTypeFunction>);
    }

    lbracket(): AstNode<SyntaxKind.LBracket> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.LBracket), AstNode<SyntaxKind.LBracket>);
    }

    params(): VariableList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.VariableList), VariableList);
    }

    rbracket(): AstNode<SyntaxKind.RBracket> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.RBracket), AstNode<SyntaxKind.RBracket>);
    }

    body(): StatementList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.StatementList), StatementList);
    }

    end(): AstNode<SyntaxKind.End> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.End), AstNode<SyntaxKind.End>);
    }
}

export class ErrorNode extends AstNode<SyntaxKind.ErrorNode> { }

export class VariableDeclarationStatement extends AstNode<SyntaxKind.VariableDeclarationStatement> {
    variable(): VariableDeclaration | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.VariableDeclaration), VariableDeclaration);
    }

    op(): Operator | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsOperator), Operator);
    }

    expression(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }
}

export class SetStatement extends AstNode<SyntaxKind.SetStatement> {
    set(): AstNode<SyntaxKind.Set> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Set), AstNode<SyntaxKind.Set>);
    }

    variable(): Identifier | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Identifier), Identifier);
    }

    to(): AstNode<SyntaxKind.To> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.To), AstNode<SyntaxKind.To>);
    }

    expression(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }
}
export class LetStatement extends AstNode<SyntaxKind.LetStatement> {
    let(): AstNode<SyntaxKind.Let> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Let), AstNode<SyntaxKind.Let>);
    }

    variable(): VariableOrVariableDeclaration | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsVariableOrVariableDeclaration), VariableOrVariableDeclaration);
    }

    op(): Operator | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsOperator), Operator);
    }

    expression(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }
}

export class StatementList extends AstNode<SyntaxKind.StatementList> {
    get_child(idx: number): Statement | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsStatement, idx), Statement);
    }

    symbol_table: SymbolTable = {};
}

export class PrimaryExpressionList extends AstNode<SyntaxKind.PrimaryExpressionList> {
    get_child(idx: number): PrimaryExpression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsPrimaryExpression, idx), PrimaryExpression);
    }
}

export class BlocktypeExpression extends AstNode<SyntaxKind.BlockTypeExpression> {
    block_type(): AstNode<SyntaxKind.BlockType | SyntaxKind.BlockTypeFunction> | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(
            (kind => kind === SyntaxKind.BlockType || kind === SyntaxKind.BlockTypeFunction) as SyntaxKindPredicate<SyntaxKind.BlockType | SyntaxKind.BlockTypeFunction>
        ), AstNode<SyntaxKind.BlockType | SyntaxKind.BlockTypeFunction>);
    }

    args(): PrimaryExpressionList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.PrimaryExpressionList), PrimaryExpressionList);
    }
}

export class BeginStatement extends AstNode<SyntaxKind.BeginStatement> {
    begin(): AstNode<SyntaxKind.Begin> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Begin), AstNode<SyntaxKind.Begin>);
    }

    block_type(): BlocktypeExpression | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.BlockTypeExpression), BlocktypeExpression);
    }

    body(): StatementList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.StatementList), StatementList);
    }

    end(): AstNode<SyntaxKind.End> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.End), AstNode<SyntaxKind.End>);
    }
}

export class ForeachStatement extends AstNode<SyntaxKind.ForeachStatement> {
    foreach(): AstNode<SyntaxKind.Foreach> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Foreach), AstNode<SyntaxKind.Foreach>);
    }

    identifier(): VariableOrVariableDeclaration | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsVariableOrVariableDeclaration), VariableOrVariableDeclaration);
    }

    larrow(): AstNode<SyntaxKind.LArrow> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.LArrow), AstNode<SyntaxKind.LArrow>);
    }

    iterable(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }

    body(): StatementList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.StatementList), StatementList);
    }

    loop(): AstNode<SyntaxKind.Loop> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Loop), AstNode<SyntaxKind.Loop>);
    }
}

export class Branch<T extends BranchKeywordSyntaxKind = BranchKeywordSyntaxKind> extends AstNode<SyntaxKind.Branch> {
    keyword(): AstNode<T> | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsBranchKeyword), AstNode<T>);
    }

    condition(): Expression | undefined {
        return NewIfDefined(this.green.get_child_by_predicate(IsExpression), Expression);
    }

    body(): StatementList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.StatementList), StatementList);
    }
}

export class WhileStatement extends AstNode<SyntaxKind.WhileStatement> {
    branch(): Branch<SyntaxKind.While> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Branch), Branch<SyntaxKind.While>);
    }

    loop(): AstNode<SyntaxKind.Loop> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Loop), AstNode<SyntaxKind.Loop>);
    }
}

export class BranchList extends AstNode<SyntaxKind.BranchList> {
    get_child(idx: number): Branch<SyntaxKind.If | SyntaxKind.Elseif> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Branch, idx), Branch<SyntaxKind.If | SyntaxKind.Elseif>);
    }
}

export class IfStatement extends AstNode<SyntaxKind.IfStatement> {
    branches(): BranchList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.BranchList), BranchList);
    }

    else(): AstNode<SyntaxKind.Else> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Else), AstNode<SyntaxKind.Else>);
    }

    else_statements(): StatementList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.StatementList), StatementList);
    }

    endif(): AstNode<SyntaxKind.Endif> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Endif), AstNode<SyntaxKind.Endif>);
    }
}

export class Script extends AstNode<SyntaxKind.Script> {
    scriptname(): AstNode<SyntaxKind.ScriptName> | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.ScriptName), AstNode<SyntaxKind.ScriptName>);
    }

    name(): Identifier | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.Identifier), Identifier);
    }

    body(): StatementList | undefined {
        return NewIfDefined(this.green.get_child(SyntaxKind.StatementList), StatementList);
    }
}

export interface ParsedFile {
    script: Node<SyntaxKind.Script>;

    diagnostics: Diagnostic[];
    semantic_tokens: AstNode[];
}

export interface FileAst {
    parsed: ParsedFile;
    environment: Environment;
}

export class Environment {
    map: { [key: string]: FileAst } = {};
    global_symbol_table: SymbolTable = {};

    async processDocument(doc: TextDocument): Promise<FileAst> {
        const ast: FileAst = {
            parsed: Parser.Parse(doc),
            environment: this,
        };

        // AST.BuildScriptSymbolTables(script);
        // await AST.ValidateScript(script);

        this.map[doc.uri] = ast;

        return ast;
    }
}

