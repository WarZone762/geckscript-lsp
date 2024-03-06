#!/bin/env -S node --loader ts-node/esm

import assert from "assert";
import { toDebug } from "../geckscript/ast.js";
import { parseStr } from "../geckscript/parsing.js";
import * as fs from "fs/promises";
import test from "node:test";
import * as path from "path";
import * as url from "url";

const modulePath = url.fileURLToPath(import.meta.url);
const isMain = process.argv[1] === modulePath;

if (isMain) {
    const _Dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const testDir = path.resolve(path.join(_Dirname, "..", "..", "test"));

    test("Parsing", async (t) => {
        for (const f of await fs.readdir(testDir, { withFileTypes: true })) {
            if (f.isFile() && f.name.endsWith(".gek")) {
                const fullPath = path.resolve(path.join(testDir, f.name));

                await t.test(f.name, async () => await testFile(fullPath));
            }
        }
    });
}

export async function testFile(file: string) {
    const testData = (await fs.readFile(`${file}.ast`)).toString();

    assert.strictEqual(testData, await tree(file));
}

export async function tree(file: string): Promise<string> {
    return toDebug(parseStr((await fs.readFile(file)).toString())[0]);
}
