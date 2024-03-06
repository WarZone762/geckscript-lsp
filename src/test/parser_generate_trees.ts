#!/bin/env -S node --loader ts-node/esm

import { to_debug } from "../geckscript/ast.js";
import { parse_str } from "../geckscript/parsing.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const test_dir = path.resolve(path.join(__dirname, "..", "..", "test"));

for (const f of await fs.readdir(test_dir, { withFileTypes: true })) {
    if (f.isFile() && f.name.endsWith(".gek")) {
        const full_path = path.resolve(path.join(test_dir, f.name));

        const parsed = parse_str((await fs.readFile(full_path)).toString());

        const out = await fs.open(`${full_path}.ast`, "w");
        out.write(to_debug(parsed[0]));
        out.close();
    }
}
