import { Range } from "vscode-languageserver-textdocument";
import { Lexer } from "./lexer";
import { TokenData, TokenTypeMap, TokenSyntaxTypeMap } from "./token_data";

import {
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
  BlockTypeNode
} from "./types";
import { TokenType, SyntaxType } from "./types";


export class Parser {
  tokens: Token[];

  cur_pos = 0;

  cur_token: Token;
  last_token: Token;

  paren_level = 0;

  script: ScriptNode;

  constructor(data: Token[]) {
    this.tokens = data;

    this.cur_token = data[0];
    this.last_token = data[0];

    this.script = new ScriptNode();
  }

  skipToken(): void {
    this.last_token = this.cur_token;
    this.cur_token = this.tokens[++this.cur_pos];
  }

  nextTokenExpectTokenType<T extends TokenType>(type: T): Token<T> {  // TODO: combine Node.type and Node.subtype?
    const token = this.cur_token;

    let skip_token = true;

    if (token.token_type !== type) {
      this.reportParsingError(`expected "${TokenTypeMap[type]}", got "${TokenTypeMap[token.token_type]}"`);
      skip_token = this.cur_token.type !== SyntaxType.Newline;
    }

    if (this.cur_token.type !== SyntaxType.EOF && skip_token)
      this.skipToken();

    while (this.cur_token.type === SyntaxType.Comment) this.parseComment();
    if (this.paren_level > 0)
      while (this.cur_token.type === SyntaxType.Newline) this.skipToken();

    return token as Token<T>;
  }

  nextTokenExpectSyntaxType<T extends SyntaxType>(type: T): Token<TokenType, T> {
    const token = this.cur_token;

    let skip_token = true;

    if (token.type !== type) {
      this.reportParsingError(`expected "${TokenSyntaxTypeMap.All[type]}", got "${TokenSyntaxTypeMap.All[token.type]}"`);
      skip_token = this.cur_token.type !== SyntaxType.Newline;
    }

    if (this.cur_token.type !== SyntaxType.EOF && skip_token)
      this.skipToken();

    while (this.cur_token.type === SyntaxType.Comment) this.parseComment();
    if (this.paren_level > 0) {
      if (type === SyntaxType.RParen)
        --this.paren_level;
      else
        while (this.cur_token.type === SyntaxType.Newline) this.skipToken();
    }

    return token as Token<TokenType, T>;
  }

