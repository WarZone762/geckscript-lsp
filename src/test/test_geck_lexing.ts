import * as fs from "fs";
import * as path from "path";

import * as Lexer from "../geckscript/lexer";
import { TokenType } from "../geckscript/tokens";

const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const tokens = Lexer.GetTokens(data);

tokens.data.forEach((line_tokens: Lexer.Token[]) => {
  line_tokens.forEach((token: Lexer.Token) => {
    process.stdout.write(`{${token.content}}(${TokenType[token.type]})`);
    process.stdout.write(" ");
  });
  process.stdout.write("\n");
});
