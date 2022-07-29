import { GetTokens, Lexer, Token, TokenPosition, TokensStorage } from "./lexer";


export const enum ExpressionType {
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

export type Range = {
  start: TokenPosition,
  end: TokenPosition
}

export class Expression {
  type?: ExpressionType;
  range: Range;
  children?: Record<string | number, any>;

  constructor() {
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

  getTokenAtPos(pos: TokenPosition): Element | undefined {
    if (this.children == undefined) return undefined;

    for (const [k, v] of Object.entries(this.children)) {
      if (v?.getTokenAtPos != undefined) {
        const result = v.getTokenAtPos(pos);
        if (result != undefined) return result;

        if (
          v.range.start.line <= pos.line &&
          v.range.start.column <= pos.column &&
          v.range.end.line >= pos.line &&
          v.range.end.column >= pos.column
        ) {
          return v;
        }
      } else if (v?.isArray != undefined && v.isArray() == true) {
        v.forEach((entry: any) => {
          if (entry?.getTokenAtPos != undefined) {
            const result = entry.getTokenAtPos(pos);
            if (result != undefined) return result;

            if (
              entry.range.start.line <= pos.line &&
              entry.range.start.column <= pos.column &&
              entry.range.end.line >= pos.line &&
              entry.range.end.column >= pos.column
            ) {
              return entry;
            }
          }
        });
      }
    }

    return undefined;
  }

  static PrettyPrint(objects: any, tab = "  ", indent = 0): void {
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

export class Script extends Expression {
  children: {
    name?: Token;
    scope: Scope;
  };

  constructor() {
    super();

    this.type = ExpressionType.script;
    this.children = {
      scope: new Scope()
    };
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
    terminator?: Token;
  };

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

  cur_token_pos: TokenPosition;
  cur_token: Token | undefined;

  constructor(data: TokensStorage) {
    this.data = data;

    this.cur_token_pos = {
      column: 0,
      line: 0
    };

    this.cur_token = data.data[0][0];

    while (this.cur_token == undefined) {
      this.nextToken();
    }
  }

  nextLine(): void {
    this.cur_token_pos.column = 0;
    this.cur_token = this.data.data?.[++this.cur_token_pos.line]?.[0];
  }

  nextTokenOnLine(): void {
    this.cur_token = this.data.data?.[this.cur_token_pos.line]?.[++this.cur_token_pos.column];
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
    const func_call = new FunctionCall(this.cur_token!);
    func_call.range.start = this.cur_token!.position;
    this.nextTokenOnLine();

    while (this.cur_token != undefined) {
      if (this.cur_token.content == "(") {
        this.nextTokenOnLine();
        func_call.children.args.push(this.parseFuntionCall());
        continue;
      } else if (this.cur_token.content == ")") {
        func_call.range.end = this.cur_token!.getLastPos();
        break;
      } else {
        func_call.children.args.push(this.cur_token);
      }

      func_call.range.end = this.cur_token!.getLastPos();

      this.nextTokenOnLine();
    }

    this.nextToken();

    return func_call;
  }

  parseScope(terminators?: string | string[]): [Scope, Token?] {
    const scope = new Scope();

    scope.range.start = this.cur_token!.position;

    if (terminators != undefined) {
      const terminators_map: Record<string, boolean> = {};
      const empty: string[] = [];
      empty.concat(terminators).forEach(t => terminators_map[t] = true);

      while (this.cur_token != undefined) {
        if (this.cur_token.content.toLowerCase() in terminators_map) {
          const terminator_token = this.cur_token;

          scope.range.end = terminator_token.getLastPos();

          this.nextToken();

          return [scope, terminator_token];
        }

        scope.children.push(this.parseExpression());
      }
    } else {
      while (this.cur_token != undefined) {
        scope.children.push(this.parseExpression());

        scope.range.end = this.cur_token.getLastPos();
      }
    }

    return [scope, undefined];
  }

  parseConditionBlock(): ConditionBlock {
    const block = new ConditionBlock();

    block.range.start = this.cur_token!.position;

    this.nextTokenOnLine();

    if (this.cur_token?.content == "(") this.nextTokenOnLine();

    block.children.condition = this.parseExpression();

    [block.children.scope, block.children.terminator] = this.parseScope([
      "elseif", "else", "endif"
    ]);

    if (block.children.terminator != undefined) {
      block.range.end = block.children.terminator.getLastPos();
    } else {
      block.range.end = this.cur_token_pos;
      block.range.end.column = Infinity;
    }

    return block;
  }

  parseBlockBegin(): BlockBegin {
    const block = new BlockBegin();

    block.range.start = this.cur_token!.position;

    this.nextTokenOnLine();

    block.children.header = this.parseFuntionCall();

    [block.children.body, block.children.terminator] = this.parseScope("end");

    if (block.children.terminator != undefined) {
      block.range.end = block.children.terminator.getLastPos();
    } else {
      block.range.end = this.cur_token_pos;
      block.range.end.column = Infinity;
    }


    return block;
  }

  parseBlockIf(): BlockIf {
    const block = new BlockIf();

    block.range.start = this.cur_token!.position;

    let last_block = this.parseConditionBlock();

    while (last_block.children.terminator != undefined) {
      block.children.condition_blocks.push(last_block);

      if (last_block.children.terminator.content == "else") {
        [
          block.children.else_block,
          block.children.terminator
        ] = this.parseScope("endif");

        if (block.children.terminator != undefined) {
          block.range.end = block.children.terminator.getLastPos();
        } else {
          block.range.end = this.cur_token_pos;
          block.range.end.column = Infinity;
        }

        return block;
      } else if (last_block.children.terminator.content == "endif") {
        block.children.terminator = last_block.children.terminator;

        block.range.end = block.children.terminator.getLastPos();

        return block;
      }

      last_block = this.parseConditionBlock();
    }

    block.range.end = this.cur_token_pos;
    block.range.end.column = Infinity;

    return block;
  }

  parseBlockWhile(): BlockWhile {
    const block = new BlockWhile();

    block.range.start = this.cur_token!.position;

    this.nextTokenOnLine();

    if (this.cur_token?.content == "(") this.nextTokenOnLine();

    block.children.condition = this.parseExpression();

    [block.children.body, block.children.terminator] = this.parseScope("loop");

    if (block.children.terminator != undefined) {
      block.range.end = block.children.terminator.getLastPos();
    } else {
      block.range.end = this.cur_token_pos;
      block.range.end.column = Infinity;
    }

    return block;
  }

  parse(): Script {
    const script = new Script();

    if (this.cur_token == undefined) return script;

    script.range.start = this.cur_token!.position;

    if (
      this.cur_token.content.toLowerCase() == "scn" ||
      this.cur_token.content.toLowerCase() == "scriptname"
    ) {
      this.nextTokenOnLine();
      if (this.cur_token != undefined) {
        script.children.name = this.cur_token;
      }

      this.nextToken();
    }

    while (this.cur_token != undefined) {
      script.children.scope.children.push(this.parseExpression());
    }

    script.range.end = this.cur_token_pos;
    script.range.end.column = Infinity;

    return script;
  }
}

export function GetAST(text: string): Script {
  const parser = new Parser(GetTokens(text));

  return parser.parse();
}
