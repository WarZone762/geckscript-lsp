#!/bin/env -S node --loader ts-node/esm

import { toDebug } from "../geckscript/ast.js";
import { parseStr } from "../geckscript/parsing.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as url from "url";

const _Dirname = url.fileURLToPath(new URL(".", import.meta.url));
const testDir = path.resolve(path.join(_Dirname, "..", "..", "test"));

for (const f of await fs.readdir(testDir, { withFileTypes: true })) {
    if (f.isFile() && f.name.endsWith(".gek")) {
        const fullPath = path.resolve(path.join(testDir, f.name));

        const parsed = parseStr((await fs.readFile(fullPath)).toString());

        const out = await fs.open(`${fullPath}.ast`, "w");
        out.write(toDebug(parsed[0]));
        out.close();
    }
}
