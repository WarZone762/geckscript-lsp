import { Position, Range } from "vscode-languageserver-textdocument";
import { Token, TokensStorage } from "./lexer";


export enum ExpressionType {
  block_begin,
  block_foreach,
  block_if,
  block_while,
  expression,
  script,
  TOTAL
}

export class Expression {
  type: ExpressionType;
  children: (Expression | Token)[];
  range: Range;

  constructor(type: ExpressionType) {
    this.type = type;
    this.children = [];
    this.range = {
      start: {
        character: 0,
        line: 0
      },
      end: {
        character: 0,
        line: 0
      }
    };
  }
}

export class HeaderExpression extends Expression {
  header: Expression;
  header_range: Range;

  constructor(
    type: ExpressionType,
  ) {
    super(type);

    this.header = new Expression(ExpressionType.expression);
    this.header_range = {
      start: {
        character: 0,
        line: 0
      },
      end: {
        character: 0,
        line: 0
      }
    };
  }
}

export class NamedExpression extends Expression {
  name: string | undefined;

  constructor(type: ExpressionType, name?: string) {
    super(type);

    this.name = name ?? undefined;
  }
}

export class Parser {
  data: TokensStorage;

  cur_token_pos: Position;
  cur_token: Token | undefined;

  constructor(data: TokensStorage) {
    this.data = data;

    this.cur_token_pos = {
      character: 0,
      line: 0
    };

    this.cur_token = data.data[0][0];

    while (this.cur_token == undefined) {
      this.nextToken();
    }
  }

  nextLine(): void {
    this.cur_token_pos.character = 0;
    this.cur_token = this.data.data?.[++this.cur_token_pos.line]?.[0];
  }

  nextTokenOnLine(): void {
    this.cur_token = this.data.data?.[this.cur_token_pos.line]?.[++this.cur_token_pos.character];
  }

  nextToken(): void {
    this.nextTokenOnLine();
    while (this.cur_token == undefined && this.cur_token_pos.line < this.data.data.length) {
      this.nextLine();
    }
  }

  parseExpression(parent: Expression): void {
    if (this.cur_token?.content == "set") {
      return;
    } else {
      const expr = new NamedExpression(ExpressionType.expression);
      expr.name = this.cur_token?.content;
      this.nextTokenOnLine();

      while (this.cur_token != undefined) {
        if (this.cur_token.content == "(") {
          this.nextTokenOnLine();
          this.parseExpression(expr);
        } else if (this.cur_token.content == ")") {
          break;
        } else {
          expr.children.push(this.cur_token);
        }

        this.nextTokenOnLine();
      }

      parent.children.push(expr);
    }
  }

  parseScope(parent: Expression): void {
    if (parent.type == ExpressionType.script) {
      while (this.cur_token != undefined) {
        this.parseExpression(parent);

        this.nextToken();
      }
    } else if (parent.type == ExpressionType.block_if) {
      return;
    } else {
      let terminator: string;
      switch (parent.type) {
        case ExpressionType.block_begin:
          terminator = "end";
          break;

        case ExpressionType.block_foreach:
        case ExpressionType.block_while:
          terminator = "loop";
          break;

        default:
          return;
      }

      while (this.cur_token != undefined && this.cur_token.content != terminator) {
        this.parseExpression(parent);

        this.nextToken();
      }
    }
  }

  parse(): NamedExpression {
    const script = new NamedExpression(ExpressionType.script);

    if (this.cur_token == undefined) return script;

    if (
      this.cur_token.content.toLowerCase() == "scn" ||
      this.cur_token.content.toLowerCase() == "scriptname"
    ) {
      this.nextTokenOnLine();
      if (this.cur_token != undefined) {
        script.name = this.cur_token.content;
      }

      this.nextToken();
    }

    this.parseScope(script);

    return script;
  }
}
