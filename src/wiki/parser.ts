export const enum SyntaxKind {
  Unknown,

  Text,
  PreformattedText,
  SquareBracket,
  Paired,
  Template,
}

export class Node {
  kind: SyntaxKind = SyntaxKind.Unknown;
}

export class Text extends Node {
  kind = SyntaxKind.Text;
  content = "";
}

export class PreformattedText extends Text {
  kind = SyntaxKind.PreformattedText;
}

export class SquareBracket extends Node {
  kind = SyntaxKind.SquareBracket;
  bracket_count = 0;
  inner: Node[] = [];
}

export class Paired extends Node {
  kind = SyntaxKind.Paired;
  inner: Node[] = [];
  chars = "";
}

export class Template extends Node {
  kind = SyntaxKind.Template;
  title!: Text;
  arguments: { [key: string]: any } = {};
}

let data: string;
let last_data_pos: number;

let cur_pos: number;

let cur_char: string;

let skip_space: boolean;

function Init(text: string) {
  data = text;
  last_data_pos = text.length - 1;
  cur_pos = 0;
  cur_char = text[0];

  skip_space = false;
}

function moreData(): boolean {
  return last_data_pos > cur_pos;
}

function skipChar(): void {
  cur_char = data[++cur_pos];
}

function skipSpace(): void {
  // while (moreData() && /[^\S\n]/.test(cur_char))
  while (moreData() && /\s/.test(cur_char))
    nextChar();
}

function nextChar(): string {
  const char = cur_char;
  skipChar();

  if (skip_space)
    skipSpace();

  return char;
}

function lookAhead(offset: number): string {
  return data[cur_pos + offset] ?? "";
}

function getNextChars(n: number): string {
  let text = "";
  for (let i = 0; i < n; ++i) {
    const next_char = lookAhead(i + 1);
    if (next_char == undefined) break;
    text += next_char;
  }

  return text;
}

function isPartTrailingSpace(): boolean {
  let i = 0;
  while (moreData() && /\s/.test(lookAhead(i)))
    ++i;

  if (lookAhead(i) === "|") return true;
  else return false;
}

function parseText(): Text {
  const node = new Text();

  while (
    moreData() &&
    cur_char !== "=" &&
    cur_char !== "{" &&
    cur_char !== "}" &&
    cur_char !== "[" &&
    cur_char !== "]" &&
    cur_char !== "|"
  ) {
    if (isPartTrailingSpace()) {
      skipSpace();
      break;
    } else {
      if (cur_char === "\n" && lookAhead(1) === " ") break;
      node.content += nextChar();
    }
  }

  node.content.trim();

  return node;
}

function parsePreformattedText(): PreformattedText {
  const node = new PreformattedText();

  skipChar();
  skipChar();

  node.content = parseText().content;

  return node;
}

function parseSquareBracket(): SquareBracket {
  const node = new SquareBracket();

  while (moreData() && cur_char === "[") {
    node.bracket_count += 1;
    skipChar();
  }

  while (moreData() && cur_char !== "]")
    node.inner.push(parseElement());

  for (let i = node.bracket_count; i > 0; --i)
    skipChar();

  return node;
}

function parsePairedChars(): Paired {
  const node = new Paired();

  const char = cur_char;

  while (moreData() && cur_char === char)
    node.chars += nextChar();

  while (moreData() && cur_char !== char)
    node.inner.push(parseElement());

  for (let i = node.chars.length; i > 0; --i)
    skipChar();

  return node;
}

function parsePart(): [string, Node[]] {
  let key = "";
  while (moreData() && cur_char != "=")
    key += nextChar();
  key = key.trim();

  skipChar();
  const value: Node[] = [];
  while (
    moreData() &&
    cur_char != "|" &&
    cur_char != "}"
  ) {
    const elem = parseElement();
    if (elem.kind === SyntaxKind.Text) {
      (elem as Text).content = (elem as Text).content.trim();
      if ((elem as Text).content.trim().length === 0) continue;
    }

    value.push(elem);
  }

  return [key, value];
}

function parseTemplate(): Template {
  const node = new Template();

  skipChar();
  skipChar();

  node.title = parseText();

  while (moreData() && cur_char != "}") {
    skipChar();
    const [k, v] = parsePart();

    node.arguments[k] = v;
  }

  skipChar();
  skipChar();

  return node;
}

function parseElement(): Node {
  if (cur_char + lookAhead(1) === "{{") {
    return parseTemplate();
  } else if (
    cur_char === "=" ||
    cur_char === "`" ||
    cur_char === "'"
  ) {
    return parsePairedChars();
  } else if (cur_char === "[") {
    return parseSquareBracket();
  } else if (cur_char === "\n" && lookAhead(1) === " ") {
    return parsePreformattedText();
  } else {
    return parseText();
  }
}

function parsePage(): Node[] {
  const nodes: Node[] = [];

  while (moreData()) {
    nodes.push(parseElement());
  }

  return nodes;
}

export function Parse(text: string): Node[] {
  Init(text);

  return parsePage();
}
