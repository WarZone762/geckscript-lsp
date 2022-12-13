export const enum SyntaxKind {
    UnknownToken,

    EOF,
    Whitespace,
    Newline,
    Comment,

    Number,
    String,
    Identifier,
    BlockType,
    BlockTypeFunction,

    // Typename
    Short,
    Int,
    Long,
    Float,
    Reference,
    StringVar,
    ArrayVar,

    // Keyword
    ScriptName,
    Begin,
    End,
    If,
    Elseif,
    Else,
    Endif,
    While,
    Foreach,
    Loop,
    Continue,
    Break,
    Return,
    Set,
    To,
    Let,

    // Operator
    Equals,            // assignment, simple assignment
    ColonEquals,       // assignment last
    PlusEquals,
    MinusEquals,
    AsteriskEquals,
    SlashEquals,
    PercentEquals,
    CircumflexEquals,
    VBarEquals,
    AmpersandEquals,   // assignment last
    Exclamation,
    Circumflex,
    Plus,              // additive
    Minus,             // additive last, unary
    Dollar,
    Hash,
    Ampersand,
    Asterisk,          // unary last, multiplicative
    Slash,
    Percent,           // multiplicative last
    DoubleLess,        // shift
    DoubleGreater,     // shift last
    VBar,
    Greater,           // relational
    Less,
    GreaterEqulas,
    LessEqulas,        // relational last
    DoubleEquals,      // equality
    ExclamationEquals, // equality last
    Colon,             // slice and make pair
    DoubleColon,       // slice and make pair last
    DoubleAmpersand,
    DoubleVBar,
    LParen,
    RParen,
    LSQBracket,
    RSQBracket,
    LBracket,
    RBracket,
    LArrow,
    RArrow,
    Dot,
    Comma,
    EqualsGreater,

    ErrorNode,
    VariableDeclaration,

    // Lists
    VariableList,
    PrimaryExpressionList,
    ExpressionList,
    BranchList,
    StatementList,

    // Expression
    LambdaExpression,
    LambdaInlineExpression,
    UnaryExpression,
    BinaryExpresison,
    ElementAccessExpression,
    FunctionExpression,

    BlockTypeExpression,
    Branch,

    // Statement
    VariableDeclarationStatement,
    SetStatement,
    LetStatement,
    BeginStatement,
    IfStatement,
    WhileStatement,
    ForeachStatement,

    Script,

    // Markers
    TYPENAME_FIRST = Short,
    TYPENAME_LAST = ArrayVar,

    KEYWORD_FIRST = ScriptName,
    KEYWORD_LAST = Let,

    OPERATOR_FIRST = Equals,
    OPERATOR_LAST = EqualsGreater,

    UNARY_OPERATOR_FIRST = Minus,
    UNARY_OPERATOR_LAST = Asterisk,

    MULTIPLICATIVE_OPERATOR_FIRST = Asterisk,
    MULTIPLICATIVE_OPERATOR_LAST = Percent,

    ADDITIVE_OPERATOR_FIRST = Plus,
    ADDITIVE_OPERATOR_LAST = Minus,

    SHIFT_OPERATOR_FIRST = DoubleLess,
    SHIFT_OPERATOR_LAST = DoubleGreater,

    RELATIONAL_OPERATOR_FIRST = Greater,
    RELATIONAL_OPERATOR_LAST = LessEqulas,

    EQUALITY_OPERATOR_FIRST = DoubleEquals,
    EQUALITY_OPERATOR_LAST = ExclamationEquals,

    SLICE_MAKE_PAIR_OPERATOR_FIRST = Colon,
    SLICE_MAKE_PAIR_OPERATOR_LAST = DoubleColon,

    ASSIGNMENT_OPERATOR_FIRST = Equals,
    ASSIGNMENT_OPERATOR_LAST = AmpersandEquals,

    SIMPLE_ASSIGNMENT_OPERATOR_FIRST = Equals,
    SIMPLE_ASSIGNMENT_OPERATOR_LAST = ColonEquals,
}

