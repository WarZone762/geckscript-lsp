#!/bin/env -S node --loader ts-node/esm
import assert from "assert";
import * as fs from "fs/promises";
import test from "node:test";
import * as path from "path";
import * as url from "url";
import { TextDocument } from "vscode-languageserver-textdocument";

import { hir } from "../geckscript.js";
import { KeywordStyle, formatDoc } from "../language_features/format.js";

const modulePath = url.fileURLToPath(import.meta.url);
const isMain = process.argv[1] === modulePath;

const DB = new hir.FileDatabase();

if (isMain) {
    main();
}

export async function main() {
    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const testDir = path.resolve(path.join(__dirname, "..", "..", "test"));

    test("Formatting", async (t) => {
        for (const f of await fs.readdir(testDir, { withFileTypes: true })) {
            if (f.isFile() && f.name.endsWith(".gek")) {
                const formattedFile = path.resolve(path.join(testDir, "format", f.name));
                const fullPath = path.resolve(path.join(testDir, f.name));

                await t.test(f.name, async () => await testFile(fullPath, formattedFile));
            }
        }
    });
}

export async function testFile(file: string, astFile: string) {
    const testData = (await fs.readFile(astFile)).toString();

    assert.strictEqual(await format(file), testData);
}

export async function format(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const file = DB.parseFile(TextDocument.create("test", "geckscript", 0, content.toString()));

    const edits = formatDoc(
        file,
        {
            tabSize: 4,
            insertSpaces: true,
            trimFinalNewlines: true,
            insertFinalNewline: true,
            trimTrailingWhitespace: true,
        },
        { keywordStyle: KeywordStyle.LOWER }
    );

    return TextDocument.applyEdits(file.doc, edits);
}
