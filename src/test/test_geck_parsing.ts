import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as Lexer from "../geckscript/lexer";
import * as Parser from "../geckscript/parser";

const data = fs.readFileSync(path.join(__dirname, "./test_geck_parsing.gek")).toString();

const parser = new Parser.Parser(Lexer.GetTokens(data));

const expr = parser.parse();

Parser.Expression.PrettyPrint(expr);
// console.log(inspect(expr, false, null, true));
