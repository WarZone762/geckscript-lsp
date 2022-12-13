import { Diagnostic } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { GetFunctionInfo } from "./function_data";
import { Lexer } from "./lexer";
import { GetSyntaxKindName } from "./types/token_data";
import {
    SyntaxKind,
    TokenSyntaxKind,
    BranchKeywordSyntaxKind,
    NodeSyntaxKind,
    IsAdditiveOperator,
    IsAssignmentOperator,
    IsEqualityOperator,
    IsKeyword,
    IsMultiplicativeOperator,
    IsOperator,
    IsRelationalOperator,
    IsShiftOperator,
    IsSimpleAssignmentOperator,
    IsSliceMakePairOperator,
    IsTypename,
    IsUnaryOperator,
    IsVariableOrVariableDeclaration,
    Token,
    Node,
    NodeOrToken,
} from "./types/syntax_node";
import { ParsedFile } from "./types/ast_node";

let cur_lexer: Lexer;
let cur_doc: TextDocument;

let cur_token: Token;

const started_nodes: Node[] = [];
const started_node_children: NodeOrToken[][] = [];

const diagnostics: Diagnostic[] = [];

function lastNode(): Node {
    return started_nodes.at(-1)!;
}

function lastNodeChildren(): NodeOrToken[] {
    return started_node_children.at(-1)!;
}

function moreData(): boolean {
    return cur_token.kind !== SyntaxKind.EOF;
}

function skipToken(): void {
    lastNodeChildren().push(cur_token);
    if (moreData()) {
        cur_token = cur_lexer.lexToken();
    }
}

function parseTrivia(): void {
    while (
        cur_token.kind === SyntaxKind.Whitespace ||
        cur_token.kind === SyntaxKind.Comment
    ) {
        skipToken();
    }
}

function nextToken(): void {
    skipToken();

    parseTrivia();
}

function nextTokenExpectKind(kind: SyntaxKind): void {
    if (cur_token.kind !== kind) {
        parseErrorNode(`expected '${GetSyntaxKindName(kind)}', got '${GetSyntaxKindName(cur_token.kind)}'`);
    } else {
        nextToken();
    }
}

function nextTokenPredicate(predicate: (kind: SyntaxKind) => boolean): void {
    if (!predicate(cur_token.kind)) {
        reportParsingError(`unexpected token '${GetSyntaxKindName(cur_token.kind)}'`);
    } else {
        nextToken();
    }
}

function startNode(kind: NodeSyntaxKind): void {
    const node = new Node(kind);
    node.offset = cur_token.offset;

    started_nodes.push(node);
    started_node_children.push([]);
}

function finishNode(): void {
    for (const child of started_node_children.pop()!) {
        lastNode().children.push(child);
        child.parent = lastNode();
        lastNode().text_len += child.length();
    }

    lastNodeChildren().push(started_nodes.pop()!);
}

function reportParsingError(message: string): void {
    diagnostics.push({
        message: `Parsing error: ${message}`,
        range: {
            start: cur_doc.positionAt(cur_token.offset),
            end: cur_doc.positionAt(cur_token.end()),
        }
    });
}

function parseErrorNode(message: string): void {
    reportParsingError(message);
    startNode(SyntaxKind.ErrorNode);
    nextToken();
    finishNode();
}

function parseBinOpLeft(
    parse_child: () => void,
    predicate: (kind: SyntaxKind) => boolean,
): void {
    parse_child();

    while (predicate(cur_token.kind)) {
        const lhs = lastNodeChildren().pop()!;

        startNode(SyntaxKind.BinaryExpresison);

        lastNodeChildren().push(lhs);
        parseOperator();
        parse_child();

        finishNode();
    }
}

function parseNumber(): void {
    nextTokenExpectKind(SyntaxKind.Number);
}

function parseString(): void {
    nextTokenExpectKind(SyntaxKind.String);
}

function parseIdentifier(): void {
    nextTokenExpectKind(SyntaxKind.Identifier);
}

function parseTypename(): void {
    nextTokenPredicate(IsTypename);
}

function parseKeyword(): void {
    nextTokenPredicate(IsKeyword);
}

function parseOperator(): void {
    nextTokenPredicate(IsOperator);
}

function parseAssignmentOperator(): void {
    nextTokenPredicate(IsAssignmentOperator);
}

function parseVariableOrVariableDeclaration(): void {
    nextTokenPredicate(IsVariableOrVariableDeclaration);
}

