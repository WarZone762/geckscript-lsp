#!/bin/env -S node --loader ts-node/esm
import * as fs from "fs/promises";
import * as path from "path";
import * as url from "url";

import { ast } from "../geckscript.js";
import { parseStr } from "../geckscript/parsing.js";

const _Dirname = url.fileURLToPath(new URL(".", import.meta.url));
const testDir = path.resolve(path.join(_Dirname, "..", "..", "test"));

for (const f of await fs.readdir(testDir, { withFileTypes: true })) {
    if (f.isFile() && f.name.endsWith(".gek")) {
        const fullPath = path.resolve(path.join(testDir, f.name));

        const parsed = parseStr((await fs.readFile(fullPath)).toString());

        const astPath = path.resolve(path.join(testDir, "ast", f.name));
        const out = await fs.open(`${astPath}.ast`, "w");
        out.write(ast.toDebug(parsed[0]));
        out.close();
    }
}
