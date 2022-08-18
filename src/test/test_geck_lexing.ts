import * as fs from "fs";
import * as path from "path";

import * as Lexer from "../geckscript/lexer";
import { SyntaxType } from "../geckscript/types";

const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const tokens = Lexer.Lexer.Lex(data);

for (const token of tokens) {
  if (token.type === SyntaxType.Newline) process.stdout.write("NEWLINE\n");
  else if (token.type === SyntaxType.EOF) process.stdout.write("EOF\n");
  else {
    process.stdout.write(
      `{${token.content}}` +
      `[${token.range.start.line}, ${token.range.start.character}, ` +
      `${token.range.end.line}, ${token.range.end.character}]`
    );
    process.stdout.write(" ");
  }
}


