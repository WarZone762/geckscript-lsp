import * as fs from "fs";
import * as path from "path";

import { GetFunctionDocumentation, GetFunctions } from "../wiki/functions.js";
import { ExprType, Symbol, SymbolKind } from "./hir/hir.js";

export interface FunctionInfo {
    name: string;
    canonicalName: string;
    wikiPageName: string;
}

const FilePath = path.join("resources", "functions.json");

const ignoredFunctions = [
    "Break",
    "Continue",
    "ForEach",
    "Loop",
    "Return",
    "While",

    "Template:Function",
    "Template:Function (Test)",
    "NVSE Event Handling",

    "Use workbook",
];

function renameFunc(name: string): string {
    for (const regex of [
        /(?<=^Ar) /,
        /(?<=^Con) /,
        /(?<=^Matrix(3x3)?) /,
        /(?<=^NX) /,
        /(?<=^Quaternion) /,
        /(?<=^SayTo) /,
        /(?<=^Sv) /,
        /(?<=^TTW) /,
        / (?=Cached$)/,

        /(?<=^Mat) /,
        /(?<=^Pinto) /,
        /(?<=^Quat) /,
    ]) {
        if (regex.test(name)) {
            return name.replace(regex, "_");
        }
    }

    return name.replace(/ \(Function\)$/, "");
}

export let FunctionData: { [key: string]: FunctionInfo } = {};

export async function PopulateFunctionData(update = false) {
    let functions: string[] = [];

    if (fs.existsSync(FilePath) && !update) {
        functions = JSON.parse(fs.readFileSync(FilePath).toString());
    } else {
        console.log("Updating funtion database");
        functions = await GetFunctions();
        await fs.promises.writeFile(FilePath, JSON.stringify(functions));
        console.log("Function database update completed");
    }

    FunctionData = {};
    for (const func of functions) {
        if (ignoredFunctions.find((v) => v === func)) {
            continue;
        }

        const canoncialName = renameFunc(func);
        const name = canoncialName.toLowerCase();

        FunctionData[name] = {
            name: name,
            canonicalName: canoncialName,
            wikiPageName: func,
        };
    }
}

export function GetFunctionInfo(functionName: string): FunctionInfo | undefined {
    return FunctionData[functionName];
}

export async function CreateGlobalFunctionSymbol(
    functionName: string
): Promise<Symbol | undefined> {
    const functionInfo = GetFunctionInfo(functionName);
    if (functionInfo == undefined) {
        return undefined;
    }

    // return {
    //     kind: SymbolKind.Function,
    //     name: functionInfo.canonicalName,
    // };
}

export async function DumpFunctionNames() {
    await fs.promises.writeFile(
        path.join(path.dirname(FilePath), "functionNames.json"),
        JSON.stringify(Object.keys(FunctionData))
    );
}

PopulateFunctionData(false);
