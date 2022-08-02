import { GetTokens, Token, TokenPosition, TokensStorage } from "./lexer";
import { TokenSubtype } from "./tokens";
import { TokenType } from "./tokens";


export const enum NodeType {
  begin_block,
  bin_op,
  comment,
  compound_statement,
  conditional,
  empty,
  foreach_block,
  function,
  identifier,
  if_block,
  let,
  numerical,
  script,
  set,
  string_literal,
  variable_declaration,
  while_block,
}

export type Range = {
  start: TokenPosition,
  end: TokenPosition
}

export class Node {
  type: NodeType;
  range: Range;

  constructor(type: NodeType) {
    this.type = type;
    this.range = {
      start: {
        column: 0,
        line: 0
      },
      end: {
        column: 0,
        line: 0
      }
    };
  }
}

export class NumberNode extends Node {
  token?: Token;
  value?: number;

  constructor() {
    super(NodeType.numerical);
  }
}
export class StringNode extends Node {
  token?: Token;
  value?: string;

  constructor() {
    super(NodeType.string_literal);
  }
}

export class CommentNode extends Node {
  token?: Token;
  value?: string;

  constructor() {
    super(NodeType.comment);
  }
}

export class IdentifierNode extends Node {
  token?: Token;
  value?: string;

  constructor() {
    super(NodeType.identifier);
  }
}

export class VariableDeclarationNode extends Node {
  type_token?: Token;
  variable_type?: string;
  value?: Node;

  constructor() {
    super(NodeType.variable_declaration);
  }
}

export class SetNode extends Node {
  set_token?: Token;
  identifier?: IdentifierNode;
  to_token?: Token;
  value?: Node;

  constructor() {
    super(NodeType.set);
  }
}

export class LetNode extends Node {
  let_token?: Token;
  value?: Node;

  constructor() {
    super(NodeType.let);
  }
}

export class BinOpNode extends Node {
  lhs?: Node;
  op_token?: Token;
  op?: string;
  rhs?: Node;

  constructor() {
    super(NodeType.bin_op);
  }
}

export class FunctionNode extends Node {
  token?: Token;
  name?: string;
  args: (Node | undefined)[];

  constructor() {
    super(NodeType.function);

    this.args = [];
  }
}

export class CompoundStatementNode extends Node {
  children: (Node | undefined)[];
  symbol_table: IdentifierNode[];

  constructor() {
    super(NodeType.compound_statement);

    this.children = [];
    this.symbol_table = [];
  }
}

export class BeginBlockNode extends Node {
  begin_token?: Token;
  expression?: Node;
  compound_statement?: CompoundStatementNode;
  end_token?: Token;

  constructor() {
    super(NodeType.begin_block);
  }
}

export class ForeachBlockNode extends Node {
  foreach_token?: Token;
  idetifier?: IdentifierNode | VariableDeclarationNode;
  larrow_token?: Token;
  iterable?: Node;

  statements?: CompoundStatementNode;

  loop_token?: Token;

  constructor() {
    super(NodeType.foreach_block);
  }
}

export class ConditionalNode extends Node {
  token?: Token;
  condition?: Node;
  statements?: CompoundStatementNode;

  constructor() {
    super(NodeType.conditional);
  }
}

export class WhileBlockNode extends Node {
  while_node?: ConditionalNode;
  loop_token?: Token;

  constructor() {
    super(NodeType.while_block);
  }
}

export class IfBlockNode extends Node {
  branches: ConditionalNode[];
  else_token?: Token;
  else_branch?: CompoundStatementNode;
  endif_token?: Token;

  constructor() {
    super(NodeType.if_block);

    this.branches = [];
  }
}

export class Script extends Node {
  scriptname_token?: Token;
  name?: IdentifierNode;
  statements?: CompoundStatementNode;

  constructor() {
    super(NodeType.script);
  }
}

export class Parser {
  data: Token[][];
  variables: IdentifierNode[];

  cur_x: number;
  cur_ln: number;

  cur_token: Token | undefined;

  constructor(data: Token[][]) {
    this.data = data;
    this.variables = [];

    this.cur_x = 0;
    this.cur_ln = 0;

    this.cur_token = data[0][0];

    while (this.cur_token == undefined) {
      this.skipToken();
    }
  }

