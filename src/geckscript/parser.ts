import { Range } from "vscode-languageserver-textdocument";
import { Lexer } from "./lexer";
import { TokenData, TokenSyntaxTypeMap } from "./token_data";

import {
  SyntaxType,
  TreeData,
  Node,
  Token,
  NumberNode,
  StringNode,
  BeginBlockNode,
  BinOpNode,
  BinOpPairedNode,
  BranchNode,
  CommentNode,
  CompoundStatementNode,
  ExpressionNode,
  ForeachBlockNode,
  FunctionNode,
  IfBlockNode,
  LambdaInlineNode,
  LambdaNode,
  LetNode,
  ScriptNode,
  SetNode,
  StatementNode,
  UnaryOpNode,
  VariableDeclarationNode,
  WhileBlockNode,
  BlockTypeNode,
  Typename,
  Keyword,
  Operator,
  IsTypename,
  IsKeyword,
  IsOperator,
} from "./types";


export class Parser {
  lexer: Lexer;

  cur_pos = 0;

  cur_token: Token;
  last_token: Token;

  paren_level = 0;

  script: ScriptNode;

  constructor(text: string) {
    this.lexer = new Lexer(text);

    this.cur_token = this.lexer.lexToken();
    this.last_token = this.cur_token;

    this.script = new ScriptNode();
  }

  moreData(): boolean {
    return this.cur_token.type !== SyntaxType.EOF;
  }

  isTypename(): boolean { return IsTypename(this.cur_token.type); }
  isKeyword(): boolean { return IsKeyword(this.cur_token.type); }
  isOperator(): boolean { return IsOperator(this.cur_token.type); }

  _skipToken(): void {
    if (this.moreData()) {
      this.last_token = this.cur_token;
      this.cur_token = this.lexer.lexToken();
    }
  }

  skipToken(): void {
    this._skipToken();

    while (this.cur_token.type === SyntaxType.Comment) this.parseComment();

    if (this.paren_level > 0) {
      while (this.cur_token.type === SyntaxType.Newline) this.skipToken();
    }
  }

  nextToken<T extends SyntaxType>(): Token<T> {
    const token = this.cur_token;

    this.skipToken();

    return token as Token<T>;
  }

  nextTokenExpectTypename(): Token<Typename> {
    const token = this.cur_token;

    if (!this.isTypename()) this.reportParsingError("expected a typename");

    this.skipToken();

    return token as Token<Typename>;
  }

  nextTokenExpectKeyword(): Token<Keyword> {
    const token = this.cur_token;

    if (!this.isKeyword()) this.reportParsingError("expected a keyword");

    this.skipToken();

    return token as Token<Keyword>;
  }

  nextTokenExpectOperator(): Token<Operator> {
    const token = this.cur_token;

    if (!this.isOperator()) this.reportParsingError("expected an operator");

    this.skipToken();

    return token as Token<Operator>;
  }

  nextTokenExpectType<T extends SyntaxType>(type: T): Token<T> {
    const token = this.cur_token;

    let skip_token = true;

    if (type === SyntaxType.RParen)
      --this.paren_level;

    if (token.type !== type) {
      this.reportParsingError(`expected "${TokenSyntaxTypeMap.All[type]}", got "${TokenSyntaxTypeMap.All[token.type]}"`);
      skip_token = this.cur_token.type !== SyntaxType.Newline;
    }

    if (skip_token)
      this.skipToken();

    return token as Token<T>;
  }

  createMissingNode<T extends Node>(node: T): T {
    node.range = {
      start: this.cur_token.range.start,
      end: this.cur_token.range.start
    };
    if (
      this.cur_token.type !== SyntaxType.EOF &&
      this.cur_token.type !== SyntaxType.Newline &&
      this.cur_token.type !== SyntaxType.RParen
    )
      this.skipToken();

    return node;
  }

  reportParsingError(message: string, range?: Range): void {
    this.script.diagnostics.push({
      message: `Parsing error: ${message}`,
      range: range ?? this.cur_token.range,
    });
  }

  parseNode<T extends Node>(node: T, parse_function: (node: T) => void): T {
    node.range = {
      start: this.cur_token.range.start,
      end: this.cur_token.range.start,
    };
    parse_function(node);
    node.range.end = this.last_token.range.end;

    return node;
  }