  moreData(): boolean {
    return this.cur_token.type !== SyntaxType.EOF;
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
        node.op = this.nextTokenExpectTokenType(TokenType.Operator);
        node.rhs = parse_child();
      });

      lhs = last_node;

      while ((this.cur_token.type ?? SyntaxType.Unknown) in valid_tokens) {
        const node = this.parseNode(new BinOpNode(), node => {
          node.lhs = last_node.rhs;
          node.op = this.nextTokenExpectTokenType(TokenType.Operator);
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
        node.op = this.nextTokenExpectTokenType(TokenType.Operator);
        node.rhs = parse_child();
      });
    }

    return lhs;
  }

  parseComment(): void {
    const node = this.parseNode(new CommentNode(), node => {
      node.content = this.cur_token.content;
      node.value = node.content.substring(1);
      this.skipToken();
    });

    this.script.comments[node.range.start.line] = node;
  }

  parseNumber(): NumberNode {
    return this.parseNode(new NumberNode(), node => {
      node.content = this.nextTokenExpectSyntaxType(SyntaxType.Number).content;
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
      node.content = this.nextTokenExpectSyntaxType(SyntaxType.String).content;
      node.value = node.content.substring(1, node.content.length - 1);
    });
  }

  parseIdentifier(): Token<TokenType, SyntaxType.Identifier> {
    return this.nextTokenExpectSyntaxType(SyntaxType.Identifier);
  }

  parseKeyword(): Token<TokenType.Keyword> {
    return this.nextTokenExpectTokenType(TokenType.Keyword);
  }

  parseFunction(): FunctionNode {
    return this.parseNode(new FunctionNode(), node => {
      node.name = this.nextTokenExpectSyntaxType(SyntaxType.Identifier)!;

      while (this.moreData() && this.cur_token.type !== SyntaxType.Newline) {
        if (this.cur_token.token_type === TokenType.Operator) {
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
      node.lbracket = this.nextTokenExpectSyntaxType(SyntaxType.LBracket);

      while (
        this.moreData() && this.cur_token.type !== SyntaxType.RBracket
      ) {
        if (this.cur_token.token_type === TokenType.Typename)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectSyntaxType(SyntaxType.RBracket);
      node.arrow = this.nextTokenExpectSyntaxType(SyntaxType.EqualsGreater);
      node.expression = this.parseExpression();
    });
  }

  parseLambda(): LambdaNode {
    return this.parseNode(new LambdaNode(), node => {
      node.begin = this.nextTokenExpectSyntaxType(SyntaxType.Begin);
      node.function = this.nextTokenExpectSyntaxType(SyntaxType.BlocktypeTokenFunction);
      node.lbracket = this.nextTokenExpectSyntaxType(SyntaxType.LBracket);

      while (
        this.moreData() &&
        this.cur_token.type !== SyntaxType.RBracket
      ) {
        if (this.cur_token.token_type === TokenType.Typename)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectSyntaxType(SyntaxType.RBracket);
      this.nextTokenExpectSyntaxType(SyntaxType.Newline);
      node.compound_statement = this.parseCompoundStatement({
        [SyntaxType.End]: true
      });
      node.end = this.nextTokenExpectSyntaxType(SyntaxType.End);
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
          this.nextTokenExpectSyntaxType(SyntaxType.RParen);
        });
      } else {
        ++this.paren_level;

        return this.parseNode(this.parseExpression(), node => {
          this.nextTokenExpectSyntaxType(SyntaxType.RParen);
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
      node.left_op = this.nextTokenExpectSyntaxType(SyntaxType.LSQBracket);
      node.rhs = this.parseExpression();
      node.right_op = this.nextTokenExpectSyntaxType(SyntaxType.RSQBracket);
    }));
  }

  parseMemberRArrow(lhs: ExpressionNode): ExpressionNode {
    return this.parseMember(this.parseNode(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op = this.nextTokenExpectSyntaxType(SyntaxType.LArrow) as Token<TokenType.Operator>;

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
      node.op = this.nextTokenExpectSyntaxType(SyntaxType.Dot) as Token<TokenType.Operator>;

      if (this.cur_token.type !== SyntaxType.Identifier) {
        node.rhs = this.createMissingNode(new ExpressionNode());
      } else {
        node.rhs = this.parsePrimaryExpression();
      }
    }));
  }

  parseMember(lhs?: ExpressionNode): ExpressionNode {
    lhs = lhs ?? this.parsePrimaryExpression();

    if (this.cur_token.token_type !== TokenType.Operator) return lhs;

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
      node.op = this.nextTokenExpectTokenType(TokenType.Operator);
      node.operand = this.parseLogicalNot();
    });
  }

  parseUnary(): ExpressionNode {
    if (this.cur_token.token_type !== TokenType.Operator) return this.parseLogicalNot();

    const subtype = this.cur_token.type;
    if (
      subtype !== SyntaxType.Minus &&
      subtype !== SyntaxType.Dollar &&
      subtype !== SyntaxType.Hash &&
      subtype !== SyntaxType.Asterisk &&
      subtype !== SyntaxType.Ampersand
    ) return this.parseLogicalNot();

    return this.parseNode(new UnaryOpNode(), node => {
      node.op = this.nextTokenExpectTokenType(TokenType.Operator);
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
      node.variable_type = this.nextTokenExpectTokenType(TokenType.Typename);
      node.value = this.parseAssignment();
    });
  }

  parseSet(): SetNode {
    return this.parseNode(new SetNode(), node => {
      node.set = this.nextTokenExpectSyntaxType(SyntaxType.Set);
      node.identifier = this.parseIdentifier();
      node.to = this.nextTokenExpectSyntaxType(SyntaxType.To);
      node.value = this.parseLogicalOr();
    });
  }

  parseLet(): LetNode {
    return this.parseNode(new LetNode(), node => {
      node.let = this.nextTokenExpectSyntaxType(SyntaxType.Let);
      node.value = this.cur_token.token_type === TokenType.Typename ?
        this.parseVariableDeclaration() :
        this.parseExpression();
    });
  }

  parseStatement(): StatementNode {
    let node: StatementNode;

    const type = this.cur_token.type;
    const token_type = this.cur_token.token_type;

    if (type === SyntaxType.Set) {
      node = this.parseSet();
    } else if (type === SyntaxType.Let) {
      node = this.parseLet();
    } else if (type === SyntaxType.Begin) {
      node = this.parseBeginBlock();

      this.reportParsingError(
        "nested begin blocks not allowed",
        node.range
      );

      node.type = SyntaxType.Unknown;
    } else if (type === SyntaxType.While) {
      node = this.parseWhileBlock();
    } else if (type === SyntaxType.Foreach) {
      node = this.parseForeachBlock();
    } else if (type === SyntaxType.If) {
      node = this.parseIfBlock();
    } else if (token_type === TokenType.Typename) {
      node = this.parseVariableDeclaration();
    } else if (token_type === TokenType.Keyword) {
      node = this.parseKeyword();
    } else if (type === SyntaxType.Newline) {
      this.skipToken();
      return this.parseStatement();
    } else {
      node = this.parseExpression();
    }

    if (this.cur_token.type !== SyntaxType.EOF) {
      this.nextTokenExpectSyntaxType(SyntaxType.Newline);
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
      node.block_type = this.nextTokenExpectSyntaxType(SyntaxType.BlocktypeToken);

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
      node.begin = this.nextTokenExpectSyntaxType(SyntaxType.Begin);
      node.block_type = this.parseBlockType();
      this.nextTokenExpectSyntaxType(SyntaxType.Newline);

      node.compound_statement = this.parseCompoundStatement({
        [SyntaxType.End]: true
      });

      node.end = this.nextTokenExpectSyntaxType(SyntaxType.End);
    });
  }

  parseForeachBlock(): ForeachBlockNode {
    return this.parseNode(new ForeachBlockNode(), node => {
      node.foreach = this.nextTokenExpectSyntaxType(SyntaxType.Foreach);

      node.idetifier = this.cur_token.token_type === TokenType.Typename ?
        this.parseVariableDeclaration() :
        this.parseIdentifier();

      node.larrow = this.nextTokenExpectSyntaxType(SyntaxType.LArrow);
      node.iterable = this.parseExpression();
      this.nextTokenExpectSyntaxType(SyntaxType.Newline);

      node.statements = this.parseCompoundStatement({
        [SyntaxType.Loop]: true
      });

      node.loop = this.nextTokenExpectSyntaxType(SyntaxType.Loop);
    });
  }

  parseBranch<T extends SyntaxType>(
    branch_keyword: T,
    terminator_tokens: { [key in SyntaxType]?: boolean }
  ): BranchNode<T> {
    return this.parseNode(new BranchNode(), node => {
      node.keyword = this.nextTokenExpectSyntaxType(branch_keyword);
      node.condition = this.parseExpression();
      this.nextTokenExpectSyntaxType(SyntaxType.Newline);

      node.statements = this.parseCompoundStatement(terminator_tokens);
    });
  }

  parseWhileBlock(): WhileBlockNode {
    return this.parseNode(new WhileBlockNode(), node => {
      node.branch = this.parseBranch(SyntaxType.While, {
        [SyntaxType.Loop]: true
      });

      node.loop = this.nextTokenExpectSyntaxType(SyntaxType.Loop);
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
        node.else = this.nextTokenExpectSyntaxType(SyntaxType.Else);
        this.nextTokenExpectSyntaxType(SyntaxType.Newline);
        node.else_statements = this.parseCompoundStatement({
          [SyntaxType.Endif]: true
        });
      }

      node.endif = this.nextTokenExpectSyntaxType(SyntaxType.Endif);
    });
  }

  parseScriptCompoundStatement(): CompoundStatementNode {
    return this.parseNode(new CompoundStatementNode(), node => {
      while (this.moreData()) {
        let statement: StatementNode;

        const type = this.cur_token.type;
        const token_type = this.cur_token.token_type;

        if (type === SyntaxType.Set) {
          statement = this.parseSet();
        } else if (type === SyntaxType.Let) {
          statement = this.parseLet();
        } else if (type === SyntaxType.Begin) {
          statement = this.parseBeginBlock();
        } else if (token_type === TokenType.Typename) {
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
          this.nextTokenExpectSyntaxType(SyntaxType.Newline);
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

      node.scriptname = this.nextTokenExpectSyntaxType(SyntaxType.ScriptName);
      node.name = this.parseIdentifier();
      this.nextTokenExpectSyntaxType(SyntaxType.Newline);
      node.statements = this.parseScriptCompoundStatement();
    });
  }

  static Parse(text: string): AST {
    const parser = new Parser(Lexer.Lex(text));

    const ast = new AST(parser.parseScript());

    return ast;
  }
}

export class AST {
  root: ScriptNode;

  static ToTreeFunctionsType: { [key in TokenType]?: (node: any) => TreeData } = {
    [TokenType.Unknown]: (node: Token) => {
      return new TreeData(`Node "${node.content}" (${node.token_type}, ${node.type})`);
    },
    [TokenType.Keyword]: (node: Token) => {
      return new TreeData(`Keyword: ${node.content}`);
    },
  };

  static ToTreeFunctionsSubtype: { [key in SyntaxType]?: (node: any) => TreeData } = {
    [SyntaxType.Comment]: (node: CommentNode) => {
      return new TreeData(`${node.range.start.line}: ;${node.value}`);
    },
    [SyntaxType.Number]: (node: NumberNode) => {
      return new TreeData(`${node.value}`);
    },
    [SyntaxType.String]: (node: StringNode) => {
      return new TreeData(`"${node.value}"`);
    },
    [SyntaxType.Identifier]: (node: Token) => {
      return new TreeData(`${node.content}`);
    },
    [SyntaxType.BlocktypeToken]: (node: BlockTypeNode) => {
      const tree = new TreeData(`${node.block_type.content}`);

      tree.concat(node.args.map(AST.ToTree));

      return tree;
    },
    [SyntaxType.Blocktype]: (node: BlockTypeNode) => {
      const tree = new TreeData(`${node.block_type.content}`);

      tree.concat(node.args.map(AST.ToTree));

      return tree;
    },
    [SyntaxType.VariableDeclaration]: (node: VariableDeclarationNode) => {
      const tree = new TreeData(`${node.variable_type.content}`);

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxType.Branch]: (node: BranchNode<SyntaxType>) => {
      const tree = new TreeData("Branch");

      tree.append(AST.ToTree(node.condition));
      tree.append(AST.ToTree(node.statements));

      return tree;
    },
    [SyntaxType.Script]: (node: ScriptNode) => {
      const tree = new TreeData("Script");

      tree.append(AST.ToTree(node.name));
      tree.append(AST.ToTree(node.statements));
      tree.append(new TreeData("Comments", Object.values(node.comments).map(AST.ToTree)));

      return tree;
    },
    [SyntaxType.SetStatement]: (node: SetNode) => {
      const tree = new TreeData("set");

      tree.append(AST.ToTree(node.identifier));
      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxType.LetStatement]: (node: LetNode) => {
      const tree = new TreeData("let");

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxType.UnaryOp]: (node: UnaryOpNode) => {
      const tree = new TreeData(`${node.op.content}`);

      tree.append(AST.ToTree(node.operand));

      return tree;
    },
    [SyntaxType.BinOp]: (node: BinOpNode) => {
      const tree = new TreeData(`${node.op.content}`);

      tree.append(AST.ToTree(node.lhs));
      tree.append(AST.ToTree(node.rhs));

      return tree;
    },
    [SyntaxType.BinOpPaired]: (node: BinOpPairedNode) => {
      const tree = new TreeData(`${node.left_op}${node.right_op}`);

      tree.append(AST.ToTree(node.lhs));
      tree.append(AST.ToTree(node.rhs));

      return tree;
    },
    [SyntaxType.FunctionExpression]: (node: FunctionNode) => {
      const tree = new TreeData(`${node.name.content}`);

      tree.concat(node.args.map(AST.ToTree));

      return tree;
    },
    [SyntaxType.LambdaInline]: (node: LambdaInlineNode) => {
      const tree = new TreeData("Inline Lambda");

      tree.concat(node.params.map(AST.ToTree));
      tree.append(AST.ToTree(node.expression));

      return tree;
    },
    [SyntaxType.Lambda]: (node: LambdaNode) => {
      const tree = new TreeData("Lambda");

      tree.concat(node.params.map(AST.ToTree));
      tree.append(AST.ToTree(node.compound_statement));

      return tree;
    },
    [SyntaxType.BeginStatement]: (node: BeginBlockNode) => {
      const tree = new TreeData("begin");

      tree.append(AST.ToTree(node.block_type));
      tree.append(AST.ToTree(node.compound_statement));

      return tree;
    },
    [SyntaxType.ForeachStatement]: (node: ForeachBlockNode) => {
      const tree = new TreeData("foreach");

      tree.append(AST.ToTree(node.idetifier));
      tree.append(AST.ToTree(node.iterable));
      tree.append(AST.ToTree(node.statements));

      return tree;
    },
    [SyntaxType.WhileStatement]: (node: WhileBlockNode) => {
      const tree = new TreeData("while");

      tree.append(AST.ToTree(node.branch));

      return tree;
    },
    [SyntaxType.IfStatement]: (node: IfBlockNode) => {
      const tree = new TreeData("if");

      tree.concat(node.branches.map(AST.ToTree));
      if (node.else_statements != undefined)
        tree.append(AST.ToTree(node.else_statements));

      return tree;
    },
    [SyntaxType.CompoundStatement]: (node: CompoundStatementNode) => {
      const tree = new TreeData(
        "Compound Statement",
        node.children.map(AST.ToTree)
      );

      return tree;
    },
  };

  constructor(root: ScriptNode) {
    this.root = root;
  }

  toTree(): TreeData {
    let func;
    func = AST.ToTreeFunctionsSubtype[this.root.type];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[TokenType.Unknown]!;

    return func(this.root);
  }

  static ToTree(node: Node | Token): TreeData {
    let func;
    func = AST.ToTreeFunctionsSubtype[node.type];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[(node as Token).token_type];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[TokenType.Unknown]!;

    return func(node);
  }
}