  skipLine(): void {
    this.cur_x = 0;
    this.cur_token = this.data?.[++this.cur_ln]?.[0];
  }

  skipTokenOnLine(): void {
    this.cur_token = this.data?.[this.cur_ln]?.[++this.cur_x];
  }

  skipToken(): void {
    this.skipTokenOnLine();
    if (this.cur_token == undefined) this.skipLine();
  }

  nextToken(): Token | undefined {
    const token = this.cur_token;
    this.skipToken();

    return token;
  }

  nextTokenOfType(type: TokenType): Token | undefined {
    const token = this.cur_token;

    if (token?.type !== type) return undefined;
    this.skipToken();

    return token;
  }

  nextTokenOnLineOfType(type: TokenType): Token | undefined {
    const token = this.cur_token;

    if (token?.type !== type) return undefined;
    this.skipTokenOnLine();

    return token;
  }

  nextTokenOfSubtype(subtype: TokenSubtype): Token | undefined {
    const token = this.cur_token;

    if (token?.subtype !== subtype) return undefined;
    this.skipToken();

    return token;
  }

  peekTokenOnLine(offset: number): Token | undefined {
    return this.data[this.cur_ln][this.cur_x + offset];
  }

  parseComment(): CommentNode {
    const node = new CommentNode();
    node.token = this.nextTokenOfType(TokenType.COMMENT);
    if (node.token == undefined) {
      return node;
    }

    node.value = node.token.content.substring(1);

    return node;
  }

  parseNumber(): NumberNode {
    const node = new NumberNode();

    node.token = this.nextTokenOfType(TokenType.NUMBER);
    if (node.token == undefined) {
      return node;
    }

    node.value = node.token.subtype === TokenSubtype.HEX ?
      parseInt(node.token.content) :
      parseFloat(node.token.content);

    return node;
  }

  parseString(): StringNode {
    const node = new StringNode();

    node.token = this.nextTokenOfType(TokenType.STRING);
    if (node.token == undefined) {
      return node;
    }

    node.value = node.token.content.substring(1, node.token.length - 1);

    return node;
  }

  parseIdentifier(): IdentifierNode {
    const node = new IdentifierNode();

    node.token = this.nextTokenOfType(TokenType.ID);
    if (node.token == undefined) {
      return node;
    }

    node.value = node.token.content;

    return node;
  }

  parseFunction(): Node | undefined {
    const node = new FunctionNode();

    node.token = this.nextTokenOfType(TokenType.FUNCTION)!;
    if (node.token == undefined) {
      return node;
    }

    node.name = node.token.content;

    while (
      (
        this.cur_token?.type !== TokenType.OPERATOR ||
        this.cur_token?.subtype === TokenSubtype.LPAREN ||
        this.cur_token?.subtype === TokenSubtype.LBRACKET
      ) &&
      this.cur_token != undefined &&
      this.cur_x !== 0
    ) {
      node.args.push(this.parseSum());
    }

    return node;
  }

  parsePrimaryExpression(): Node | undefined {
    if (this.cur_token?.type === TokenType.STRING) {
      return this.parseString();
    } else if (this.cur_token?.type === TokenType.NUMBER) {
      return this.parseNumber();
    } else if (this.cur_token?.type === TokenType.ID) {
      return this.parseIdentifier();
    } else if (this.cur_token?.type === TokenType.FUNCTION) {
      return this.parseFunction();
    } else if (
      this.cur_token?.subtype === TokenSubtype.LPAREN ||
      this.cur_token?.subtype === TokenSubtype.LBRACKET
    ) {
      this.skipToken();

      const node = this.parseExpression();
      const token = this.nextTokenOfType(TokenType.OPERATOR);
      if (
        token?.subtype !== TokenSubtype.RPAREN &&
        token?.subtype !== TokenSubtype.RBRACKET
      ) {
        return node;  // parsing error: ")" or "}" expected
      }

      return node;
    } else {
      this.skipToken();
      return undefined;
    }
  }

