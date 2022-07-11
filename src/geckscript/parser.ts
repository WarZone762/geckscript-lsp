import { Position, Range } from "vscode-languageserver-textdocument";
import { Token, TokensStorage } from "./lexer";


export enum ExpressionType {
  arg_list,
  block_begin,
  block_foreach,
  block_if,
  block_while,
  expression,
  function_call,
  scope,
  script,
  TOTAL
}

export class Expression {
  type?: ExpressionType;
  children?: Record<string | number, any>;  //TODO: make an object
  range: Range;

  constructor() {
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

  prettyPrint(tab = "  ", indentation = 0): void {
    console.log(this.constructor.name);
    for (const [k, v] of Object.entries(this.children ?? {})) {
      process.stdout.write(tab.repeat(1 + indentation) + `${k}: `);
      if (v?.prettyPrint != undefined) {
        v.prettyPrint(tab, indentation + 1);
      } else {
        console.log(v?.content);
      }
    }
  }
}

export class ArgList extends Expression {
  children: (Expression | Token)[];

  constructor() {
    super();

    this.type = ExpressionType.arg_list;
    this.children = [];
  }
}

export class Scope extends Expression {
  children: Expression[];

  constructor() {
    super();

    this.type = ExpressionType.scope;
    this.children = [];
  }
}

export class Script extends Scope {
  name?: Token;

  constructor() {
    super();

    this.type = ExpressionType.script;
  }
}

export class FunctionCall extends Expression {
  children: {
    name: Token;
    args: ArgList;
  };

  constructor(func: Token) {
    super();

    this.type = ExpressionType.function_call;
    this.children = {
      name: func,
      args: new ArgList()
    };
  }
}

export class BlockBegin extends Expression {
  children: {
    header: Expression;
    body: Scope;
    terninator?: Token;
  };

  end?: Token;

  constructor() {
    super();

    this.type = ExpressionType.block_begin;
    this.children = {
      header: new Expression(),
      body: new Scope()
    };
  }
}

export class BlockIf extends Expression {
  children: {
    if_blocks: [[Expression, Scope], ...[Expression, Scope][]];
    else_block?: Scope;
    terminator?: Token;
  };

  constructor() {
    super();

    this.type = ExpressionType.block_if;
    this.children = {
      if_blocks: [[new Expression(), new Scope()]]
    };
  }
}

export class BlockWhile extends Expression {
  children: {
    condition: Expression;
    body: Scope;
    terminator?: Token;
  };

  constructor() {
    super();

    this.type = ExpressionType.block_while;
    this.children = {
      condition: new Expression(),
      body: new Scope()
    };
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

  parseExpression(): Expression {
    switch (this.cur_token?.content.toLowerCase()) {
      case "set":
        return new Expression();

      case "begin":
        return this.parseBlockBegin();

      case "while":
        return this.parseBlockWhile();

      default:
        return this.parseFuntionCall();
    }
  }

  parseFuntionCall(): FunctionCall {
    const func_call = new FunctionCall(this.cur_token as Token);
    this.nextTokenOnLine();

    while (this.cur_token != undefined) {
      if (this.cur_token.content == "(") {
        this.nextTokenOnLine();
        func_call.children.args.children.push(this.parseFuntionCall());
        continue;
      } else if (this.cur_token.content == ")") {
        break;
      } else {
        func_call.children.args.children.push(this.cur_token);
      }

      this.nextTokenOnLine();
    }

    this.nextToken();

    return func_call;
  }

  parseBlockBegin(): BlockBegin {
    const block = new BlockBegin();

    this.nextTokenOnLine();

    block.children.header = this.parseFuntionCall();

    while (this.cur_token != undefined) {
      if (this.cur_token.content.toLowerCase() == "end") {
        block.children.terninator = this.cur_token;

        this.nextToken();
        break;
      }

      block.children.body.children.push(this.parseExpression());
    }

    return block;
  }

  parseBlockWhile(): BlockWhile {
    const block = new BlockWhile();

    this.nextTokenOnLine();

    if (this.cur_token?.content == "(") this.nextTokenOnLine();

    block.children.condition = this.parseExpression();

    while (this.cur_token != undefined) {
      if (this.cur_token.content.toLowerCase() == "loop") {
        block.children.terminator = this.cur_token;

        this.nextToken();
        break;
      }

      block.children.body.children.push(this.parseExpression());
    }

    return block;
  }

  parse(): Script {
    const script = new Script();

    if (this.cur_token == undefined) return script;

    if (
      this.cur_token.content.toLowerCase() == "scn" ||
      this.cur_token.content.toLowerCase() == "scriptname"
    ) {
      this.nextTokenOnLine();
      if (this.cur_token != undefined) {
        script.name = this.cur_token;
      }

      this.nextToken();
    }

    while (this.cur_token != undefined) {
      script.children.push(this.parseExpression());
    }

    return script;
  }
}
