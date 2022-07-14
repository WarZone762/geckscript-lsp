import { GetTokens, Token, TokenPosition, TokensStorage } from "./lexer";
import * as Tokens from "./tokens";


export enum NodeType {
  assignment_statement,
  comment,
  compound_statement,
  empty,
  function,
  numerical,
  script,
  string_literal,
  variable,
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

export class VariableNode extends Node {
  token: Token;
  value: string;

  constructor(token: Token) {
    super(NodeType.variable);

    this.token = token;
    this.value = token.content;
  }
}

export class VariableDeclarationNode extends Node {
  token: Token;
  variable_type: string;
  variable: VariableNode;

  constructor(token: Token, variable: VariableNode) {
    super(NodeType.variable_declaration);

    this.token = token;
    this.variable_type = token.content;

    this.variable = variable;
  }
}

export class FunctionNode extends Node {
  token: Token;
  name: string;
  args: Node[];

  constructor(token: Token) {
    super(NodeType.function);

    this.token = token;
    this.name = token.content;

    this.args = [];
  }
}

export class AssignmentStatementNode extends Node {
  token: Token;
  variable: VariableNode;
  value: Node;

  constructor(token: Token, variable: VariableNode, value: Node) {
    super(NodeType.assignment_statement);

    this.token = token;
    this.variable = variable;
    this.value = value;
  }
}

export class CompoundStatementNode extends Node {
  children: Node[];

  constructor() {
    super(NodeType.compound_statement);

    this.children = [];
  }
}

export class Script extends Node {
  token: Token;
  name: VariableNode;
  statements: Node[];
  variables: VariableNode[];

  constructor(token: Token) {
    super(NodeType.script);

    this.token = token;
    this.name = new VariableNode(token);
    this.statements = [];
    this.variables = [];
  }
}

export const StatementListTerminators = {
  "end": true,
  "loop": true,
  "elseif": true,
  "else": true,
  "endif": true,
};

/*
  * GRAMMAR

  program:
    (scn | ScriptName) variable
    statement_list

  statement_list:
    statement
    |
    statement
    statement_list

  statement:
    assignment_statement
    empty

  assignment_statement:
    SET variable TO expression

  expression:
    LPAREN? function | literal | variable RPAREN?

  function: FUNCTION expression*

  variable declaration:
    TYPE variable

  variable:
    ID

  literal:
    NUMBER | STRING

*/

export class Parser {
  data: Token[][];
  variables: VariableNode[];

  cur_token_pos: {
    m: number,
    n: number,
  };
  cur_token: Token | undefined;

  constructor(data: Token[][]) {
    this.data = data;
    this.variables = [];

    this.cur_token_pos = {
      m: 0,
      n: 0
    };

    this.cur_token = data[0][0];

    while (this.cur_token == undefined) {
      this.nextToken();
    }
  }

  nextLine(): void {
    this.cur_token_pos.n = 0;
    this.cur_token = this.data?.[++this.cur_token_pos.m]?.[0];
  }

  nextTokenOnLine(): void {
    this.cur_token = this.data?.[this.cur_token_pos.m]?.[++this.cur_token_pos.n];
  }

  nextToken(): void {
    this.nextTokenOnLine();
    while (this.cur_token == undefined && this.cur_token_pos.m < this.data.length) {
      this.nextLine();
    }
  }

  parseVariable(): VariableNode {
    const variable = new VariableNode(this.cur_token!);
    this.nextToken();
    return variable;
  }

  parseComment(): CommentNode {
    const comment = new CommentNode(this.cur_token!);
    this.nextToken();
    return comment;
  }

  parseFunction(): FunctionNode {
    const function_statement = new FunctionNode(this.cur_token!);

    const cur_line = this.cur_token_pos.m;

    this.nextToken();

    while (cur_line == this.cur_token_pos.m) {
      if (this.cur_token!.content == ")") {
        this.nextToken();

        return function_statement;
      }

      function_statement.args.push(this.parseExpression());
    }

    return function_statement;
  }

  parseVariableDeclaration(): VariableDeclarationNode {
    const type_token = this.cur_token!;

    this.nextToken();

    const variable = this.parseVariable();

    this.variables.push(variable);

    return new VariableDeclarationNode(type_token, variable);
  }

  parseAssignmentStatementSet(): AssignmentStatementNode {
    const set_token = this.cur_token!;

    this.nextToken();

    const variable = this.parseVariable();

    this.nextToken();

    return new AssignmentStatementNode(set_token, variable, this.parseExpression());
  }

  parseAssignmentStatementLet(): AssignmentStatementNode {
    const let_token = this.cur_token!;

    this.nextToken();

    let variable;
    if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Types) {
      variable = this.parseVariableDeclaration().variable;
    } else {
      variable = this.parseVariable();
    }

    this.nextToken();

    return new AssignmentStatementNode(let_token, variable, this.parseExpression());
  }

  parseExpression(): Node {
    let token: Node;

    if (this.cur_token?.content == "(") this.nextToken();

    if (this.cur_token?.content[0] === "\"") {
      token = new StringLiteralNode(this.cur_token);
      this.nextToken();
    } else if (!isNaN(this.cur_token?.content as any)) {
      token = new NumericalNode(this.cur_token!);
      this.nextToken();
    } else if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Functions) {
      token = this.parseFunction();
    } else {
      token = new VariableNode(this.cur_token!);
      this.nextToken();
    }

    return token;
  }

  parseStatement(): Node {
    if (this.cur_token?.content[0] === ";") {
      return this.parseComment();
    } else if (this.cur_token?.content === "set") {
      return this.parseAssignmentStatementSet();
    } else if (this.cur_token?.content === "let") {
      return this.parseAssignmentStatementLet();
    } else if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Types) {
      return this.parseVariableDeclaration();
    } else {
      return this.parseFunction();
    }
  }

  parseStatementList(): Node[] {
    const nodes: Node[] = [];

    while (
      this.cur_token != undefined &&
      !(this.cur_token!.content in StatementListTerminators)
    ) {
      nodes.push(this.parseStatement());
    }

    return nodes;
  }

  parseCompundStatement(): CompoundStatementNode {
    this.nextToken();

    const compound_statement = new CompoundStatementNode();

    compound_statement.children = this.parseStatementList();

    this.nextToken();

    return compound_statement;
  }

  parse(): Script {
    this.nextToken();

    const script = new Script(this.cur_token!);

    this.nextToken();

    script.statements = this.parseStatementList();

    script.variables = this.variables;

    return script;
  }
}

export function GetAST(text: string): Script {
  const parser = new Parser(GetTokens(text).data);

  return parser.parse();
}
