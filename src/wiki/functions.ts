import * as fs from "fs";
import * as path from "path";

import { JSDOM } from "jsdom";

import * as api from "./api";
import { FunctionInfo } from "../geckscript/function_data";


const CachePath = path.join(
  __dirname,
  "../../resources",
  "function_page_cache.json"
);

const FunctionPageCache: { [key: string]: string } = fs.existsSync(CachePath) ?
  JSON.parse(fs.readFileSync(CachePath).toString()) :
  {};

async function SaveCache() {
  await fs.promises.writeFile(CachePath, JSON.stringify(FunctionPageCache));
}

async function GetCacheValue(key: string): Promise<string | undefined> {
  if (FunctionPageCache[key] != undefined) {
    return FunctionPageCache[key];
  } else {
    const value = await api.GetPageWikitext(key);
    if (value != undefined) {
      FunctionPageCache[key] = value;
      await SaveCache();
    }

    return value;
  }
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

export interface FunctionDocumentation {
  template: FunctionTemplate;
  text: string;
}

function ParseTextNodes(element: Element): string {
  let text = "";
  for (let i = 0; i < element.childNodes.length; ++i) {
    switch ((element.childNodes[i] as Element)?.tagName) {
      case "ext":
        text += "```\n" + element.childNodes[i].childNodes[2].textContent + "\n```\n\n";
        break;

      case "h":
        text += element.childNodes[i].textContent
          ?.replaceAll("=", "#")
          .replace(/#(?=[^\s#])/, "# ")
          .replace(/(?<=[^\s#])#/, " #")
          .replaceAll("'''", "**")
          .replaceAll("''", "*");
        break;


      default: {
        let str = element.childNodes[i].textContent!
          .replaceAll(/\*(?=\S)/g, "* ")
          .replaceAll("'''", "**")
          .replaceAll("''", "*");

        for (const m of str.match(/(?<!\[)\[[^[].*?\](?!\])/g) ?? []) {
          const [link, label] = m.substring(1, m.length - 1).split(/ (.*)/);
          str = str.replace(m, `[${label}](${link.replaceAll(" ", "_")})`);
        }

        for (const m of str.match(/\[\[.*?\]\]/g) ?? []) {
          if (m.includes("Category:")) {
            str = str.replace(m, "");
            continue;
          }
          const page_name = m.substring(2, m.length - 2);
          str = str.replace(m, `[${page_name}](https:geckwiki.com/index.php?title=${page_name.replaceAll(" ", "_")})`);
        }

        str = str.replaceAll("\n ", "\n\t");

        text += str;
      }

    }
  }

  return text.trim();
}

function ParsePart(element: Element): [string, any] {
  const k = element.children[0].textContent!.trim();
  const v = element.children[1];

  if (v.children[0]?.tagName == "template") {
    const args: FunctionArgumentTemplate[] = [];
    for (let i = 0; i < v.childElementCount; ++i)
      args.push(ParseTemplate(v.children[i]) as FunctionArgumentTemplate);

    return [k, args];
  } else {
    return [k, ParseTextNodes(v)];
  }
}

export function ParseTemplate(element: Element): Template | FunctionArgumentTemplate | FunctionTemplate {
  const title = element.children[0].textContent!.trim();

  const template: { [key: string]: any } = {};
  for (let i = 1; i < element.children.length; ++i) {
    const [k, v] = ParsePart(element.children[i]);

    template[k] = v;
  }
  switch (title) {
    case "Function":
      return template as FunctionTemplate;

    case "FunctionArgument":
      return template as FunctionArgumentTemplate;

    default:
      return {
        title: title,
        arguments: template,
      };
  }
}

export async function GetFunctions(): Promise<string[]> {
  return (await api.GetCategoryPages("Category:Functions (All)", ["page"]))
    .concat(await api.GetCategoryPages("Category:Function Alias", ["page"]));
}

export async function GetFunctionDocumentation(page_name: string): Promise<FunctionDocumentation | undefined> {
  const xml = await GetCacheValue(page_name);
  if (xml == undefined) return undefined;

  const jsdom = new JSDOM(xml, { contentType: "text/xml" });
  const root = jsdom.window.document.children[0];
  const template = ParseTemplate(root.children[0]) as FunctionTemplate;

  root.children[0].remove();

  return {
    template: template,
    text: ParseTextNodes(root),
  };
}

export function GetFunctionSignature(func_info: FunctionInfo, doc: FunctionDocumentation) {
  let signature = "";

  if (
    doc.template.returnVal != undefined ||
    doc.template.returnType != undefined
  ) {
    signature += "(";

    if (doc.template.returnVal != undefined)
      signature += `${doc.template.returnVal}:`;

    if (doc.template.returnType != undefined)
      signature += doc.template.returnType;

    signature += ") ";
  }


  signature += `${doc.template.name ?? func_info.canonical_name} `;

  for (const arg of doc.template.arguments ?? []) {
    if (arg instanceof String) {
      signature += arg;
    } else {
      if ((arg as FunctionArgumentTemplate)?.Name != undefined)
        signature += `${(arg as FunctionArgumentTemplate).Name}:`;

      if ((arg as FunctionArgumentTemplate)?.Type != undefined)
        signature += `${(arg as FunctionArgumentTemplate).Type}`;

      if ((arg as FunctionArgumentTemplate)?.Value != undefined)
        signature += `{${(arg as FunctionArgumentTemplate).Value}}`;

      if ((arg as FunctionArgumentTemplate)?.Optional != undefined) {
        signature += "?";
      }

    }

    signature += " ";
  }

  return signature;
}