import { to_debug } from "../geckscript/ast";
import { ScopeNode } from "../geckscript/hir";
import { parse_str } from "../geckscript/parsing";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import * as fs from "fs";
import * as path from "path";

const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();

const output = parse_str(data);

// console.log(
//     print_tree(output[0], new Set([SyntaxKind.NEWLINE, SyntaxKind.WHITESPACE, SyntaxKind.COMMENT]))
// );
// console.log(tree_to_str(output[0]));
// console.log(output[1]);

ScopeNode.build(output[0]).traverse((s) => {
    s.decls.forEach((n) => console.log(to_debug(n.green)));
    s.refs.forEach((n) => console.log(to_debug(n.green)));
    console.log();
});