export type TypenameSyntaxKind =
    | SyntaxKind.Short
    | SyntaxKind.Int
    | SyntaxKind.Long
    | SyntaxKind.Float
    | SyntaxKind.Reference
    | SyntaxKind.StringVar
    | SyntaxKind.ArrayVar
    ;

export type KeywordSynaxKind =
    | SyntaxKind.ScriptName
    | SyntaxKind.Begin
    | SyntaxKind.End
    | SyntaxKind.If
    | SyntaxKind.Elseif
    | SyntaxKind.Else
    | SyntaxKind.Endif
    | SyntaxKind.While
    | SyntaxKind.Foreach
    | SyntaxKind.Loop
    | SyntaxKind.Continue
    | SyntaxKind.Break
    | SyntaxKind.Return
    | SyntaxKind.Set
    | SyntaxKind.To
    | SyntaxKind.Let
    ;

export type BranchKeywordSyntaxKind = SyntaxKind.While | SyntaxKind.If | SyntaxKind.Elseif;

export type AssignmentOperatorSyntaxKind =
    | SyntaxKind.Equals
    | SyntaxKind.ColonEquals
    | SyntaxKind.PlusEquals
    | SyntaxKind.MinusEquals
    | SyntaxKind.AsteriskEquals
    | SyntaxKind.SlashEquals
    | SyntaxKind.PercentEquals
    | SyntaxKind.CircumflexEquals
    | SyntaxKind.VBarEquals
    | SyntaxKind.AmpersandEquals
    ;


export type OperatorSyntaxKind =
    | AssignmentOperatorSyntaxKind
    | SyntaxKind.Exclamation
    | SyntaxKind.DoubleVBar
    | SyntaxKind.DoubleAmpersand
    | SyntaxKind.DoubleEquals
    | SyntaxKind.ExclamationEquals
    | SyntaxKind.Greater
    | SyntaxKind.Less
    | SyntaxKind.GreaterEqulas
    | SyntaxKind.LessEqulas
    | SyntaxKind.Plus
    | SyntaxKind.Minus
    | SyntaxKind.Asterisk
    | SyntaxKind.Slash
    | SyntaxKind.Percent
    | SyntaxKind.Circumflex
    | SyntaxKind.VBar
    | SyntaxKind.Ampersand
    | SyntaxKind.DoubleLess
    | SyntaxKind.DoubleGreater
    | SyntaxKind.Dollar
    | SyntaxKind.Hash
    | SyntaxKind.LParen
    | SyntaxKind.RParen
    | SyntaxKind.LSQBracket
    | SyntaxKind.RSQBracket
    | SyntaxKind.LBracket
    | SyntaxKind.RBracket
    | SyntaxKind.Colon
    | SyntaxKind.LArrow
    | SyntaxKind.RArrow
    | SyntaxKind.Dot
    | SyntaxKind.DoubleColon
    | SyntaxKind.Comma
    | SyntaxKind.EqualsGreater
    ;

export type TokenSyntaxKind =
    | SyntaxKind.UnknownToken
    | SyntaxKind.EOF
    | SyntaxKind.Whitespace
    | SyntaxKind.Newline
    | SyntaxKind.Comment
    | SyntaxKind.Number
    | SyntaxKind.String
    | SyntaxKind.Identifier
    | OperatorSyntaxKind
    | TypenameSyntaxKind
    | KeywordSynaxKind
    | BranchKeywordSyntaxKind
    | SyntaxKind.BlockTypeFunction
    | SyntaxKind.BlockType
    ;

export type VariableOrVariableDeclarationSyntaxKind = SyntaxKind.Identifier | SyntaxKind.VariableDeclaration;

export type PrimaryExpressionSyntaxKind =
    | SyntaxKind.ErrorNode
    | SyntaxKind.String
    | SyntaxKind.Number
    | SyntaxKind.Identifier
    | SyntaxKind.FunctionExpression
    | SyntaxKind.LambdaExpression
    | SyntaxKind.LambdaInlineExpression
    ;

