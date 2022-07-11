import { Position, Range } from "vscode-languageserver-textdocument";
import { Token, TokensStorage } from "./lexer";


export enum ExpressionType {
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
  children?: Record<string | number, any>;
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

  static PrettyPrint(objects: any, tab = "  ", indent = 0) {
    if (objects?.children != undefined) {
      console.log(objects.constructor.name);
      for (const [k, v] of Object.entries(objects.children)) {
        process.stdout.write(tab.repeat(1 + indent) + `${k}: `);
        this.PrettyPrint(v, tab, 1 + indent);
      }
    } else if (objects?.content != undefined) {
      console.log(objects.content);
    } else {
      console.log(objects.constructor.name);
      for (const [k, v] of Object.entries(objects)) {
        process.stdout.write(tab.repeat(1 + indent) + `${k}: `);
        this.PrettyPrint(v, tab, 1 + indent);
      }
    }
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

export class ConditionBlock extends Expression {
  children: {
    condition?: Expression;
    scope?: Scope;
    terminator?: Token;
  };

  constructor() {
    super();

    this.children = {};
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
    args: (Expression | Token)[];
  };

  constructor(func: Token) {
    super();

    this.type = ExpressionType.function_call;
    this.children = {
      name: func,
      args: []
    };
  }
}

export class BlockBegin extends Expression {
  children: {
    header: Expression;
    body?: Scope;
    terninator?: Token;
  };

  end?: Token;

  constructor() {
    super();

    this.type = ExpressionType.block_begin;
    this.children = {
      header: new Expression()
    };
  }
}

export class BlockIf extends Expression {
  children: {
    condition_blocks: ConditionBlock[];
    else_block?: Scope;
    terminator?: Token;
  };

  constructor() {
    super();

    this.type = ExpressionType.block_if;
    this.children = {
      condition_blocks: []
    };
  }
}

export class BlockWhile extends Expression {
  children: {
    condition: Expression;
    body?: Scope;
    terminator?: Token;
  };

  constructor() {
    super();

    this.type = ExpressionType.block_while;
    this.children = {
      condition: new Expression()
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

      case "if":
        return this.parseBlockIf();

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
        func_call.children.args.push(this.parseFuntionCall());
        continue;
      } else if (this.cur_token.content == ")") {
        break;
      } else {
        func_call.children.args.push(this.cur_token);
      }

      this.nextTokenOnLine();
    }

    this.nextToken();

    return func_call;
  }

  parseScope(terminators?: string | string[]): [Scope, Token?] {
    const scope = new Scope();

    if (terminators != undefined) {
      const terminators_map: Record<string, boolean> = {};
      const empty: string[] = [];
      empty.concat(terminators).forEach(t => terminators_map[t] = true);

      while (this.cur_token != undefined) {
        if (this.cur_token.content.toLowerCase() in terminators_map) {
          const terminator_token = this.cur_token;
          this.nextToken();

          return [scope, terminator_token];
        }

        scope.children.push(this.parseExpression());
      }
    } else {
      while (this.cur_token != undefined) {
        scope.children.push(this.parseExpression());
      }
    }

    return [scope, undefined];
  }

  parseConditionBlock(): ConditionBlock {
    const block = new ConditionBlock();

    this.nextTokenOnLine();

    if (this.cur_token?.content == "(") this.nextTokenOnLine();

    block.children.condition = this.parseExpression();

    [block.children.scope, block.children.terminator] = this.parseScope([
      "elseif", "else", "endif"
    ]);

    return block;
  }

  parseBlockBegin(): BlockBegin {
    const block = new BlockBegin();

    this.nextTokenOnLine();

    block.children.header = this.parseFuntionCall();

    [block.children.body, block.children.terninator] = this.parseScope("end");

    return block;
  }

  parseBlockIf(): BlockIf {
    const block = new BlockIf();

    let last_block = this.parseConditionBlock();

    while (last_block.children.terminator != undefined) {
      block.children.condition_blocks.push(last_block);

      if (last_block.children.terminator.content == "else") {
        [
          block.children.else_block,
          block.children.terminator
        ] = this.parseScope("endif");

        return block;
      } else if (last_block.children.terminator.content == "endif") {
        block.children.terminator = last_block.children.terminator;

        return block;
      }

      last_block = this.parseConditionBlock();
    }

    return block;
  }

  parseBlockWhile(): BlockWhile {
    const block = new BlockWhile();

    this.nextTokenOnLine();

    if (this.cur_token?.content == "(") this.nextTokenOnLine();

    block.children.condition = this.parseExpression();

    [block.children.body, block.children.terminator] = this.parseScope("loop");


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
