#!/bin/env -S node --loader ts-node/esm

import assert from "assert";
import { to_debug } from "../geckscript/ast.js";
import { parse_str } from "../geckscript/parsing.js";
import * as fs from "fs/promises";
import test from "node:test";
import * as path from "path";
import * as url from "url";

const module_path = url.fileURLToPath(import.meta.url);
const is_main = process.argv[1] === module_path;

if (is_main) {
    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const test_dir = path.resolve(path.join(__dirname, "..", "..", "test"));

    test("Parsing", async (t) => {
        for (const f of await fs.readdir(test_dir, { withFileTypes: true })) {
            if (f.isFile() && f.name.endsWith(".gek")) {
                const full_path = path.resolve(path.join(test_dir, f.name));

                await t.test(f.name, async () => await test_file(full_path));
            }
        }
    });
}

export async function test_file(file: string) {
    const test_data = (await fs.readFile(`${file}.ast`)).toString();

    assert.strictEqual(test_data, await tree(file));
}

export async function tree(file: string): Promise<string> {
    return to_debug(parse_str((await fs.readFile(file)).toString())[0]);
}
