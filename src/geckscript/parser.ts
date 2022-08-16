import { Diagnostic } from "vscode-languageserver";
import { Lexer } from "./lexer";
import { TokenData } from "./token_data";

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
  Literal,
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

  diagnostics: Diagnostic[] = [];

  constructor(data: Token[]) {
    this.tokens = data;

    this.cur_token = data[0];
    this.last_token = data[0];
  }

  skipToken(): void {
    this.last_token = this.cur_token;
    this.cur_token = this.tokens[++this.cur_pos];
  }

  nextToken(): Token {
    const token = this.cur_token;
    this.skipToken();

    return token;
  }

  nextTokenExpectType<T extends SyntaxType>(type: T): Token<T> {
    const token = this.cur_token;

    if (token.type !== type)
      this.reportParsingError(`expected ${token.type}, got ${type}`);

    if (this.cur_token.type !== SyntaxType.EOF)
      this.skipToken();

    return token as Token<T>;
  }

  nextTokenExpectSubtype<T extends SyntaxType, ST extends SyntaxSubtype>(type: T, subtype: ST): Token<T, ST> {
    const token = this.cur_token;

    if (token.type !== type || token.subtype !== subtype)
      this.reportParsingError(`expected (${token.type}), got (${type}, ${subtype})`);

    if (this.cur_token.type !== SyntaxType.EOF)
      this.skipToken();

    return token as Token<T, ST>;
  }

  moreData(): boolean {
    return this.cur_token.type !== SyntaxType.EOF;
  }

  lookBehind(offset: number): Token | undefined {
    return this.tokens[this.cur_pos + offset];
  }

  lookAhead(offset: number): Token | undefined {
    return this.tokens[this.cur_pos - offset];
  }

  createMissingNode<T extends Node>(node: T): T {
    node.range = {
      start: this.cur_token.range.start,
      end: this.cur_token.range.start
    };
    if (this.cur_token.type !== SyntaxType.EOF)
      this.skipToken();

    return node;
  }

  reportParsingError(message: string): void {
    const token = this.cur_token;

    this.diagnostics.push({
      message: `Parsing error: ${message}`,
      range: {
        start: {
          line: token.range.start.line,
          character: token.range.start.character
        },
        end: {
          line: token.range.end.line,
          character: token.range.end.character
        }
      },
    });
  }

  parseNode<T extends Node>(node/*_class*/: T/*{ new(): T }*/, parse_function: (node: T) => void): T {
    // const node = new node_class;
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

    if ((this.cur_token.subtype ?? SyntaxSubtype.Unknown) in valid_tokens) {
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

    while ((this.cur_token.subtype ?? SyntaxSubtype.Unknown) in valid_tokens) {
      lhs = this.parseNode(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op = this.nextTokenExpectType(SyntaxType.Operator);
        node.rhs = parse_child();
      });
    }

    return lhs;
  }

  parseComment(): CommentNode {
    return this.parseNode(new CommentNode(), node => {
      node = this.nextTokenExpectType(SyntaxType.Comment) as CommentNode;
      // node.token = this.nextTokenExpectType(SyntaxType.Comment);
      // node.value = node.token.content.substring(1);
    });
  }

  parseNumber(): NumberNode {
    return this.parseNode(new NumberNode(), node => {
      node = this.nextTokenExpectSubtype(SyntaxType.Literal, SyntaxSubtype.Number) as NumberNode;
      // node.token = this.nextTokenExpectType(SyntaxType.Number);
      // node.value = node.token.subtype === SyntaxSubtype.Hex ?
      //   parseInt(node.token.content) :
      //   parseFloat(node.token.content);
    });
  }

  parseString(): StringNode {
    return this.parseNode(new StringNode(), node => {
      node = this.nextTokenExpectSubtype(SyntaxType.Literal, SyntaxSubtype.String) as StringNode;
      // node.value = node.token.content.substring(1, node.token.length - 1);
    });
  }

  parseIdentifier<T extends SyntaxSubtype>(subtype: T): Token<SyntaxType.Identifier, T> {
    return this.parseNode(new Token(), node => {
      node = this.nextTokenExpectSubtype(SyntaxType.Identifier, subtype);
      // node.value = node.token.content;
    });
  }

  parseKeyword(): Token<SyntaxType.Keyword> {
    return this.parseNode(new Token(), node => {
      node = this.nextTokenExpectType(SyntaxType.Keyword);
      // node.value = node.token.content;
    });
  }

  parseFunction(): FunctionNode {
    return this.parseNode(new FunctionNode(), node => {
      node.name = this.nextTokenExpectSubtype(SyntaxType.Identifier, SyntaxSubtype.FunctionIdentifier)!;

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
        if (arg != undefined)
          node.args.push(arg);
        else
          break;
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
          node.params.push(this.parseIdentifier(SyntaxSubtype.VariableIdentifier));
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
      node.function = this.nextTokenExpectSubtype(SyntaxType.BlockType, SyntaxSubtype.Function);
      node.lbracket = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.LBracket);

      while (
        this.moreData() &&
        this.cur_token.subtype !== SyntaxSubtype.RBracket
      ) {
        if (this.cur_token.type === SyntaxType.Typename)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === SyntaxType.Identifier)
          node.params.push(this.parseIdentifier(SyntaxSubtype.VariableIdentifier));
        else
          this.skipToken();
      }

      node.rbracket = this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.RBracket);
      node.compound_statement = this.parseCompoundStatement();
      node.end = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.End);
    });
  }

  parsePrimaryExpression(): ExpressionNode {
    if (this.cur_token.subtype === SyntaxSubtype.String) {
      return this.parseString();
    } else if (this.cur_token.subtype === SyntaxSubtype.Number) {
      return this.parseNumber();
    } else if (this.cur_token.subtype === SyntaxSubtype.VariableIdentifier) {
      return this.parseIdentifier(SyntaxSubtype.VariableIdentifier);
    } else if (this.cur_token.subtype === SyntaxSubtype.FunctionIdentifier) {
      return this.parseFunction();
    } else if (this.cur_token.subtype === SyntaxSubtype.LParen) {
      this.skipToken();

      return this.parseNode(this.parseExpression(), node => {
        this.nextTokenExpectSubtype(SyntaxType.Operator, SyntaxSubtype.RParen);
      });
    } else if (this.cur_token.subtype === SyntaxSubtype.LBracket) {
      return this.parseLambdaInline();
    } else if (this.cur_token.subtype === SyntaxSubtype.Begin) {
      return this.parseLambda();
    } else if (this.cur_token.type === SyntaxType.Comment) {
      this.skipToken();

      return this.createMissingNode(new Node());
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
      node.identifier = this.parseIdentifier(SyntaxSubtype.VariableIdentifier);
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
    } else if (type === SyntaxType.Comment) {
      node = this.parseComment();
    } else if (type === SyntaxType.Typename) {
      node = this.parseVariableDeclaration();
    } else if (type === SyntaxType.Keyword) {
      node = this.cur_token;
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

        // if (statement != undefined)
        node.children.push(statement);
      }
    });
  }

  parseBlockType(): BlockTypeNode {
    return this.parseNode(new BlockTypeNode(), node => {
      node.block_type = this.nextTokenExpectType(SyntaxType.BlockType);

      while (this.moreData() && this.cur_token.type !== SyntaxType.Newline) {
        const arg = this.parsePrimaryExpression();

        // if (arg.type !== SyntaxType.Unknown)
        node.args.push(arg);
        // else
        //   break;
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
        this.parseIdentifier(SyntaxSubtype.VariableIdentifier);

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
    return this.parseNode(new ScriptNode(), node => {
      node.scriptname = this.nextTokenExpectSubtype(SyntaxType.Keyword, SyntaxSubtype.ScriptName);
      node.name = this.parseIdentifier(SyntaxSubtype.FunctionIdentifier);
      this.nextTokenExpectType(SyntaxType.Newline);
      node.statements = this.parseCompoundStatement();
    });
  }

  static Parse(text: string): AST {
    const parser = new Parser(Lexer.Lex(text));

    const ast = new AST(parser.parseScript());
    ast.diagnostics = parser.diagnostics;

    return ast;
  }
}

export class AST {
  root: Node;
  diagnostics: Diagnostic[] = [];

  static ToTreeFunctionsType: { [key in SyntaxType]?: (node: any) => TreeData } = {
    [SyntaxType.Unknown]: (node: Node) => {
      return new TreeData("Node");
    },
    [SyntaxType.Comment]: (node: CommentNode) => {
      return new TreeData(`;${String(node.value)}`);
    },
    [SyntaxType.Identifier]: (node: Token) => {
      return new TreeData(String(node.content));
    },
    [SyntaxType.Keyword]: (node: Token) => {
      return new TreeData(`Keyword ${node.content}`);
    },
    [SyntaxType.CompoundStatement]: (node: CompoundStatementNode) => {
      const tree = new TreeData(
        "Compound Statement",
        node.children.map(AST.ToTree) as TreeData[]
      );

      tree.append(new TreeData(
        "Symbol Table",
        node.symbol_table.map(AST.ToTree) as TreeData[]
      ));

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

      return tree;
    }
  };

  static ToTreeFunctionsSubtype: { [key in SyntaxSubtype]?: (node: any) => TreeData } = {
    [SyntaxSubtype.Unknown]: (node: Node) => {
      return new TreeData("Node");
    },
    [SyntaxSubtype.Number]: (node: NumberNode) => {
      return new TreeData(`${node.value}`);
    },
    [SyntaxSubtype.String]: (node: StringNode) => {
      return new TreeData(`"${node.value}"`);
    },
    [SyntaxSubtype.VariableIdentifier]: (node: VariableDeclarationNode) => {
      const tree = new TreeData(`Type: ${node.variable_type.content}`);

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [SyntaxSubtype.SetStatement]: (node: SetNode) => {
      const tree = new TreeData("set");

      tree.append(AST.ToTree(node.identifier));
      tree.append(new TreeData("to"));
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

      tree.concat(node.args.map(AST.ToTree) as TreeData[]);

      return tree;
    },
    [SyntaxSubtype.LambdaInline]: (node: LambdaInlineNode) => {
      const tree = new TreeData("Inline Lambda");

      tree.concat(node.params.map(AST.ToTree) as TreeData[]);
      tree.append(AST.ToTree(node.expression));

      return tree;
    },
    [SyntaxSubtype.Lambda]: (node: LambdaNode) => {
      const tree = new TreeData("Lambda");

      tree.concat(node.params.map(AST.ToTree) as TreeData[]);
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

      tree.concat(node.branches.map(AST.ToTree) as TreeData[]);
      if (node.else_statements != undefined)
        tree.append(AST.ToTree(node.else_statements));

      return tree;
    },
  };

  constructor(root: Node) {
    this.root = root;
  }

  toTree(): TreeData | undefined {
    let func;
    if (this.root.subtype !== SyntaxSubtype.Unknown)
      func = AST.ToTreeFunctionsSubtype[this.root.subtype];
    else
      func = AST.ToTreeFunctionsType[this.root.type];

    if (func != undefined) return func(this.root);
    else return AST.ToTreeFunctionsType[SyntaxType.Unknown]!(this.root);
  }

  validate(): Diagnostic[] { return []; }

  static ToTree(node: Node): TreeData | undefined {
    let func;
    if (node.subtype !== SyntaxSubtype.Unknown)
      func = AST.ToTreeFunctionsSubtype[node.subtype];
    else
      func = AST.ToTreeFunctionsType[node.type];

    if (func != undefined) return func(node);
    else return AST.ToTreeFunctionsType[SyntaxType.Unknown]!(node);
  }
}