export type ExpressionSyntaxKind =
    | PrimaryExpressionSyntaxKind
    | SyntaxKind.BinaryExpresison
    | SyntaxKind.UnaryExpression
    | SyntaxKind.ElementAccessExpression
    ;

export type StatementSyntaxKind =
    | KeywordSynaxKind
    | SyntaxKind.VariableDeclarationStatement
    | SyntaxKind.SetStatement
    | SyntaxKind.LetStatement
    | SyntaxKind.StatementList
    | SyntaxKind.BeginStatement
    | SyntaxKind.ForeachStatement
    | SyntaxKind.WhileStatement
    | SyntaxKind.IfStatement
    | ExpressionSyntaxKind
    ;

export type NodeSyntaxKind = Exclude<SyntaxKind, TokenSyntaxKind>;

export function IsTypename(kind: SyntaxKind): kind is TypenameSyntaxKind {
    return SyntaxKind.TYPENAME_FIRST <= kind && kind <= SyntaxKind.TYPENAME_LAST;
}

export function IsKeyword(kind: SyntaxKind): kind is KeywordSynaxKind {
    return SyntaxKind.KEYWORD_FIRST <= kind && kind <= SyntaxKind.KEYWORD_LAST;
}

export function IsOperator(kind: SyntaxKind): kind is OperatorSyntaxKind {
    return SyntaxKind.OPERATOR_FIRST <= kind && kind <= SyntaxKind.OPERATOR_LAST;
}

export function IsUnaryOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.UNARY_OPERATOR_FIRST <= kind && kind <= SyntaxKind.UNARY_OPERATOR_LAST;
}

export function IsMultiplicativeOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.MULTIPLICATIVE_OPERATOR_FIRST <= kind && kind <= SyntaxKind.MULTIPLICATIVE_OPERATOR_LAST;
}

export function IsAdditiveOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.ADDITIVE_OPERATOR_FIRST <= kind && kind <= SyntaxKind.ADDITIVE_OPERATOR_LAST;
}

export function IsShiftOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.SHIFT_OPERATOR_FIRST <= kind && kind <= SyntaxKind.SHIFT_OPERATOR_LAST;
}

export function IsRelationalOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.RELATIONAL_OPERATOR_FIRST <= kind && kind <= SyntaxKind.RELATIONAL_OPERATOR_LAST;
}

export function IsEqualityOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.EQUALITY_OPERATOR_FIRST <= kind && kind <= SyntaxKind.EQUALITY_OPERATOR_LAST;
}

export function IsSliceMakePairOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.SLICE_MAKE_PAIR_OPERATOR_FIRST <= kind && kind <= SyntaxKind.SLICE_MAKE_PAIR_OPERATOR_LAST;
}

export function IsAssignmentOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.ASSIGNMENT_OPERATOR_FIRST <= kind && kind <= SyntaxKind.ASSIGNMENT_OPERATOR_LAST;
}

export function IsSimpleAssignmentOperator(kind: SyntaxKind): boolean {
    return SyntaxKind.SIMPLE_ASSIGNMENT_OPERATOR_FIRST <= kind && kind <= SyntaxKind.SIMPLE_ASSIGNMENT_OPERATOR_LAST;
}

export function IsBranchKeyword(kind: SyntaxKind): kind is BranchKeywordSyntaxKind {
    return (
        kind === SyntaxKind.While ||
        kind === SyntaxKind.If ||
        kind === SyntaxKind.Elseif
    );
}

export function IsVariableOrVariableDeclaration(kind: SyntaxKind): kind is VariableOrVariableDeclarationSyntaxKind {
    return kind === SyntaxKind.Identifier || kind === SyntaxKind.VariableDeclaration;
}

