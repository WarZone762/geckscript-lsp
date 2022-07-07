import * as fs from "fs";
import * as path from "path";

import * as Lexer from "./lexer";

const data = fs.readFileSync(path.join(__dirname, "./test.gek")).toString();

const lexer = new Lexer.Lexer(data);

let line: (string | undefined)[] | undefined = [];
while ((line = lexer.lexLine())) {

  console.log(line);
}
