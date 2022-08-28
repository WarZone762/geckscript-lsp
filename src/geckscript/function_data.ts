import * as path from "path";
import * as fs from "fs";

import { GetFunctions } from "../wiki/functions";


export interface FunctionInfo {
  name: string;
  canonical_name: string;
  wiki_page_name: string;
}

const FilePath = path.join(
  __dirname,
  "../../resources",
  "functions.json"
);

const ignored_functions = [
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
    if (regex.test(name)) return name.replace(regex, "_");
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
    if (ignored_functions.find(v => v === func)) continue;

    const canoncial_name = renameFunc(func);
    const name = canoncial_name.toLowerCase();

    FunctionData[name] = {
      name: name,
      canonical_name: canoncial_name,
      wiki_page_name: func,
    };
  }
}

export async function DumpFunctionNames() {
  await fs.promises.writeFile(
    path.join(path.dirname(FilePath), "function_names.json"),
    JSON.stringify(Object.keys(FunctionData))
  );
}

export function GetFunctionInfo(function_name: string): FunctionInfo | undefined {
  return FunctionData[function_name];
}

PopulateFunctionData(false);
