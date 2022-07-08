import * as fs from "fs";
import * as path from "path";

import * as Lexer from "./lexer";

const data = fs.readFileSync(path.join(__dirname, "./test.gek")).toString();

const lexer = new Lexer.Lexer(data);

lexer.getTokens().forEach((line_tokens: Lexer.Token[]) => {
  line_tokens.forEach((token: Lexer.Token) => {
    process.stdout.write(`{${token.content}}(${Lexer.TokenType[token.type]})`);
    process.stdout.write(" ");
  });
  process.stdout.write("\n");
});
