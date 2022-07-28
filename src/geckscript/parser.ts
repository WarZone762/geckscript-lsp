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
  rparen_token?: Token;
  name: string;
  args: Node[];

  constructor(token: Token) {
    super(NodeType.function);

    this.token = token;
    this.name = token.content;

    this.args = [];
  }
}

export class AssignmentNode extends Node {
  set_token?: Token;
  to_token?: Token;

  let_token?: Token;
  variable_type?: string;
  equals_token?: Token;

  identifier: IdentifierNode;
  value: Node;

  constructor(token: Token, identifier: IdentifierNode, value: Node) {
    super(NodeType.assignment);

    this.let_token = token;
    this.identifier = identifier;
    this.value = value;
  }
}

export type CompoundStatementNode = Node[];

export class BeginBlockNode extends Node {
  begin_token?: Token;
  end_token?: Token;
  expression?: Node;
  compound_statement: CompoundStatementNode;

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

/*
  * GRAMMAR

  script:
    SCRIPTNAME ID
    statement_list

  statement_list:
    statement
    |
    statement
    statement_list

  begin_block:
    BEGIN expression?
      statement_list
    END

  statement:
    assignment_statement
    declaration_assignment
    |
    empty

  expression:
    (LPAREN | LBRACKET)? function | literal | variable (RPAREN | RBRACKET)?

  assignment:
    SET variable TO expression
    |
    LET? variable (EQUALS | COLON_EQUALS) expression

  declaration_assignment:
    LET? variable TYPE (EQUALS | COLON_EQUALS) expression

  function: FUNCTION expression*

  variable_declaration:
    TYPE variable

  variable:
    ID

  literal:
    NUMBER | STRING


  * TOKENS

  NUMBER:
    decimal or hexedecimal(with 0x in front) number

  STRING:
    string enclosed in ""

  ID:
    any word, can contain numbers, except at the first position

  TYPE:
    short, int, long, float, reference, ref, string_var, array_var

  BEGIN:
    begin

  END:
    end

  LET:
    let

  SET:
    set

  EQUALS:
    =

  COLON_EQUALS:
    :=

  LPAREN:
    (

  RPAREN:
    )

  LBRACKET:
    {

  RBRACKET:
    }

*/

export class Parser {
  data: Token[][];
  variables: IdentifierNode[];

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

  parseVariable(): IdentifierNode {
    const variable = new IdentifierNode(this.cur_token!);
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

  parseAssignmentSet(): AssignmentNode {
    const set_token = this.cur_token!;

    this.nextToken();

    const variable = this.parseVariable();

    this.nextToken();

    return new AssignmentNode(set_token, variable, this.parseExpression());
  }

  parseAssignmentLet(): AssignmentNode {
    const let_token = this.cur_token!;

    this.nextToken();

    let variable;
    if (this.cur_token!.content.toLowerCase() in Tokens.TokensLower.Types) {
      variable = this.parseVariableDeclaration().identifier;
    } else {
      variable = this.parseVariable();
    }

    this.nextToken();

    return new AssignmentNode(let_token, variable, this.parseExpression());
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
      token = new IdentifierNode(this.cur_token!);
      this.nextToken();
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
      return this.parseVariableDeclaration();
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
    const token = this.cur_token!;

    this.nextToken();

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
