#!/bin/env -S node --loader ts-node/esm
import assert from "assert";
import * as fs from "fs/promises";
import test from "node:test";
import * as path from "path";
import * as url from "url";

import { toDebug } from "../geckscript/ast.js";
import { parseStr } from "../geckscript/parsing.js";

const modulePath = url.fileURLToPath(import.meta.url);
const isMain = process.argv[1] === modulePath;

if (isMain) {
    main();
}

export async function main() {
    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const testDir = path.resolve(path.join(__dirname, "..", "..", "test"));

    test("Parsing", async (t) => {
        for (const f of await fs.readdir(testDir, { withFileTypes: true })) {
            if (f.isFile() && f.name.endsWith(".gek")) {
                const astFile = path.resolve(path.join(testDir, "ast", `${f.name}.ast`));
                const fullPath = path.resolve(path.join(testDir, f.name));

                await t.test(f.name, async () => await testFile(fullPath, astFile));
            }
        }
    });
}

export async function testFile(file: string, astFile: string) {
    const testData = (await fs.readFile(astFile)).toString();

    assert.strictEqual(await tree(file), testData);
}

export async function tree(file: string): Promise<string> {
    return toDebug(parseStr((await fs.readFile(file)).toString())[0]);
}