function parseExpressionList(): void {
    startNode(SyntaxKind.ExpressionList);

    while (moreData() && cur_token.kind !== SyntaxKind.Newline) {
        if (IsOperator(cur_token.kind)) {
            if (cur_token.kind === SyntaxKind.Comma) {
                nextToken();
                continue;
            } else if (cur_token.kind !== SyntaxKind.LParen) {
                break;
            }
        }

        parseOr();
    }

    finishNode();
}

function parseFunction(): void {
    startNode(SyntaxKind.FunctionExpression);

    parseIdentifier();
    parseExpressionList();

    finishNode();
}

function parseVariableList(): void {
    startNode(SyntaxKind.VariableList);

    while (
        moreData() &&
        cur_token.kind !== SyntaxKind.RBracket &&  // TODO: come up with a better solution (keep track of the context?)
        cur_token.kind !== SyntaxKind.Newline
    ) {
        if (cur_token.kind === SyntaxKind.Comma) {
            nextToken();
        }

        parseVariableOrVariableDeclaration();
    }

    finishNode();
}

function parseLambdaInline(): void {
    startNode(SyntaxKind.LambdaInlineExpression);

    nextTokenExpectKind(SyntaxKind.LBracket);

    parseVariableList();

    nextTokenExpectKind(SyntaxKind.RBracket);
    nextTokenExpectKind(SyntaxKind.EqualsGreater);
    parseExpression();

    finishNode();
}

function parseLambda(): void {
    startNode(SyntaxKind.LambdaExpression);

    nextTokenExpectKind(SyntaxKind.Begin);
    nextTokenExpectKind(SyntaxKind.BlockTypeFunction);
    nextTokenExpectKind(SyntaxKind.LBracket);

    parseVariableList();

    nextTokenExpectKind(SyntaxKind.Newline);

    parseStatementList({ [SyntaxKind.End]: true });
    nextTokenExpectKind(SyntaxKind.End);

    finishNode();
}

function parsePrimaryExpression(): void {
    switch (cur_token.kind) {
        case SyntaxKind.String:
            parseString();
            break;

        case SyntaxKind.Number:
            parseNumber();
            break;

        case SyntaxKind.Identifier:
            if (GetFunctionInfo(cur_token.text.toLocaleLowerCase()) != undefined) {
                parseFunction();
            } else {
                parseIdentifier();
            }
            break;

        case SyntaxKind.LParen:
            nextToken();
            if (cur_token.kind as unknown === SyntaxKind.Begin) {
                parseLambda();
                nextTokenExpectKind(SyntaxKind.RParen);
            } else {
                // ++paren_level;

                parseExpression();
                nextTokenExpectKind(SyntaxKind.RParen);
            }
            break;

        case SyntaxKind.LBracket:
            parseLambdaInline();
            break;

        default:
            parseErrorNode(`expected string, number, identifier or parenthesis, got '${GetSyntaxKindName(cur_token.kind)}'`);
    }
}

function parseMemeber(): void {
    parsePrimaryExpression();

    while (
        cur_token.kind === SyntaxKind.LSQBracket ||
        cur_token.kind === SyntaxKind.RArrow ||
        cur_token.kind === SyntaxKind.Dot
    ) {
        const lhs = lastNodeChildren().pop()!;

        startNode(SyntaxKind.ElementAccessExpression);
        lastNodeChildren().push(lhs);

        switch (cur_token.kind) {
            case SyntaxKind.LSQBracket:
                nextTokenExpectKind(SyntaxKind.LSQBracket);
                parseExpression();
                nextTokenExpectKind(SyntaxKind.RSQBracket);
                break;

            case SyntaxKind.RArrow:
                nextTokenExpectKind(SyntaxKind.LArrow);

                parsePrimaryExpression();
                break;

            case SyntaxKind.Dot:
                nextTokenExpectKind(SyntaxKind.Dot);
                parseIdentifier();
                break;
        }

        finishNode();
    }
}

function parseLogicalNot(): void {
    if (cur_token.kind !== SyntaxKind.Exclamation) {
        parseMemeber();
        return;
    }

    startNode(SyntaxKind.UnaryExpression);

    parseOperator();
    parseLogicalNot();

    finishNode();
}

function parseUnary(): void {
    if (!IsUnaryOperator(cur_token.kind)) {
        parseLogicalNot();
        return;
    }

    startNode(SyntaxKind.UnaryExpression);

    parseOperator();
    parseUnary();

    finishNode();
}

function parseExponential(): void {
    parseBinOpLeft(
        parseUnary,
        kind => kind === SyntaxKind.Circumflex,
    );
}

function parseMultiplicative(): void {
    parseBinOpLeft(
        parseExponential,
        IsMultiplicativeOperator,
    );
}

