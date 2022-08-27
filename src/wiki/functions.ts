import * as fs from "fs";
import * as path from "path";

import * as api from "./api";


const CachePath = path.join(
  __dirname,
  "../../resources",
  "function_page_cache.json"
);

const FunctionPageCache: { [key: string]: string } = fs.existsSync(CachePath) ?
  JSON.parse(fs.readFileSync(CachePath).toString()) :
  {};

async function SaveCache() {
  fs.promises.writeFile(CachePath, JSON.stringify(FunctionPageCache));
}

export interface Template {
  title: string;
  arguments: { [key: string]: any };
}

export interface FunctionArgumentTemplate {
  Name?: string;
  Type?: string;
  Optional?: string;
  Value?: string;
}

export const enum FunctionTemplateOrigin {
  "CONSOLENV" = "console functions",
  "GECK1" = "GECK 1.1",
  "GECK1.5" = "GECK 1.5",
  "FOSE1" = "FOSE v1",
  "VEGAS1" = "GECK 1.1 New Vegas",
  "NVSE" = "NVSE",
  "NX" = "NX plugin",
  "LU" = "Lutana Plugin",
  "PN" = "Project Nevada",
  "MCM" = "MCM",
  "UDF" = "UDF",
  "JIP" = "JIP",
  "JohnnyGuitar" = "Johnny Guitar",
  "SUP" = "SUP NVSE",
  "kNVSE" = "kNVSE Plugin",
  "TTW" = "TTW",
  "LNONLY" = "Lutana, not merged in JIP",
  "BookMenu" = "Book Menu Restored",
  "CommandExtender" = "Command Extender",
  "HotReload" = "Hot Reload",
  "ShowOff" = "ShowOff NVSE",
  "Anh" = "AnhNVSE",
  "ClearCommand" = "Clear Command NVSE"
}

export interface FunctionTemplate {
  CSWikiPage?: string;
  origin?: keyof FunctionArgumentTemplate;
  originVersion?: string;
  summary?: string;
  name?: string
  alias?: string;
  returnVal?: string;
  returnType?: string;
  referenceType?: string;
  arguments?: (FunctionArgumentTemplate | string)[];
  example?: string;
  CategoryList?: string[];
  consoleOnly?: string;
  conditionFunc?: "Condition" | "Script" | "Both"
}

export function ParseTemplate(obj: any): Template | FunctionArgumentTemplate | FunctionTemplate {
  const title = obj.title[0].trim();
  switch (title) {
    case "Function": {
      const template: FunctionTemplate = {};
      for (const arg of obj.part) {
        const k = arg.name[0] as keyof FunctionTemplate;
        const v = arg.value[0];

        switch (typeof v) {
          case "string":
            (template[k] as any) = v.trim();
            break;

          case "object":
            if (v.template[0] != undefined)
              (template[k] as any) = ParseTemplate(v.template[0]);
            break;
        }
      }

      return template;
    }

    case "FunctionArgument": {
      const template: FunctionArgumentTemplate = {};
      for (const arg of obj.part) {
        (template[arg.name[0] as keyof FunctionArgumentTemplate] as any) =
          arg.value[0].trim();
      }

      return template;
    }

    default: {
      const args: { [key: string]: any } = {};

      for (const arg of obj.part) {
        const k = arg.name[0].trim();
        const v = arg.value[0];

        switch (typeof v) {
          case "string":
            args[k] = v.trim();
            break;

          case "object":
            if (v.template[0] != undefined)
              args[k] = ParseTemplate(v.template[0]);
            break;
        }
      }

      return {
        title: title,
        arguments: args,
      };
    }
  }
}

export async function GetFunctions(): Promise<string[]> {
  return (await api.GetCategoryPages("Category:Functions (All)", ["page"]))
    .concat(await api.GetCategoryPages("Category:Function Alias", ["page"]));
}

export async function GetFunctionDocumentation(function_name: string) {
  let xml: any;

  if (FunctionPageCache[function_name] != undefined) {
    xml = FunctionPageCache[function_name];
  } else {
    xml = await api.ParsePageWikitext(function_name);
    FunctionPageCache[function_name] = xml;
    SaveCache();
  }

  return ParseTemplate(xml.root.template[0]);
}
