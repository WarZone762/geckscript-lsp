import * as path from "path";
import * as fs from "fs";

import * as wiki from "../wiki/api";


export interface FunctionInfo {
  name: string;
  canonical_name: string;
  wiki_page_name: string;
}

const FunctionData: { [key: string]: FunctionInfo } = {};

const FilePath = path.join(
  __dirname,
  "../../resources",
  "functions.json"
);

if (fs.existsSync(FilePath)) {
  PopulateFunctionData(JSON.parse(fs.readFileSync(FilePath).toString()));
} else {
  UpdateFunctionsFile().then(PopulateFunctionData);
}

const ignored_functions = ["While"];
const rename_map: { [key: string]: string } = {
  "MenuMode (Function)": "MenuMode",
};

async function UpdateFunctionsFile() {
  const functions = await wiki.GetFunctions();
  fs.promises.writeFile(FilePath, JSON.stringify(functions));

  return functions;
}

async function PopulateFunctionData(functions: string[]) {
  for (const func of functions) {
    if (ignored_functions.find(v => v === func)) continue;

    const canoncial_name = rename_map[func] ?? func;
    const name = canoncial_name.toLowerCase();

    FunctionData[name] = {
      name: name,
      canonical_name: canoncial_name,
      wiki_page_name: func,
    };
  }
}

export function GetFunctionInfo(function_name: string): FunctionInfo | undefined {
  return FunctionData[function_name];
}
