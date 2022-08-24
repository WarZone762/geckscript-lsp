import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";
import { resolveSymbol } from "../geckscript/ast";

import { Environment } from "../geckscript/types";

// const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();
const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const scripts = new Environment();
const script = scripts.processScript("test.gek", data);
console.log(resolveSymbol(script.body, "iMaster"));

console.log(scripts);
