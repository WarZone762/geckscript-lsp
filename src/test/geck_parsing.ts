import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import { GetNodeLeafs, NodeToTreeDataFull, ResolveSymbol } from "../geckscript/ast";

import { Environment, TreeData } from "../geckscript/types";

// const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();
const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const scripts = new Environment();
scripts.processScript("test.gek", data).then(script => {
  console.log(NodeToTreeDataFull(script));
  console.log(GetNodeLeafs(script));

  console.log(scripts);
});