  parseBinOpRight(
    parse_child: () => Node | undefined,
    valid_tokens: { [key in TokenSubtype]?: boolean },
    lhs?: Node
  ): Node | undefined {
    lhs = lhs ?? parse_child();
    const subtype = this.cur_token?.subtype ?? TokenSubtype.UNKNOWN;

    if (subtype in valid_tokens) {
      const node = new BinOpNode();

      node.lhs = lhs;
      node.op_token = this.nextToken();
      node.op = node.op_token?.content;
      node.rhs = this.parseBinOpRight(parse_child, valid_tokens);

      return node;
    }

    return lhs;
  }

  parseBinOpLeft(
    parse_child: () => Node | undefined,
    valid_tokens: { [key in TokenSubtype]?: boolean },
    lhs?: Node
  ): Node | undefined {
    lhs = lhs ?? parse_child();
    const subtype = this.cur_token?.subtype ?? TokenSubtype.UNKNOWN;

    if (subtype in valid_tokens) {
      const node = new BinOpNode();

      node.lhs = lhs;
      node.op_token = this.nextToken();
      node.op = node.op_token?.content;
      node.rhs = parse_child();

      return this.parseBinOpLeft(parse_child, valid_tokens, node);
    }

    return lhs;
  }

  parseMul(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parsePrimaryExpression(),
      {
        [TokenSubtype.MUL]: true,
        [TokenSubtype.DIVIDE]: true,
        [TokenSubtype.MOD]: true,
      }
    );
  }

  parseSum(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseMul(),
      {
        [TokenSubtype.PLUS]: true,
        [TokenSubtype.MINUS]: true,
      }
    );
  }

  parseComp(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseSum(),
      {
        [TokenSubtype.EQUALS_EQUALS]: true,
        [TokenSubtype.NOT_EQUALS]: true,
        [TokenSubtype.GREATER]: true,
        [TokenSubtype.GREATER_EQULAS]: true,
        [TokenSubtype.LESS]: true,
        [TokenSubtype.LESS_EQULAS]: true,
      }
    );
  }

  parseAnd(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseComp(),
      { [TokenSubtype.AND]: true }
    );
  }

  parseOr(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseAnd(),
      { [TokenSubtype.OR]: true }
    );
  }

  parseAssignment(): Node | undefined {
    return this.parseBinOpRight(
      () => this.parseOr(),
      {
        [TokenSubtype.EQUALS]: true,
        [TokenSubtype.COLON_EQUALS]: true
      }
    );
  }

  parseExpression(): Node | undefined {
    return this.parseAssignment();
  }

  parseVariableDeclaration(): VariableDeclarationNode {
    const node = new VariableDeclarationNode();

    node.type_token = this.nextTokenOfType(TokenType.TYPENAME);
    if (node.type_token == undefined) {
      return node;
    }

    node.variable_type = node.type_token.content;

    node.value = this.parseAssignment();

    return node;
  }

  parseSet(): SetNode {
    const node = new SetNode();

    node.set_token = this.nextTokenOfSubtype(TokenSubtype.SET);
    if (node.set_token == undefined) {
      return node;
    }

    node.identifier = this.parseIdentifier();

    node.to_token = this.nextTokenOfSubtype(TokenSubtype.TO);
    if (node.to_token == undefined) {
      return node;
    }

    node.value = this.parseOr();

    return node;
  }

  parseLet(): LetNode {
    const node = new LetNode();

    node.let_token = this.nextToken();
    if (node.let_token == undefined) {
      return node;
    }

    node.value = this.cur_token?.type === TokenType.TYPENAME ?
      this.parseVariableDeclaration() :
      this.parseExpression();

    return node;
  }

  parseCompoundStatement(
    terminator_predicate: (token: Token) => boolean = () => false
  ): CompoundStatementNode {
    const node = new CompoundStatementNode();

    while (
      this.cur_token != undefined &&
      !terminator_predicate(this.cur_token)
    ) {
      node.children.push(this.parseStatement());
    }

    return node;
  }

  parseBeginBlock(): BeginBlockNode {
    const node = new BeginBlockNode();

    node.begin_token = this.nextTokenOfSubtype(TokenSubtype.BEGIN);
    if (node.begin_token == undefined) {
      return node;
    }

    node.expression = this.parsePrimaryExpression();

    node.compound_statement = this.parseCompoundStatement(t =>
      t.subtype === TokenSubtype.END
    );

    node.end_token = this.nextTokenOfSubtype(TokenSubtype.END);
    if (node.end_token == undefined) {
      return node;
    }

    return node;
  }

  parseForeachBlock(): ForeachBlockNode {
    const node = new ForeachBlockNode();

    node.foreach_token = this.nextTokenOfSubtype(TokenSubtype.FOREACH);
    if (node.foreach_token == undefined) {
      return node;
    }

    node.idetifier = this.cur_token?.type === TokenType.TYPENAME ?
      this.parseVariableDeclaration() :
      this.parseIdentifier();

    node.larrow_token = this.nextTokenOfSubtype(TokenSubtype.LARROW);
    if (node.larrow_token == undefined) {
      return node;
    }

    node.iterable = this.parseExpression();

    node.statements = this.parseCompoundStatement(
      t => t.subtype === TokenSubtype.LOOP
    );

    node.loop_token = this.nextTokenOfSubtype(TokenSubtype.LOOP);
    if (node.loop_token == undefined) {
      return node;
    }

    return node;
  }

  parseConditional(
    type: TokenSubtype,
    terminator_predicate: (t: Token) => boolean = () => false
  ): ConditionalNode {
    const node = new ConditionalNode();

    node.token = this.nextTokenOfSubtype(type);
    if (node.token == undefined) {
      return node;
    }

    node.condition = this.parseExpression();

    node.statements = this.parseCompoundStatement(terminator_predicate);

    return node;
  }

  parseWhileBlock(): WhileBlockNode {
    const node = new WhileBlockNode();

    node.while_node = this.parseConditional(
      TokenSubtype.WHILE, t => t.subtype === TokenSubtype.LOOP
    );

    node.loop_token = this.nextTokenOfSubtype(TokenSubtype.LOOP);
    if (node.loop_token == undefined) {
      return node;
    }

    return node;
  }

  parseIfBlock(): IfBlockNode {
    const node = new IfBlockNode();

    node.branches[0] = this.parseConditional(TokenSubtype.IF, t =>
      t.subtype === TokenSubtype.ELSEIF ||
      t.subtype === TokenSubtype.ELSE ||
      t.subtype === TokenSubtype.ENDIF
    );

    while (this.cur_token?.subtype === TokenSubtype.ELSEIF) {
      node.branches.push(this.parseConditional(TokenSubtype.ELSEIF, t =>
        t.subtype === TokenSubtype.ELSEIF ||
        t.subtype === TokenSubtype.ELSE ||
        t.subtype === TokenSubtype.ENDIF
      ));
    }

    if (this.cur_token?.subtype === TokenSubtype.ELSE) {
      node.else_token = this.nextToken();
      node.else_branch = this.parseCompoundStatement(t => t.subtype === TokenSubtype.ENDIF);
    }

    node.endif_token = this.nextTokenOfSubtype(TokenSubtype.ENDIF);
    if (node.endif_token == undefined) {
      return node;
    }

    return node;
  }

  parseStatement(): Node | undefined {
    if (this.cur_token?.type === TokenType.COMMENT) {
      return this.parseComment();
    } else if (this.cur_token?.subtype === TokenSubtype.SET) {
      return this.parseSet();
    } else if (this.cur_token?.subtype === TokenSubtype.LET) {
      return this.parseLet();
    } else if (this.cur_token?.subtype === TokenSubtype.BEGIN) {
      return this.parseBeginBlock();
    } else if (this.cur_token?.subtype === TokenSubtype.WHILE) {
      return this.parseWhileBlock();
    } else if (this.cur_token?.subtype === TokenSubtype.FOREACH) {
      return this.parseForeachBlock();
    } else if (this.cur_token?.subtype === TokenSubtype.IF) {
      return this.parseIfBlock();
    } else if (this.cur_token?.type === TokenType.TYPENAME) {
      return this.parseVariableDeclaration();
    } else {
      return this.parseExpression();
    }
  }

  parse(): Script {
    const node = new Script();

    node.scriptname_token = this.nextTokenOfSubtype(TokenSubtype.SCN);
    if (node.scriptname_token == undefined) {
      return node;
    }

    node.name = this.parseIdentifier();

    node.statements = this.parseCompoundStatement();

    return node;
  }
}

export function GetAST(text: string): Script {
  const parser = new Parser(GetTokens(text).data);

  return parser.parse();
}
