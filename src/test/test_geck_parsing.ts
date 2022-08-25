import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import { GetNodeLeafs, NodeToTreeData, ResolveSymbol } from "../geckscript/ast";

import { Environment, TreeData } from "../geckscript/types";

// const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();
const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const scripts = new Environment();
const script = scripts.processScript("test.gek", data);
console.log(NodeToTreeData(script));
console.log(GetNodeLeafs(script));

console.log(scripts);
