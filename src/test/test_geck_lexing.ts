import * as fs from "fs";
import * as path from "path";

import * as Lexer from "../geckscript/lexer";
import { TokenType } from "../geckscript/token_data";

const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const tokens = Lexer.Lexer.Lex(data);

for (const token of tokens) {
  if (token.type === TokenType.NEWLINE) process.stdout.write("NEWLINE\n");
  else if (token.type === TokenType.EOF) process.stdout.write("EOF\n");
  else {
    process.stdout.write(`{${token.content}}(${token.type})[${token.position.line}, ${token.position.character}, ${token.length}]`);
    process.stdout.write(" ");
  }
}