function parseAdditive(): void {
    parseBinOpLeft(
        parseMultiplicative,
        IsAdditiveOperator,
    );
}

function parseShift(): void {
    parseBinOpLeft(
        parseAdditive,
        IsShiftOperator,
    );
}

function parseAnd(): void {
    parseBinOpLeft(
        parseShift,
        kind => kind === SyntaxKind.Ampersand,
    );
}

function parseOr(): void {
    parseBinOpLeft(
        parseAnd,
        kind => kind === SyntaxKind.VBar,
    );
}

function parseRelational(): void {
    parseBinOpLeft(
        parseOr,
        IsRelationalOperator,
    );
}

function parseEquality(): void {
    parseBinOpLeft(
        parseRelational,
        IsEqualityOperator,
    );
}

function parseSliceMakePair(): void {
    parseBinOpLeft(
        parseEquality,
        IsSliceMakePairOperator,
    );
}

function parseLogicalAnd(): void {
    parseBinOpLeft(
        parseSliceMakePair,
        kind => kind === SyntaxKind.DoubleAmpersand,
    );
}

function parseLogicalOr(): void {
    parseBinOpLeft(
        parseLogicalAnd,
        kind => kind === SyntaxKind.DoubleVBar,
    );
}

function parseAssignment(): void {
    parseLogicalOr();

    if (!IsSimpleAssignmentOperator(cur_token.kind)) {
        return;
    }

    const lhs = lastNodeChildren().pop()!;

    startNode(SyntaxKind.BinaryExpresison);

    lastNodeChildren().push(lhs);
    parseOperator();
    parseAssignment();

    finishNode();
}

function parseExpression(): void {
    parseAssignment();
}

function parseStatement(): void {
    switch (cur_token.kind) {
        case SyntaxKind.Set:
            parseSet();
            break;

        case SyntaxKind.Let:
            parseLet();
            break;

        case SyntaxKind.If:
            parseIfBlock();
            break;

        case SyntaxKind.While:
            parseWhileBlock();
            break;

        case SyntaxKind.Foreach:
            parseForeachBlock();
            break;

        case SyntaxKind.Newline:
            nextToken();
            return;

        case SyntaxKind.Begin:
            // report parsing error (nested begin blocks not allowed)

            parseBeginBlock();
            break;

        default:
            if (IsKeyword(cur_token.kind)) {
                if (
                    cur_token.kind === SyntaxKind.Continue ||
                    cur_token.kind === SyntaxKind.Break ||
                    cur_token.kind === SyntaxKind.Return
                ) {
                    parseKeyword();
                } else {
                    parseErrorNode("unexpected keyword");
                }
            } else if (IsTypename(cur_token.kind)) {
                parseVariableDeclarationStatement();
            } else {
                parseExpression();
            }
    }

    if (cur_token.kind !== SyntaxKind.EOF) {
        nextTokenExpectKind(SyntaxKind.Newline);
    }
}

function parseStatementList(terminator_tokens: { [key in SyntaxKind]?: boolean }): void {
    startNode(SyntaxKind.StatementList);

    while (moreData() && !(cur_token.kind in terminator_tokens)) {
        parseStatement();
    }

    finishNode();
}

function parseVariableDeclaration(): void {
    startNode(SyntaxKind.VariableDeclaration);

    parseTypename();
    parseIdentifier();

    finishNode();
}

function parseVariableDeclarationStatement(): void {
    startNode(SyntaxKind.VariableDeclarationStatement);

    parseVariableDeclaration();

    if (IsAssignmentOperator(cur_token.kind)) {
        parseOperator();
        parseExpression();
    }

    finishNode();
}

function parseSet(): void {
    startNode(SyntaxKind.SetStatement);

    nextTokenExpectKind(SyntaxKind.Set);
    parseIdentifier();
    nextTokenExpectKind(SyntaxKind.To);
    parseLogicalOr();

    finishNode();
}

function parseLet(): void {
    startNode(SyntaxKind.LetStatement);

    nextTokenExpectKind(SyntaxKind.Let);
    parseVariableOrVariableDeclaration();
    parseAssignmentOperator();
    parseExpression();

    finishNode();
}

function parsePrimaryExpressionList(): void {
    startNode(SyntaxKind.PrimaryExpressionList);

    while (
        moreData() &&
        cur_token.kind !== SyntaxKind.Newline &&
        (
            cur_token.kind === SyntaxKind.Identifier ||
            cur_token.kind === SyntaxKind.Number
        )
    ) {
        parsePrimaryExpression();
    }

    finishNode();
}

