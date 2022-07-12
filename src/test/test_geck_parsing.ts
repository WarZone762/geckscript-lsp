import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as Lexer from "../geckscript/lexer";
import * as Parser from "../geckscript/parser";

const data = fs.readFileSync(path.join(__dirname, "./test_geck_parsing.gek")).toString();

// Parser.Expression.PrettyPrint(Parser.GetAST(data));
console.log(inspect(Parser.GetAST(data).getTokenAtPos({ column: 11, line: 12 }), false, null, true));
// console.log(inspect(Lexer.GetTokens(data), false, null, true));
