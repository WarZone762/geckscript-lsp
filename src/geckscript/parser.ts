import { GetTokens, Token, TokenPosition, TokensStorage } from "./lexer";
import * as Tokens from "./tokens";


export enum NodeType {
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

export class NumericalNode extends Node {
  token: Token;
  value: number;

  constructor(token: Token) {
    super(NodeType.numerical);

    this.token = token;
    if (token.content[1] === "x") {
      this.value = parseInt(token.content);
    } else {
      this.value = parseFloat(token.content);
    }
  }
}

export class StringLiteralNode extends Node {
  token: Token;
  value: string;

  constructor(token: Token) {
    super(NodeType.string_literal);

    this.token = token;
    this.value = token.content.substring(1, token.length - 1);
  }
}

export class CommentNode extends Node {
  token: Token;
  value: string;

  constructor(token: Token) {
    super(NodeType.comment);

    this.token = token;
    this.value = token.content.substring(1);
  }
}

export class IdentifierNode extends Node {
  token: Token;
  value: string;

  constructor(token: Token) {
    super(NodeType.identifier);

    this.token = token;
    this.value = token.content;
  }
}

export class VariableDeclarationNode extends Node {
  token: Token;
  variable_type: string;
  identifier: IdentifierNode;

  constructor(token: Token, identifier: IdentifierNode) {
    super(NodeType.variable_declaration);

    this.token = token;
    this.variable_type = token.content;

    this.identifier = identifier;
  }
}

export class FunctionNode extends Node {
  token: Token;
  lparen_token?: Token;
  name: string;
  args: Node[];
  rparen_token?: Token;

  constructor(token: Token) {
    super(NodeType.function);

    this.token = token;
    this.name = token.content;

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

export type CompoundStatementNode = Node[];

export class BeginBlockNode extends Node {
  begin_token?: Token;
  expression?: Node;
  compound_statement: CompoundStatementNode;
  end_token?: Token;

  constructor(token: Token, expression: Node | undefined, compound_statement: CompoundStatementNode) {
    super(NodeType.begin_block);

    this.begin_token = token;
    this.expression = expression;
    this.compound_statement = compound_statement;
  }
}

export class Script extends Node {
  scriptname_token: Token;
  name: IdentifierNode;
  statements: CompoundStatementNode;
  variables: IdentifierNode[];

  constructor(token: Token) {
    super(NodeType.script);

    this.scriptname_token = token;
    this.name = new IdentifierNode(token);
    this.statements = [];
    this.variables = [];
  }
}

export const CompoundStatementTerminators = {
  "end": true,
  "loop": true,
  "elseif": true,
  "else": true,
  "endif": true,
};

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

  peekTokenOnLine(offset: number): Token | undefined {
    return this.data[this.cur_token_pos.ln][this.cur_token_pos.col + offset];
  }

  parseIdentifier(): IdentifierNode {
    const variable = new IdentifierNode(this.nextToken()!);

    return variable;
  }

  parseComment(): CommentNode {
    const comment = new CommentNode(this.nextToken()!);

    return comment;
  }

  parseFunction(): FunctionNode {
    const function_statement = new FunctionNode(this.cur_token!);

    const cur_line = this.cur_token_pos.ln;

    this.skipToken();

    while (cur_line == this.cur_token_pos.ln) {
      if (this.cur_token!.content == ")") {
        this.skipToken();

        return function_statement;
      }

      function_statement.args.push(this.parseExpression());
    }

    return function_statement;
  }

  parseVariableDeclaration(): VariableDeclarationNode {
    const type_token = this.nextToken()!;

    const variable = this.parseIdentifier();

    this.variables.push(variable);

    return new VariableDeclarationNode(type_token, variable);
  }

  parseAssignmentSet(): AssignmentNode {
    const node = new AssignmentNode();

    node.set_token = this.nextToken();

    node.identifier = this.parseIdentifier();

    node.to_token = this.nextToken();

    node.value = this.parseExpression();

    return node;
  }

  parseAssignmentLet(): AssignmentNode {
    const node = new AssignmentNode();

    node.let_token = this.nextToken();

    if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Types) {
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

    if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Types) {
      node.identifier = this.parseVariableDeclaration();
    } else {
      node.identifier = this.parseIdentifier();
    }

    node.equals_token = this.nextToken();

    node.value = this.parseExpression();

    return node;
  }

  parseExpression(): Node {
    let token: Node;

    if (this.cur_token?.content == "(") this.skipToken();

    if (this.cur_token?.content[0] === "\"") {
      token = new StringLiteralNode(this.nextToken()!);
    } else if (!isNaN(this.cur_token?.content as any)) {
      token = new NumericalNode(this.nextToken()!);
    } else if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Functions) {
      token = this.parseFunction();
    } else {
      token = new IdentifierNode(this.nextToken()!);
    }

    return token;
  }

  parseStatement(): Node {
    if (this.cur_token?.content[0] === ";") {
      return this.parseComment();
    } else if (this.cur_token?.content.toLowerCase() === "set") {
      return this.parseAssignmentSet();
    } else if (this.cur_token?.content.toLowerCase() === "let") {
      return this.parseAssignmentLet();
    } else if (this.cur_token?.content.toLowerCase() === "begin") {
      return this.parseBeginBlock();
    } else if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Types) {
      if (this.peekTokenOnLine(2)?.content.includes("="))
        return this.parseAssignment();
      else
        return this.parseVariableDeclaration();
    } else if (this.peekTokenOnLine(1)?.content.includes("=")) {
      return this.parseAssignment();
    } else {
      return this.parseFunction();
    }
  }

  parseStatementList(): Node[] {
    const nodes: Node[] = [];

    while (
      this.cur_token != undefined &&
      !(this.cur_token!.content in CompoundStatementTerminators)
    ) {
      nodes.push(this.parseStatement());
    }

    return nodes;
  }

  parseBeginBlock(): BeginBlockNode {
    const token = this.nextToken()!;

    let expression;
    if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.BlockTypes) {
      expression = this.parseExpression();
    } else {
      expression = undefined;
    }

    const compound_statement = this.parseCompundStatement();

    return new BeginBlockNode(token, expression, compound_statement);
  }

  parseCompundStatement(): CompoundStatementNode {
    const compound_statement = this.parseStatementList();

    this.skipToken();

    return compound_statement;
  }

  parse(): Script {
    this.skipToken();

    const script = new Script(this.nextToken()!);

    script.statements = this.parseStatementList();

    script.variables = this.variables;

    return script;
  }
}

export function GetAST(text: string): Script {
  const parser = new Parser(GetTokens(text).data);

  return parser.parse();
}