function parseBlockType(): void {
    startNode(SyntaxKind.BlockTypeExpression);

    nextTokenExpectKind(SyntaxKind.BlockType);
    parsePrimaryExpressionList();

    finishNode();
}

function parseBeginBlock(): void {
    startNode(SyntaxKind.BeginStatement);

    nextTokenExpectKind(SyntaxKind.Begin);
    parseBlockType();
    nextTokenExpectKind(SyntaxKind.Newline);

    parseStatementList({
        [SyntaxKind.End]: true,
    });

    nextTokenExpectKind(SyntaxKind.End);

    finishNode();
}

function parseForeachBlock(): void {
    startNode(SyntaxKind.ForeachStatement);

    nextTokenExpectKind(SyntaxKind.Foreach);
    parseVariableOrVariableDeclaration();
    nextTokenExpectKind(SyntaxKind.LArrow);
    parseExpression();
    nextTokenExpectKind(SyntaxKind.Newline);

    parseStatementList({
        [SyntaxKind.Loop]: true,
    });

    nextTokenExpectKind(SyntaxKind.Loop);

    finishNode();
}

function parseBranch(
    branch_keyword: BranchKeywordSyntaxKind,
    terminator_tokens: { [key in TokenSyntaxKind]?: boolean },
): void {
    startNode(SyntaxKind.Branch);

    nextTokenExpectKind(branch_keyword);
    parseExpression();
    nextTokenExpectKind(SyntaxKind.Newline);

    parseStatementList(terminator_tokens);

    finishNode();
}

function parseWhileBlock(): void {
    startNode(SyntaxKind.WhileStatement);

    parseBranch(SyntaxKind.While, {
        [SyntaxKind.Loop]: true
    });
    nextTokenExpectKind(SyntaxKind.Loop);

    finishNode();
}

function parseBranchList(): void {
    startNode(SyntaxKind.BranchList);

    parseBranch(SyntaxKind.If, {
        [SyntaxKind.Elseif]: true,
        [SyntaxKind.Else]: true,
        [SyntaxKind.Endif]: true,
    });

    while (cur_token.kind === SyntaxKind.Elseif) {
        parseBranch(SyntaxKind.Elseif, {
            [SyntaxKind.Elseif]: true,
            [SyntaxKind.Else]: true,
            [SyntaxKind.Endif]: true,
        });
    }

    finishNode();
}

function parseIfBlock(): void {
    startNode(SyntaxKind.IfStatement);

    parseBranchList();
    if (cur_token.kind === SyntaxKind.Else) {
        nextToken();
        nextTokenExpectKind(SyntaxKind.Newline);
        parseStatementList({
            [SyntaxKind.Endif]: true,
        });
    }

    nextTokenExpectKind(SyntaxKind.Endif);

    finishNode();
}

function parseScriptStatementList(): void {
    startNode(SyntaxKind.StatementList);

    while (moreData()) {
        switch (cur_token.kind) {
            case SyntaxKind.Set:
                parseSet();
                break;

            case SyntaxKind.Let:
                parseLet();
                break;

            case SyntaxKind.Begin:
                parseBeginBlock();
                break;

            case SyntaxKind.Newline:
                nextToken();
                continue;

            default:
                if (IsTypename(cur_token.kind)) {
                    parseVariableDeclarationStatement();
                } else {
                    parseErrorNode(`unexpected token '${GetSyntaxKindName(cur_token.kind)}'`);
                    continue;
                }
        }

        if (cur_token.kind as unknown !== SyntaxKind.EOF) {
            nextTokenExpectKind(SyntaxKind.Newline);
        }
    }

    finishNode();
}

function parseScript(): Node<SyntaxKind.Script> {
    started_nodes.push(new Node(SyntaxKind.ErrorNode));
    started_node_children.push([]);

    startNode(SyntaxKind.Script);

    parseTrivia();

    nextTokenExpectKind(SyntaxKind.ScriptName);
    parseIdentifier();
    nextTokenExpectKind(SyntaxKind.Newline);
    parseScriptStatementList();

    finishNode();

    const script = lastNodeChildren().pop()! as Node<SyntaxKind.Script>;

    started_node_children.pop();
    started_nodes.pop();

    return script;
}

export function Parse(doc: TextDocument): ParsedFile {
    cur_doc = doc;
    cur_lexer = new Lexer(doc.getText());

    cur_token = cur_lexer.lexToken();

    const script: ParsedFile = {
        script: parseScript(),
        diagnostics: diagnostics.slice(),
        semantic_tokens: [],
    };

    started_nodes.length = 0;
    started_node_children.length = 0;
    diagnostics.length = 0;

    return script;
}
