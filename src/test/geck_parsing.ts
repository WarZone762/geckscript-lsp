import { to_debug } from "../geckscript/ast";
import { parse_str } from "../geckscript/parsing";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import * as fs from "fs";
import * as path from "path";

const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const output = parse_str(data);

console.log(
    // to_debug(output[0], new Set([SyntaxKind.NEWLINE, SyntaxKind.WHITESPACE, SyntaxKind.COMMENT]))
    to_debug(output[0])
);
