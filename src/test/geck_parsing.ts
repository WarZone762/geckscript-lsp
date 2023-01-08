import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import { parse_str, tree_to_str } from "../geckscript/parsing";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";

const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();

const output = parse_str(data);

console.log(tree_to_str(output[0], new Set([SyntaxKind.NEWLINE, SyntaxKind.WHITESPACE, SyntaxKind.COMMENT])));
// console.log(tree_to_str(output[0]));
// console.log(tree_to_str(output[0]));
console.log(output[1]);
