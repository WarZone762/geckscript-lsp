import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as Parser from "../geckscript/parser";

// const data = fs.readFileSync(path.join(__dirname, "../../test/test_geck_parsing.gek")).toString();
const data = fs.readFileSync(path.join(__dirname, "../../test/test.gek")).toString();

const script = Parser.Parser.Parse(data);

console.log(inspect(script, false, null, true));
