import { GetTokens, Token, TokenPosition, TokensStorage } from "./lexer";
import { TokenSubtype } from "./tokens";
import { TokenType } from "./tokens";


export const enum NodeType {
  assignment,
  begin_block,
  comment,
  compound_statement,
  empty,
  function,
  numerical,
  script,
  string_literal,
  identifier,
  variable_declaration,
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
  identifier?: IdentifierNode;

  constructor() {
    super(NodeType.variable_declaration);
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

export class AssignmentNode extends Node {
  set_token?: Token;
  let_token?: Token;

  variable_type?: string;

  identifier?: IdentifierNode | VariableDeclarationNode;

  equals_token?: Token;
  to_token?: Token;

  value?: Node;

  constructor() {
    super(NodeType.assignment);
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

  cur_token_pos: {
    ln: number,
    col: number,
  };
  cur_token: Token | undefined;

  constructor(data: Token[][]) {
    this.data = data;
    this.variables = [];

    this.cur_token_pos = {
      ln: 0,
      col: 0
    };

    this.cur_token = data[0][0];

    while (this.cur_token == undefined) {
      this.skipToken();
    }
  }

  skipLine(): void {
    this.cur_token_pos.col = 0;
    this.cur_token = this.data?.[++this.cur_token_pos.ln]?.[0];
  }

  skipTokenOnLine(): void {
    this.cur_token = this.data?.[this.cur_token_pos.ln]?.[++this.cur_token_pos.col];
  }

  skipToken(): void {
    this.skipTokenOnLine();
    while (this.cur_token == undefined && this.cur_token_pos.ln < this.data.length) {
      this.skipLine();
    }
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
    return this.data[this.cur_token_pos.ln][this.cur_token_pos.col + offset];
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

    if (node.token.subtype === TokenSubtype.HEX) {
      node.value = parseInt(node.token.content);
    } else {
      node.value = parseFloat(node.token.content);
    }

    return node;
  }

  parseString(): StringNode {
    const node = new StringNode();

    node.token = this.nextTokenOfType(TokenType.NUMBER);
    if (node.token == undefined) {
      return node;
    }

    node.value = node.token.content.substring(1, node.token.length);

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

  parseVariableDeclaration(): VariableDeclarationNode {
    const node = new VariableDeclarationNode();

    node.type_token = this.nextTokenOfType(TokenType.TYPENAME);
    if (node.type_token == undefined) {
      return node;
    }

    node.variable_type = node.type_token.content;

    node.identifier = this.parseIdentifier();

    return node;
  }

  parseAssignmentSet(): AssignmentNode {
    const node = new AssignmentNode();

    node.set_token = this.nextTokenOfSubtype(TokenSubtype.SET);
    if (node.set_token == undefined) {
      return node;
    }

    node.identifier = this.parseIdentifier();

    node.to_token = this.nextTokenOfSubtype(TokenSubtype.TO);
    if (node.to_token == undefined) {
      return node;
    }

    node.value = this.parseExpression();

    return node;
  }

  parseAssignmentLet(): AssignmentNode {
    const node = new AssignmentNode();

    node.let_token = this.nextToken();

    if (this.cur_token?.type === TokenType.TYPENAME) {
      node.identifier = this.parseVariableDeclaration();
    } else {
      node.identifier = this.parseIdentifier();
    }

    node.equals_token = this.nextToken();

    node.value = this.parseExpression();

    return node;
  }

  parseAssignment(): AssignmentNode {
    const node = new AssignmentNode();

    if (this.cur_token?.type === TokenType.TYPENAME) {
      node.identifier = this.parseVariableDeclaration();
    } else {
      node.identifier = this.parseIdentifier();
    }

    node.equals_token = this.nextToken();

    node.value = this.parseExpression();

    return node;
  }

  parseFunction(): FunctionNode {
    const node = new FunctionNode();

    if (this.cur_token?.subtype === TokenSubtype.LPAREN) this.skipTokenOnLine();

    node.token = this.nextTokenOnLineOfType(TokenType.FUNCTION);
    if (node.token == undefined) {
      return node;
    }

    node.name = node.token.content;

    let expr = this.parseExpression();

    while (expr != undefined) {
      if (this.cur_token?.subtype === TokenSubtype.RPAREN) {
        this.skipToken();

        return node;
      }

      node.args.push(expr);
      expr = this.parseExpression();
    }

    return node;
  }

  parseExpression(): Node | undefined {
    if (this.cur_token?.subtype === TokenSubtype.LPAREN) this.skipToken();

    if (this.cur_token?.type === TokenType.STRING) {
      return this.parseString();
    } else if (this.cur_token?.type === TokenType.NUMBER) {
      return this.parseNumber();
    } else if (this.cur_token?.type === TokenType.FUNCTION) {
      return this.parseFunction();
    } else if (this.cur_token?.type === TokenType.ID) {
      return this.parseIdentifier();
    }

    this.skipToken();
  }

  parseStatement(): Node | undefined {
    if (this.cur_token?.type === TokenType.COMMENT) {
      return this.parseComment();
    } else if (this.cur_token?.subtype === TokenSubtype.SET) {
      return this.parseAssignmentSet();
    } else if (this.cur_token?.subtype === TokenSubtype.LET) {
      return this.parseAssignmentLet();
    } else if (this.cur_token?.subtype === TokenSubtype.BEGIN) {
      return this.parseBeginBlock();
    } else if (this.cur_token?.type === TokenType.TYPENAME) {
      if (
        (t => t === TokenSubtype.EQUALS || t === TokenSubtype.COLON_EQUALS)(
          this.peekTokenOnLine(2)?.subtype
        ))
        return this.parseAssignment();
      else
        return this.parseVariableDeclaration();
    } else if (
      (t => t === TokenSubtype.EQUALS || t === TokenSubtype.COLON_EQUALS)(
        this.peekTokenOnLine(1)?.subtype
      )) {
      return this.parseAssignment();
    } else if (this.cur_token?.type === TokenType.FUNCTION) {
      return this.parseFunction();
    }

    this.skipToken();
  }

  parseStatementList(): CompoundStatementNode {
    const node = new CompoundStatementNode();

    while (
      this.cur_token != undefined &&
      !(t =>
        t === TokenSubtype.END ||
        t === TokenSubtype.LOOP ||
        t === TokenSubtype.ELSEIF ||
        t === TokenSubtype.ELSE ||
        t === TokenSubtype.ENDIF
      )(this.cur_token.subtype)
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

    node.expression = this.parseExpression();

    node.compound_statement = this.parseStatementList();

    node.end_token = this.nextTokenOfSubtype(TokenSubtype.END);
    if (node.end_token == undefined) {
      return node;
    }

    return node;
  }

  parse(): Script {
    const node = new Script();

    node.scriptname_token = this.nextTokenOfSubtype(TokenSubtype.SCN);
    if (node.scriptname_token == undefined) {
      return node;
    }

    node.name = this.parseIdentifier();

    node.statements = this.parseStatementList();

    return node;
  }
}

export function GetAST(text: string): Script {
  const parser = new Parser(GetTokens(text).data);

  return parser.parse();
}