  parseBinOpRight(
    parse_child: () => ExpressionNode,
    valid_tokens: { [key in SyntaxType]?: boolean }
  ): ExpressionNode {
    let lhs = parse_child();

    if (this.cur_token.type in valid_tokens) {
      let last_node = this.parseNode(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op = this.nextToken();
        node.rhs = parse_child();
      });

      lhs = last_node;

      while (this.cur_token.type in valid_tokens) {
        const node = this.parseNode(new BinOpNode(), node => {
          node.lhs = last_node.rhs;
          node.op = this.nextTokenExpectOperator();
          node.rhs = parse_child();
        });

        last_node.rhs = node;
        last_node = node;
      }
    }

    return lhs;
  }

  parseBinOpLeft(
    parse_child: () => ExpressionNode,
    valid_tokens: { [key in SyntaxType]?: boolean }
  ): ExpressionNode {
    let lhs = parse_child();

    while (this.cur_token.type in valid_tokens) {
      lhs = this.parseNode(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op = this.nextTokenExpectOperator();
        node.rhs = parse_child();
      });
    }

    return lhs;
  }

  parseComment(): void {
    const node = this.parseNode(new CommentNode(), node => {
      node.content = this.cur_token.content;
      node.value = node.content.substring(1);
      this._skipToken();
    });

    this.script.comments[node.range.start.line] = node;
  }

  parseNumber(): NumberNode {
    return this.parseNode(new NumberNode(), node => {
      node.content = this.nextTokenExpectType(SyntaxType.Number).content;
      if (node.content[0] === "0" && node.content[1]?.toLowerCase() === "x") {
        node.value = parseInt(node.content, 16);
      } else {
        node.value = parseFloat(node.content);
      }

      return node;
    });
  }

  parseString(): StringNode {
    return this.parseNode(new StringNode(), node => {
      node.content = this.nextTokenExpectType(SyntaxType.String).content;
      node.value = node.content.substring(1, node.content.length - 1);
    });
  }

  parseIdentifier(): Token<SyntaxType.Identifier> {
    return this.nextTokenExpectType(SyntaxType.Identifier);
  }

  parseKeyword(): Token<Keyword> {
    return this.nextTokenExpectKeyword();
  }

  parseFunction(): FunctionNode {
    return this.parseNode(new FunctionNode(), node => {
      node.name = this.nextTokenExpectType(SyntaxType.Identifier)!;

      while (this.moreData() && this.cur_token.type !== SyntaxType.Newline) {
        if (this.isOperator()) {
          if (this.cur_token.type === SyntaxType.Comma) {
            this.skipToken();
            continue;
          } else if (this.cur_token.type !== SyntaxType.LParen) {
            break;
          }
        }

        const arg = this.parseSliceMakePair();
        node.args.push(arg);
      }
    });
  }

  parseLambdaInline(): LambdaInlineNode {
    return this.parseNode(new LambdaInlineNode(), node => {
      node.lbracket = this.nextTokenExpectType(SyntaxType.LBracket);

      while (
        this.moreData() && this.cur_token.type !== SyntaxType.RBracket
      ) {
        if (this.isTypename())
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectType(SyntaxType.RBracket);
      node.arrow = this.nextTokenExpectType(SyntaxType.EqualsGreater);
      node.expression = this.parseExpression();
    });
  }

  parseLambda(): LambdaNode {
    return this.parseNode(new LambdaNode(), node => {
      node.begin = this.nextTokenExpectType(SyntaxType.Begin);
      node.function = this.nextTokenExpectType(SyntaxType.BlocktypeTokenFunction);
      node.lbracket = this.nextTokenExpectType(SyntaxType.LBracket);

      while (
        this.moreData() &&
        this.cur_token.type !== SyntaxType.RBracket
      ) {
        if (this.isTypename())
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectType(SyntaxType.RBracket);
      this.nextTokenExpectType(SyntaxType.Newline);
      node.compound_statement = this.parseCompoundStatement({
        [SyntaxType.End]: true
      });
      node.end = this.nextTokenExpectType(SyntaxType.End);
    });
  }

  parsePrimaryExpression(): ExpressionNode {
    if (this.cur_token.type === SyntaxType.String) {
      return this.parseString();
    } else if (this.cur_token.type === SyntaxType.Number) {
      return this.parseNumber();
    } else if (this.cur_token.type === SyntaxType.Identifier) {
      if (this.cur_token.content.toLowerCase() in TokenData.Functions)
        return this.parseFunction();
      else
        return this.parseIdentifier();
    } else if (this.cur_token.type === SyntaxType.LParen) {
      this.skipToken();
      if (this.cur_token.type as unknown === SyntaxType.Begin) {
        return this.parseNode(this.parseLambda(), node => {
          this.nextTokenExpectType(SyntaxType.RParen);
        });
      } else {
        ++this.paren_level;

        return this.parseNode(this.parseExpression(), node => {
          this.nextTokenExpectType(SyntaxType.RParen);
        });
      }
    } else if (this.cur_token.type === SyntaxType.LBracket) {
      return this.parseLambdaInline();
    } else {
      this.reportParsingError("expected expression");

      return this.createMissingNode(new ExpressionNode());
    }
  }

  parseMemeberSquareBrackets(lhs: ExpressionNode): ExpressionNode {
    return this.parseMember(this.parseNode(new BinOpPairedNode(), node => {
      node.lhs = lhs;
      node.left_op = this.nextTokenExpectType(SyntaxType.LSQBracket);
      node.rhs = this.parseExpression();
      node.right_op = this.nextTokenExpectType(SyntaxType.RSQBracket);
    }));
  }

  parseMemberRArrow(lhs: ExpressionNode): ExpressionNode {
    return this.parseMember(this.parseNode(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op = this.nextTokenExpectType(SyntaxType.LArrow);

      if (
        this.cur_token.type !== SyntaxType.String &&
        this.cur_token.type !== SyntaxType.Number &&
        this.cur_token.type !== SyntaxType.Identifier
      ) {
        node.rhs = this.createMissingNode(new ExpressionNode());
      } else {
        node.rhs = this.parsePrimaryExpression();
      }
    }));
  }

  parseMemberDot(lhs: ExpressionNode): ExpressionNode {
    return this.parseMember(this.parseNode(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op = this.nextTokenExpectType(SyntaxType.Dot);

      if (this.cur_token.type !== SyntaxType.Identifier) {
        node.rhs = this.createMissingNode(new ExpressionNode());
      } else {
        node.rhs = this.parsePrimaryExpression();
      }
    }));
  }

  parseMember(lhs?: ExpressionNode): ExpressionNode {
    lhs = lhs ?? this.parsePrimaryExpression();

    if (this.isOperator()) return lhs;

    const subtype = this.cur_token.type;

    if (subtype === SyntaxType.LSQBracket) {
      return this.parseMemeberSquareBrackets(lhs);
    } else if (subtype === SyntaxType.RArrow) {
      return this.parseMemberRArrow(lhs);
    } else if (subtype === SyntaxType.Dot) {
      return this.parseMemberDot(lhs);
    } else {
      return lhs;
    }
  }

  parseLogicalNot(): ExpressionNode {
    if (this.cur_token.type !== SyntaxType.Exclamation)
      return this.parseMember();

    return this.parseNode(new UnaryOpNode(), node => {
      node.op = this.nextTokenExpectOperator();
      node.operand = this.parseLogicalNot();
    });
  }

  parseUnary(): ExpressionNode {
    if (this.isOperator()) return this.parseLogicalNot();

    const subtype = this.cur_token.type;
    if (
      subtype !== SyntaxType.Minus &&
      subtype !== SyntaxType.Dollar &&
      subtype !== SyntaxType.Hash &&
      subtype !== SyntaxType.Asterisk &&
      subtype !== SyntaxType.Ampersand
    ) return this.parseLogicalNot();

    return this.parseNode(new UnaryOpNode(), node => {
      node.op = this.nextTokenExpectOperator();
      node.operand = this.parseUnary();
    });
  }

  parseExponential(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseUnary(),
      { [SyntaxType.Circumflex]: true }
    );
  }

  parseMultiplicative(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseExponential(),
      {
        [SyntaxType.Asterisk]: true,
        [SyntaxType.Slash]: true,
        [SyntaxType.Percent]: true,
      }
    );
  }

  parseAdditive(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseMultiplicative(),
      {
        [SyntaxType.Plus]: true,
        [SyntaxType.Minus]: true,
      }
    );
  }

  parseShift(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseAdditive(),
      {
        [SyntaxType.DoubleLess]: true,
        [SyntaxType.DoubleGreater]: true,
      }
    );
  }

  parseAnd(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseShift(),
      { [SyntaxType.Ampersand]: true }
    );
  }

  parseOr(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseAnd(),
      { [SyntaxType.VBar]: true }
    );
  }

  parseRelational(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseOr(),
      {
        [SyntaxType.Greater]: true,
        [SyntaxType.GreaterEqulas]: true,
        [SyntaxType.Less]: true,
        [SyntaxType.LessEqulas]: true,
      }
    );
  }

  parseEquality(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseRelational(),
      {
        [SyntaxType.DoubleEquals]: true,
        [SyntaxType.ExclamationEquals]: true,
      }
    );
  }

  parseSliceMakePair(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseEquality(),
      {
        [SyntaxType.Colon]: true,
        [SyntaxType.DoubleColon]: true,
      }
    );
  }

  parseLogicalAndCompoundAssignment(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseSliceMakePair(),
      {
        [SyntaxType.DoubleAmpersand]: true,
        [SyntaxType.PlusEquals]: true,
        [SyntaxType.MinusEquals]: true,
        [SyntaxType.AsteriskEquals]: true,
        [SyntaxType.SlashEquals]: true,
        [SyntaxType.CircumflexEquals]: true,
        [SyntaxType.VBarEquals]: true,
        [SyntaxType.AmpersandEquals]: true,
        [SyntaxType.PercentEquals]: true,
      }
    );
  }

  parseLogicalOr(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseLogicalAndCompoundAssignment(),
      { [SyntaxType.DoubleVBar]: true }
    );
  }

  parseAssignment(): ExpressionNode {
    return this.parseBinOpRight(
      () => this.parseLogicalOr(),
      {
        [SyntaxType.Equals]: true,
        [SyntaxType.ColonEquals]: true
      }
    );
  }

  parseExpression(): ExpressionNode {
    return this.parseAssignment();
  }

  parseVariableDeclaration(): VariableDeclarationNode {
    return this.parseNode(new VariableDeclarationNode(), node => {
      node.variable_type = this.nextTokenExpectTypename();
      node.value = this.parseAssignment();
    });
  }

  parseSet(): SetNode {
    return this.parseNode(new SetNode(), node => {
      node.set = this.nextTokenExpectType(SyntaxType.Set);
      node.identifier = this.parseIdentifier();
      node.to = this.nextTokenExpectType(SyntaxType.To);
      node.value = this.parseLogicalOr();
    });
  }

  parseLet(): LetNode {
    return this.parseNode(new LetNode(), node => {
      node.let = this.nextTokenExpectType(SyntaxType.Let);
      node.value = this.isTypename() ?
        this.parseVariableDeclaration() :
        this.parseExpression();
    });
  }

  parseStatement(): StatementNode {
    let node: StatementNode;

    const type = this.cur_token.type;

    if (type === SyntaxType.Set) {
      node = this.parseSet();
    } else if (type === SyntaxType.Let) {
      node = this.parseLet();
    } else if (type === SyntaxType.If) {
      node = this.parseIfBlock();
    } else if (type === SyntaxType.While) {
      node = this.parseWhileBlock();
    } else if (type === SyntaxType.Foreach) {
      node = this.parseForeachBlock();
    } else if (this.isTypename()) {
      node = this.parseVariableDeclaration();
    } else if (this.isKeyword()) {
      node = this.parseKeyword();
    } else if (type === SyntaxType.Newline) {
      this.skipToken();
      return this.parseStatement();
    } else if (type === SyntaxType.Begin) {
      node = this.parseBeginBlock();

      this.reportParsingError(
        "nested begin blocks not allowed",
        node.range
      );

      node.type = SyntaxType.Unknown;
    } else {
      node = this.parseExpression();
    }

    if (this.cur_token.type !== SyntaxType.EOF) {
      this.nextTokenExpectType(SyntaxType.Newline);
    }

    return node;
  }

  parseCompoundStatement(terminator_tokens: { [key in SyntaxType]?: boolean }): CompoundStatementNode {
    return this.parseNode(new CompoundStatementNode(), node => {
      while (this.moreData() && !(this.cur_token.type in terminator_tokens)) {
        const statement = this.parseStatement();

        if (statement.type !== SyntaxType.Unknown)
          node.children.push(statement);
      }
    });
  }

  parseBlockType(): BlockTypeNode {
    return this.parseNode(new BlockTypeNode(), node => {
      node.block_type = this.nextTokenExpectType(SyntaxType.BlocktypeToken);

      while (
        this.moreData() &&
        this.cur_token.type !== SyntaxType.Newline &&
        (
          this.cur_token.type === SyntaxType.Identifier ||
          this.cur_token.type === SyntaxType.Number
        )
      ) {
        const arg = this.parsePrimaryExpression();

        node.args.push(arg);
      }
    });
  }

  parseBeginBlock(): BeginBlockNode {
    return this.parseNode(new BeginBlockNode(), node => {
      node.begin = this.nextTokenExpectType(SyntaxType.Begin);
      node.block_type = this.parseBlockType();
      this.nextTokenExpectType(SyntaxType.Newline);

      node.compound_statement = this.parseCompoundStatement({
        [SyntaxType.End]: true
      });

      node.end = this.nextTokenExpectType(SyntaxType.End);
    });
  }

  parseForeachBlock(): ForeachBlockNode {
    return this.parseNode(new ForeachBlockNode(), node => {
      node.foreach = this.nextTokenExpectType(SyntaxType.Foreach);

      node.idetifier = this.isTypename() ?
        this.parseVariableDeclaration() :
        this.parseIdentifier();

      node.larrow = this.nextTokenExpectType(SyntaxType.LArrow);
      node.iterable = this.parseExpression();
      this.nextTokenExpectType(SyntaxType.Newline);

      node.statements = this.parseCompoundStatement({
        [SyntaxType.Loop]: true
      });

      node.loop = this.nextTokenExpectType(SyntaxType.Loop);
    });
  }

  parseBranch<T extends Keyword>(
    branch_keyword: T,
    terminator_tokens: { [key in SyntaxType]?: boolean }
  ): BranchNode<T> {
    return this.parseNode(new BranchNode(), node => {
      node.keyword = this.nextTokenExpectType(branch_keyword);
      node.condition = this.parseExpression();
      this.nextTokenExpectType(SyntaxType.Newline);

      node.statements = this.parseCompoundStatement(terminator_tokens);
    });
  }

  parseWhileBlock(): WhileBlockNode {
    return this.parseNode(new WhileBlockNode(), node => {
      node.branch = this.parseBranch(SyntaxType.While, {
        [SyntaxType.Loop]: true
      });

      node.loop = this.nextTokenExpectType(SyntaxType.Loop);
    });
  }

  parseIfBlock(): IfBlockNode {
    return this.parseNode(new IfBlockNode(), node => {
      node.branches[0] = this.parseBranch(SyntaxType.If, {
        [SyntaxType.Elseif]: true,
        [SyntaxType.Else]: true,
        [SyntaxType.Endif]: true,
      });

      while (this.cur_token.type === SyntaxType.Elseif) {
        node.branches.push(this.parseBranch(SyntaxType.Elseif, {
          [SyntaxType.Elseif]: true,
          [SyntaxType.Else]: true,
          [SyntaxType.Endif]: true,
        }));
      }

      if (this.cur_token.type === SyntaxType.Else) {
        node.else = this.nextTokenExpectType(SyntaxType.Else);
        this.nextTokenExpectType(SyntaxType.Newline);
        node.else_statements = this.parseCompoundStatement({
          [SyntaxType.Endif]: true
        });
      }

      node.endif = this.nextTokenExpectType(SyntaxType.Endif);
    });
  }

  parseScriptCompoundStatement(): CompoundStatementNode {
    return this.parseNode(new CompoundStatementNode(), node => {
      while (this.moreData()) {
        let statement: StatementNode;

        const type = this.cur_token.type;

        if (type === SyntaxType.Set) {
          statement = this.parseSet();
        } else if (type === SyntaxType.Let) {
          statement = this.parseLet();
        } else if (type === SyntaxType.Begin) {
          statement = this.parseBeginBlock();
        } else if (this.isTypename()) {
          statement = this.parseVariableDeclaration();
        } else if (type === SyntaxType.Newline) {
          this.skipToken();
          continue;
        } else {
          this.reportParsingError(
            "unexpected statement in outer scope",
            this.parseStatement().range
          );
          continue;
        }

        if (this.cur_token.type !== SyntaxType.EOF) {
          this.nextTokenExpectType(SyntaxType.Newline);
        }

        node.children.push(statement);
      }
    });
  }

  parseScript(): ScriptNode {
    return this.parseNode(this.script, node => {
      while (this.moreData()) {
        if (this.cur_token.type === SyntaxType.Comment) this.parseComment();
        else if (this.cur_token.type === SyntaxType.Newline) this.skipToken();
        else break;
      }

      node.scriptname = this.nextTokenExpectType(SyntaxType.ScriptName);
      node.name = this.parseIdentifier();
      this.nextTokenExpectType(SyntaxType.Newline);
      node.statements = this.parseScriptCompoundStatement();
    });
  }

  static Parse(text: string): ScriptNode {
    const parser = new Parser(text);

    return parser.parseScript();
  }
}
