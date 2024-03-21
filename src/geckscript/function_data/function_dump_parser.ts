#!/bin/env -S node --loader ts-node/esm
import assert from "assert";
import * as fs from "fs";
import * as url from "url";

import { FunctionDataJSON, FunctionParamJSON, isFunctionType } from "../function_data.js";

const modulePath = url.fileURLToPath(import.meta.url);
const isMain = process.argv[1] === modulePath;

if (isMain) {
    main();
}

export function main() {
    const data = fs.readFileSync(0);
    console.log(JSON.stringify(parseFunctionData(data.toString())));
}

export function parseFunctionData(str: string): FunctionDataJSON[] {
    const funcs = [];
    const lines = str.split("\n");
    let pos = 0;

    let line = lines[pos];
    while (line !== undefined) {
        if (line.startsWith("<p><a name=")) {
            const name = line.match(/<p><a name="(.*)"/)![1];
            line = lines[++pos];

            const alias = line.match(/<br><b>Alias:<\/b> (.*)<br>/)![1];
            line = lines[++pos];

            const params: FunctionParamJSON[] = [];
            while (!line.startsWith("<br><b>Return Type")) {
                let paramStr = line.match(/<br>&nbsp;&nbsp;&nbsp;(.*) /)![1];

                const match = paramStr.match(/<i>(.*)<\/i>/);
                let optional = false;

                if (match !== null) {
                    paramStr = match[1];
                    optional = true;
                }

                if (paramStr.includes(":")) {
                    const [paramName, paramType] = paramStr.split(":");
                    assert(isFunctionType(paramType));
                    params.push({
                        type: paramType,
                        name: (paramName.match(/(.+?) ?\([Oo]ptional\)/)?.[1] ?? paramName).trim(),
                        optional,
                    });
                } else {
                    assert(isFunctionType(paramStr));
                    params.push({ type: paramStr, optional });
                }

                line = lines[++pos];
            }

            const values = [];
            for (const field of line.matchAll(/br><b>(.*?):<\/b> (.*?)</g)) {
                values.push(field[2]);
            }

            const [retType, opcode, origin, isCondFunc, reqRef, descStr] = values;
            assert(isFunctionType(retType));
            let desc = descStr.match(/"(.*)"\.?/)?.[1] ?? descStr;
            desc = desc.replace(/(?<!\.)\.$/, "");

            funcs.push({
                name,
                alias: alias !== "none" ? alias : undefined,
                params,
                retType,
                opcode: parseInt(opcode),
                origin,
                isCondFunc: isCondFunc === "Yes",
                reqRef: reqRef === "Yes",
                desc: desc !== "none" && desc !== "" ? desc : undefined,
            });
        }

        line = lines[++pos];
    }

    return funcs;
}
