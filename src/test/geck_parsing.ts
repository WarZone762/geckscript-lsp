import { to_debug } from "../geckscript/ast.js";
import { parse_str } from "../geckscript/parsing.js";
import { SyntaxKind } from "../geckscript/syntax_kind/generated.js";
import * as fs from "fs";
import * as path from "path";

const data = fs.readFileSync(path.join("test/test.gek")).toString();

const output = parse_str(data);

console.log(
    // to_debug(output[0], new Set([SyntaxKind.NEWLINE, SyntaxKind.WHITESPACE, SyntaxKind.COMMENT]))
    to_debug(output[0])
);