export function IsPrimaryExpression(kind: SyntaxKind): kind is PrimaryExpressionSyntaxKind {
    return (
        kind === SyntaxKind.ErrorNode ||
        kind === SyntaxKind.String ||
        kind === SyntaxKind.Number ||
        kind === SyntaxKind.Identifier ||
        kind === SyntaxKind.FunctionExpression ||
        kind === SyntaxKind.LambdaExpression ||
        kind === SyntaxKind.LambdaInlineExpression
    );
}

export function IsExpression(kind: SyntaxKind): kind is ExpressionSyntaxKind {
    return (
        IsPrimaryExpression(kind) ||
        kind === SyntaxKind.UnaryExpression ||
        kind === SyntaxKind.BinaryExpresison ||
        kind === SyntaxKind.ElementAccessExpression
    );
}

export function IsStatement(kind: SyntaxKind): kind is StatementSyntaxKind {
    return (
        IsKeyword(kind) ||
        kind === SyntaxKind.VariableDeclarationStatement ||
        kind === SyntaxKind.SetStatement ||
        kind === SyntaxKind.LetStatement ||
        kind === SyntaxKind.StatementList ||
        kind === SyntaxKind.BeginStatement ||
        kind === SyntaxKind.ForeachStatement ||
        kind === SyntaxKind.WhileStatement ||
        kind === SyntaxKind.IfStatement ||
        IsExpression(kind)
    );
}

export interface INodeCommon<T extends SyntaxKind> {
    kind: T;
    offset: number;
    parent?: Node;

    isNode(): this is Node;
    length(): number;
    end(): number;
}

export interface IToken<T extends TokenSyntaxKind> extends INodeCommon<T> {
    text: string;
}

export interface INode<T extends NodeSyntaxKind> extends INodeCommon<T> {
    text_len: number;
    children: NodeOrToken[];

    get_child<T extends SyntaxKind>(kind: T, idx: number): ChooseNodeOrToken<T> | undefined;
    get_child_by_predicate<T extends SyntaxKind>(predicate: (kind: SyntaxKind) => kind is T, idx: number): ChooseNodeOrToken<T> | undefined;
}

export abstract class NodeCommon<T extends SyntaxKind> implements INodeCommon<T> {
    kind: T;
    offset = 0;
    parent?: Node;

    constructor(kind: T) {
        this.kind = kind;
    }

    abstract isNode(): this is Node;
    abstract length(): number;
    abstract end(): number;
}

export class Token<T extends TokenSyntaxKind = TokenSyntaxKind> extends NodeCommon<T> implements IToken<T> {
    text = "";

    isNode(): this is Node {
        return false;
    }

    length(): number {
        return this.text.length;
    }

    end(): number {
        return this.offset + this.text.length;
    }
}

export class Node<T extends NodeSyntaxKind = NodeSyntaxKind> extends NodeCommon<T> implements INode<T> {
    text_len = 0;
    children: NodeOrToken[] = [];

    isNode(): this is Node {
        return true;
    }

    length(): number {
        return this.text_len;
    }

    end(): number {
        return this.offset + this.text_len;
    }

    get_child<T extends SyntaxKind>(kind: T, idx = 0): ChooseNodeOrToken<T> | undefined {
        for (const child of this.children) {
            if (child.kind === kind) {
                if (idx > 0) {
                    idx -= 1;
                } else {
                    return child as ChooseNodeOrToken<T>;
                }
            }
        }

        return undefined;
    }

    get_child_by_predicate<T extends SyntaxKind>(predicate: (kind: SyntaxKind) => kind is T, idx = 0): ChooseNodeOrToken<T> | undefined {
        for (const child of this.children) {
            if (predicate(child.kind)) {
                if (idx > 0) {
                    idx -= 1;
                } else {
                    return child as ChooseNodeOrToken<T>;
                }
            }
        }
    }
}

export type NodeOrToken = Node | Token;

export type ChooseNodeOrToken<T extends SyntaxKind = SyntaxKind> =
    T extends TokenSyntaxKind ? Token<T> :
    T extends NodeSyntaxKind ? Node<T> : Node | Token;
