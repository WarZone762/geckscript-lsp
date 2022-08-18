import { Lexer } from "./lexer";
import { TokenData, TokenTypeMap, TokenSubtypeMap } from "./token_data";

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
import { SyntaxType, SyntaxSubtype } from "./types";


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

  nextTokenExpectType<T extends SyntaxType>(type: T): Token<T> {  // TODO: combine Node.type and Node.subtype?
    const token = this.cur_token;

    let skip_token = true;

    if (token.type !== type) {
      this.reportParsingError(`expected "${TokenTypeMap[type]}", got "${TokenTypeMap[token.type]}"`);
      skip_token = this.cur_token.type !== SyntaxType.Newline;
    }

    if (this.cur_token.type !== SyntaxType.EOF && skip_token)
      this.skipToken();

    while (this.cur_token.type === SyntaxType.Comment) this.parseComment();
    if (this.paren_level > 0)
      while (this.cur_token.type === SyntaxType.Newline) this.skipToken();

    return token as Token<T>;
  }

  nextTokenExpectSubtype<T extends SyntaxType, ST extends SyntaxSubtype>(type: T, subtype: ST): Token<T, ST> {
    const token = this.cur_token;

    let skip_token = true;

    if (token.type !== type || token.subtype !== subtype) {
      this.reportParsingError(`expected "${TokenSubtypeMap[subtype]}", got "${TokenSubtypeMap[token.subtype]}"`);
      skip_token = this.cur_token.type !== SyntaxType.Newline;
    }

    if (this.cur_token.type !== SyntaxType.EOF && skip_token)
      this.skipToken();

    while (this.cur_token.type === SyntaxType.Comment) this.parseComment();
    if (this.paren_level > 0) {
      if (subtype === SyntaxSubtype.RParen)
        --this.paren_level;
      else
        while (this.cur_token.type === SyntaxType.Newline) this.skipToken();
    }

    return token as Token<T, ST>;
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
      this.cur_token.subtype !== SyntaxSubtype.RParen
    )
      this.skipToken();

    return node;
  }

  reportParsingError(message: string): void {
    this.script.diagnostics.push({
      message: `Parsing error: ${message}`,
      range: this.cur_token.range,
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
    valid_tokens: { [key in SyntaxSubtype]?: boolean }
  ): ExpressionNode {
    let lhs = parse_child();

    if (this.cur_token.subtype in valid_tokens) {
      let last_node = this.parseNode(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op = this.nextTokenExpectType(SyntaxType.Operator);
        node.rhs = parse_child();
      });

      lhs = last_node;

      while ((this.cur_token.subtype ?? SyntaxSubtype.Unknown) in valid_tokens) {
        const node = this.parseNode(new BinOpNode(), node => {
          node.lhs = last_node.rhs;
          node.op = this.nextTokenExpectType(SyntaxType.Operator);
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
    valid_tokens: { [key in SyntaxSubtype]?: boolean }
  ): ExpressionNode {
    let lhs = parse_child();

    while (this.cur_token.subtype in valid_tokens) {
      lhs = this.parseNode(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op = this.nextTokenExpectType(SyntaxType.Operator);
        node.rhs = parse_child();
      });
    }

    return lhs;
  }

  parseComment(): void {
    const node = this.parseNode(new CommentNode(), node => {
      node.text = this.cur_token.content;
      node.value = node.text.substring(1);
      this.skipToken();
    });

    this.script.comments[node.range.start.line] = node;
  }

  parseNumber(): NumberNode {
    return this.parseNode(new NumberNode(), node => {
      node.text = this.nextTokenExpectSubtype(SyntaxType.Literal, SyntaxSubtype.Number).content;
      if (node.text[0] === "0" && node.text[1]?.toLowerCase() === "x") {
        node.value = parseInt(node.text, 16);
      } else {
        node.value = parseFloat(node.text);
      }

      return node;
    });
  }

  parseString(): StringNode {
    return this.parseNode(new StringNode(), node => {
      node.text = this.nextTokenExpectSubtype(SyntaxType.Literal, SyntaxSubtype.String).content;
      node.value = node.text.substring(1, node.text.length - 1);
    });
  }

  parseIdentifier(): Token<SyntaxType.Identifier> {
    return this.nextTokenExpectType(SyntaxType.Identifier);
  }

  parseKeyword(): Token<SyntaxType.Keyword> {
    return this.nextTokenExpectType(SyntaxType.Keyword);
  }

  parseFunction(): FunctionNode {
    return this.parseNode(new FunctionNode(), node => {
      node.name = this.nextTokenExpectType(SyntaxType.Identifier)!;

      while (this.moreData() && this.cur_token.type !== SyntaxType.Newline) {
        if (this.cur_token.type === SyntaxType.Operator) {
          if (this.cur_token.subtype === SyntaxSubtype.Comma) {
            this.skipToken();
            continue;
          } else if (this.cur_token.subtype !== SyntaxSubtype.LParen) {
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
      node.lbracket = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.LBracket);

      while (
        this.moreData() && this.cur_token.subtype !== SyntaxSubtype.RBracket
      ) {
        if (this.cur_token.type === SyntaxType.Typename)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.RBracket);
      node.arrow = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.EqualsGreater);
      node.expression = this.parseExpression();
    });
  }

  parseLambda(): LambdaNode {
    return this.parseNode(new LambdaNode(), node => {
      node.begin = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Begin);
      node.function = this.nextTokenExpectSubtype(SyntaxType.BlockTypeIdentifier, SyntaxSubtype.Function);
      node.lbracket = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.LBracket);

      while (
        this.moreData() &&
        this.cur_token.subtype !== SyntaxSubtype.RBracket
      ) {
        if (this.cur_token.type === SyntaxType.Typename)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.RBracket);
      this.nextTokenExpectType(SyntaxType.Newline);
      node.compound_statement = this.parseCompoundStatement();
      node.end = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.End);
    });
  }

  parsePrimaryExpression(): ExpressionNode {
    if (this.cur_token.subtype === SyntaxSubtype.String) {
      return this.parseString();
    } else if (this.cur_token.subtype === SyntaxSubtype.Number) {
      return this.parseNumber();
    } else if (this.cur_token.type === SyntaxType.Identifier) {
      if (this.cur_token.content.toLowerCase() in TokenData.Functions)
        return this.parseFunction();
      else
        return this.parseIdentifier();
    } else if (this.cur_token.subtype === SyntaxSubtype.LParen) {
      this.skipToken();
      if (this.cur_token.subtype as unknown === SyntaxSubtype.Begin) {
        return this.parseLambda();
      } else {
        ++this.paren_level;

        return this.parseNode(this.parseExpression(), node => {
          this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.RParen);
        });
      }
    } else if (this.cur_token.subtype === SyntaxSubtype.LBracket) {
      return this.parseLambdaInline();
    } else {
      this.reportParsingError("expected expression");

      return this.createMissingNode(new ExpressionNode());
    }
  }

  parseMemeberSquareBrackets(lhs: ExpressionNode): ExpressionNode {
    return this.parseMember(this.parseNode(new BinOpPairedNode(), node => {
      node.lhs = lhs;
      node.left_op = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.LSQBracket);
      node.rhs = this.parseExpression();
      node.right_op = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.RSQBracket);
    }));
  }

  parseMemberRArrow(lhs: ExpressionNode): ExpressionNode {
    return this.parseMember(this.parseNode(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.LArrow);

      if (
        this.cur_token.subtype !== SyntaxSubtype.String &&
        this.cur_token.subtype !== SyntaxSubtype.Number &&
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
      node.op = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.Dot);

      if (this.cur_token.type !== SyntaxType.Identifier) {
        node.rhs = this.createMissingNode(new ExpressionNode());
      } else {
        node.rhs = this.parsePrimaryExpression();
      }
    }));
  }

  parseMember(lhs?: ExpressionNode): ExpressionNode {
    lhs = lhs ?? this.parsePrimaryExpression();

    if (this.cur_token.type !== SyntaxType.Operator) return lhs;

    const subtype = this.cur_token.subtype;

    if (subtype === SyntaxSubtype.LSQBracket) {
      return this.parseMemeberSquareBrackets(lhs);
    } else if (subtype === SyntaxSubtype.RArrow) {
      return this.parseMemberRArrow(lhs);
    } else if (subtype === SyntaxSubtype.Dot) {
      return this.parseMemberDot(lhs);
    } else {
      return lhs;
    }
  }

  parseLogicalNot(): ExpressionNode {
    if (this.cur_token.subtype !== SyntaxSubtype.Exclamation)
      return this.parseMember();

    return this.parseNode(new UnaryOpNode(), node => {
      node.op = this.nextTokenExpectType(SyntaxType.Operator);
      node.operand = this.parseLogicalNot();
    });
  }

  parseUnary(): ExpressionNode {
    if (this.cur_token.type !== SyntaxType.Operator) return this.parseLogicalNot();

    const subtype = this.cur_token.subtype;
    if (
      subtype !== SyntaxSubtype.Minus &&
      subtype !== SyntaxSubtype.Dollar &&
      subtype !== SyntaxSubtype.Hash &&
      subtype !== SyntaxSubtype.Asterisk &&
      subtype !== SyntaxSubtype.Ampersand
    ) return this.parseLogicalNot();

    return this.parseNode(new UnaryOpNode(), node => {
      node.op = this.nextTokenExpectType(SyntaxType.Operator);
      node.operand = this.parseUnary();
    });
  }

  parseExponential(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseUnary(),
      { [SyntaxSubtype.Circumflex]: true }
    );
  }

  parseMultiplicative(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseExponential(),
      {
        [SyntaxSubtype.Asterisk]: true,
        [SyntaxSubtype.Slash]: true,
        [SyntaxSubtype.Percent]: true,
      }
    );
  }

  parseAdditive(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseMultiplicative(),
      {
        [SyntaxSubtype.Plus]: true,
        [SyntaxSubtype.Minus]: true,
      }
    );
  }

  parseShift(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseAdditive(),
      {
        [SyntaxSubtype.DoubleLess]: true,
        [SyntaxSubtype.DoubleGreater]: true,
      }
    );
  }

  parseAnd(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseShift(),
      { [SyntaxSubtype.Ampersand]: true }
    );
  }

  parseOr(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseAnd(),
      { [SyntaxSubtype.VBar]: true }
    );
  }

  parseRelational(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseOr(),
      {
        [SyntaxSubtype.Greater]: true,
        [SyntaxSubtype.GreaterEqulas]: true,
        [SyntaxSubtype.Less]: true,
        [SyntaxSubtype.LessEqulas]: true,
      }
    );
  }

  parseEquality(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseRelational(),
      {
        [SyntaxSubtype.DoubleEquals]: true,
        [SyntaxSubtype.ExclamationEquals]: true,
      }
    );
  }

  parseSliceMakePair(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseEquality(),
      {
        [SyntaxSubtype.Colon]: true,
        [SyntaxSubtype.DoubleColon]: true,
      }
    );
  }

  parseLogicalAndCompoundAssignment(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseSliceMakePair(),
      {
        [SyntaxSubtype.DoubleAmpersand]: true,
        [SyntaxSubtype.PlusEquals]: true,
        [SyntaxSubtype.MinusEquals]: true,
        [SyntaxSubtype.AsteriskEquals]: true,
        [SyntaxSubtype.SlashEquals]: true,
        [SyntaxSubtype.CircumflexEquals]: true,
        [SyntaxSubtype.VBarEquals]: true,
        [SyntaxSubtype.AmpersandEquals]: true,
        [SyntaxSubtype.PercentEquals]: true,
      }
    );
  }

  parseLogicalOr(): ExpressionNode {
    return this.parseBinOpLeft(
      () => this.parseLogicalAndCompoundAssignment(),
      { [SyntaxSubtype.DoubleVBar]: true }
    );
  }

  parseAssignment(): ExpressionNode {
    return this.parseBinOpRight(
      () => this.parseLogicalOr(),
      {
        [SyntaxSubtype.Equals]: true,
        [SyntaxSubtype.ColonEquals]: true
      }
    );
  }

  parseExpression(): ExpressionNode {
    return this.parseAssignment();
  }

  parseVariableDeclaration(): VariableDeclarationNode {
    return this.parseNode(new VariableDeclarationNode(), node => {
      node.variable_type = this.nextTokenExpectType(SyntaxType.Typename);
      node.value = this.parseAssignment();
    });
  }

  parseSet(): SetNode {
    return this.parseNode(new SetNode(), node => {
      node.set = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Set);
      node.identifier = this.parseIdentifier();
      node.to = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.To);
      node.value = this.parseLogicalOr();
    });
  }

  parseLet(): LetNode {
    return this.parseNode(new LetNode(), node => {
      node.let = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Let);
      node.value = this.cur_token.type === SyntaxType.Typename ?
        this.parseVariableDeclaration() :
        this.parseExpression();
    });
  }

  parseStatement(): StatementNode {
    let node: StatementNode;

    const subtype = this.cur_token.subtype;
    const type = this.cur_token.type;

    if (subtype === SyntaxSubtype.Set) {
      node = this.parseSet();
    } else if (subtype === SyntaxSubtype.Let) {
      node = this.parseLet();
    } else if (subtype === SyntaxSubtype.Begin) {
      node = this.parseBeginBlock();
    } else if (subtype === SyntaxSubtype.While) {
      node = this.parseWhileBlock();
    } else if (subtype === SyntaxSubtype.Foreach) {
      node = this.parseForeachBlock();
    } else if (subtype === SyntaxSubtype.If) {
      node = this.parseIfBlock();
    } else if (type === SyntaxType.Typename) {
      node = this.parseVariableDeclaration();
    } else if (type === SyntaxType.Keyword) {
      node = this.parseKeyword();
    } else if (type === SyntaxType.Newline) {
      this.skipToken();
      return this.parseStatement();
    } else {
      node = this.parseExpression();
    }

    if (this.cur_token.type !== SyntaxType.EOF) {
      this.nextTokenExpectType(SyntaxType.Newline);
    }

    return node;
  }

  parseCompoundStatement(): CompoundStatementNode {
    return this.parseNode(new CompoundStatementNode(), node => {
      while (
        this.moreData() &&
        this.cur_token.subtype !== SyntaxSubtype.End &&
        this.cur_token.subtype !== SyntaxSubtype.Elseif &&
        this.cur_token.subtype !== SyntaxSubtype.Else &&
        this.cur_token.subtype !== SyntaxSubtype.Endif &&
        this.cur_token.subtype !== SyntaxSubtype.Loop
      ) {
        const statement = this.parseStatement();

        node.children.push(statement);
      }
    });
  }

  parseBlockType(): BlockTypeNode {
    return this.parseNode(new BlockTypeNode(), node => {
      node.block_type = this.nextTokenExpectType(SyntaxType.BlockTypeIdentifier);

      while (
        this.moreData() &&
        this.cur_token.type !== SyntaxType.Newline &&
        (
          this.cur_token.type === SyntaxType.Identifier ||
          this.cur_token.subtype === SyntaxSubtype.Number
        )
      ) {
        const arg = this.parsePrimaryExpression();

        node.args.push(arg);
      }
    });
  }

  parseBeginBlock(): BeginBlockNode {
    return this.parseNode(new BeginBlockNode(), node => {
      node.begin = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Begin);
      node.block_type = this.parseBlockType();
      this.nextTokenExpectType(SyntaxType.Newline);

      node.compound_statement = this.parseCompoundStatement();

      node.end = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.End);
    });
  }

  parseForeachBlock(): ForeachBlockNode {
    return this.parseNode(new ForeachBlockNode(), node => {
      node.foreach = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Foreach);

      node.idetifier = this.cur_token.type === SyntaxType.Typename ?
        this.parseVariableDeclaration() :
        this.parseIdentifier();

      node.larrow = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.LArrow);
      node.iterable = this.parseExpression();
      this.nextTokenExpectType(SyntaxType.Newline);

      node.statements = this.parseCompoundStatement();

      node.loop = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Loop);
    });
  }

  parseBranch<T extends SyntaxSubtype>(branch_keyword: T): BranchNode<T> {
    return this.parseNode(new BranchNode(), node => {
      node.keyword = this.nextTokenExpectSubtype(SyntaxType.Keyword, branch_keyword);
      node.condition = this.parseExpression();
      this.nextTokenExpectType(SyntaxType.Newline);

      node.statements = this.parseCompoundStatement();
    });
  }

  parseWhileBlock(): WhileBlockNode {
    return this.parseNode(new WhileBlockNode(), node => {
      node.branch = this.parseBranch(SyntaxSubtype.While);

      node.loop = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Loop);
    });
  }

  parseIfBlock(): IfBlockNode {
    return this.parseNode(new IfBlockNode(), node => {
      node.branches[0] = this.parseBranch(SyntaxSubtype.If);

      while (this.cur_token.subtype === SyntaxSubtype.Elseif) {
        node.branches.push(this.parseBranch(SyntaxSubtype.Elseif));
      }

      if (this.cur_token.subtype === SyntaxSubtype.Else) {
        node.else = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Else);
        this.nextTokenExpectType(SyntaxType.Newline);
        node.else_statements = this.parseCompoundStatement();
      }

      node.endif = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.Endif);
    });
  }

  parseScript(): ScriptNode {
    return this.parseNode(this.script, node => {
      while (this.moreData()) {
        if (this.cur_token.type === SyntaxType.Comment) this.parseComment();
        else if (this.cur_token.type === SyntaxType.Newline) this.skipToken();
        else break;
      }

      node.scriptname = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.ScriptName);
      node.name = this.parseIdentifier();
      this.nextTokenExpectType(SyntaxType.Newline);
      node.statements = this.parseCompoundStatement();
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

  static ToTreeFunctionsType: { [key in SyntaxType]?: (node: any) => TreeData } = {
    [SyntaxType.Unknown]: (node: Token) => {
      return new TreeData(`Node "${node.content}" (${node.type}, ${node.subtype})`);
    },
    [SyntaxType.Comment]: (node: CommentNode) => {
      return new TreeData(`${node.range.start.line}: ;${node.value}`);
    },
    [SyntaxType.Identifier]: (node: Token) => {
      return new TreeData(`${node.content}`);
    },
    [SyntaxType.Keyword]: (node: Token) => {
      return new TreeData(`Keyword: ${node.content}`);
    },
    [SyntaxType.BlockTypeIdentifier]: (node: Token) => {
      return new TreeData(`${node.content}`);
    },
    [SyntaxType.BlockType]: (node: BlockTypeNode) => {
      const tree = new TreeData(`${node.block_type.content}`);

      tree.concat(node.args.map(AST.ToTree));

      return tree;
    },
    [SyntaxType.VariableDeclaration]: (node: VariableDeclarationNode) => {
      const tree = new TreeData(`${node.variable_type.content}`);

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxType.CompoundStatement]: (node: CompoundStatementNode) => {
      const tree = new TreeData(
        "Compound Statement",
        node.children.map(AST.ToTree)
      );

      return tree;
    },
    [SyntaxType.Branch]: (node: BranchNode<SyntaxSubtype>) => {
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
    }
  };

  static ToTreeFunctionsSubtype: { [key in SyntaxSubtype]?: (node: any) => TreeData } = {
    [SyntaxSubtype.Number]: (node: NumberNode) => {
      return new TreeData(`${node.value}`);
    },
    [SyntaxSubtype.String]: (node: StringNode) => {
      return new TreeData(`"${node.value}"`);
    },
    [SyntaxSubtype.SetStatement]: (node: SetNode) => {
      const tree = new TreeData("set");

      tree.append(AST.ToTree(node.identifier));
      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxSubtype.LetStatement]: (node: LetNode) => {
      const tree = new TreeData("let");

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxSubtype.UnaryOp]: (node: UnaryOpNode) => {
      const tree = new TreeData(`${node.op.content}`);

      tree.append(AST.ToTree(node.operand));

      return tree;
    },
    [SyntaxSubtype.BinOp]: (node: BinOpNode) => {
      const tree = new TreeData(`${node.op.content}`);

      tree.append(AST.ToTree(node.lhs));
      tree.append(AST.ToTree(node.rhs));

      return tree;
    },
    [SyntaxSubtype.BinOpPaired]: (node: BinOpPairedNode) => {
      const tree = new TreeData(`${node.left_op}${node.right_op}`);

      tree.append(AST.ToTree(node.lhs));
      tree.append(AST.ToTree(node.rhs));

      return tree;
    },
    [SyntaxSubtype.Function]: (node: FunctionNode) => {
      const tree = new TreeData(`${node.name.content}`);

      tree.concat(node.args.map(AST.ToTree));

      return tree;
    },
    [SyntaxSubtype.LambdaInline]: (node: LambdaInlineNode) => {
      const tree = new TreeData("Inline Lambda");

      tree.concat(node.params.map(AST.ToTree));
      tree.append(AST.ToTree(node.expression));

      return tree;
    },
    [SyntaxSubtype.Lambda]: (node: LambdaNode) => {
      const tree = new TreeData("Lambda");

      tree.concat(node.params.map(AST.ToTree));
      tree.append(AST.ToTree(node.compound_statement));

      return tree;
    },
    [SyntaxSubtype.BeginStatement]: (node: BeginBlockNode) => {
      const tree = new TreeData("begin");

      tree.append(AST.ToTree(node.block_type));
      tree.append(AST.ToTree(node.compound_statement));

      return tree;
    },
    [SyntaxSubtype.ForeachStatement]: (node: ForeachBlockNode) => {
      const tree = new TreeData("foreach");

      tree.append(AST.ToTree(node.idetifier));
      tree.append(AST.ToTree(node.iterable));
      tree.append(AST.ToTree(node.statements));

      return tree;
    },
    [SyntaxSubtype.WhileStatement]: (node: WhileBlockNode) => {
      const tree = new TreeData("while");

      tree.append(AST.ToTree(node.branch));

      return tree;
    },
    [SyntaxSubtype.IfStatement]: (node: IfBlockNode) => {
      const tree = new TreeData("if");

      tree.concat(node.branches.map(AST.ToTree));
      if (node.else_statements != undefined)
        tree.append(AST.ToTree(node.else_statements));

      return tree;
    },
  };

  constructor(root: ScriptNode) {
    this.root = root;
  }

  toTree(): TreeData {
    let func;
    func = AST.ToTreeFunctionsSubtype[this.root.subtype];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[this.root.type];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[SyntaxType.Unknown]!;

    return func(this.root);
  }

  static ToTree(node: Node): TreeData {
    let func;
    func = AST.ToTreeFunctionsSubtype[node.subtype];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[node.type];
    if (func == undefined)
      func = AST.ToTreeFunctionsType[SyntaxType.Unknown]!;

    return func(node);
  }
}
