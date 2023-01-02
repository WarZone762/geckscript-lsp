import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import { parse_string, tree_to_str } from "../geckscript/parsing";

const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();
// const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const output = parse_string(data);

console.log(tree_to_str(output[0]));
console.log(output[1]);
