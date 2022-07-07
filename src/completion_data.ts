import * as fs from "fs";
import * as path from "path";
import * as https from "https";

import * as htmlparser2 from "htmlparser2";
import * as DomUtils from "DomUtils";

import * as Completions from "./completions";

import { CompletionItem, CompletionItemKind } from "vscode-languageserver/node";


export function GetWikiPageSource(func_name: string): Promise<[string, string]> {
  const options: https.RequestOptions = {
    host: "geckwiki.com",
    path: `/index.php?title=${func_name}&action=edit`
  };

  return new Promise((resolve, reject) => {
    https.get(options, (response) => {
      let source = "";

      response.on("data", (chunk: string) => { source += chunk; });

      response.on("end", () => {
        console.log(`"${func_name}" page request finished`);
        if (/#redirect \[\[\w+\]\]/i.test(source)) {
          GetWikiPageSource(source.match(/(?<=#redirect \[\[)\w+(?=\]\])/i)?.[0] ?? "").then(resolve);
        } else {
          resolve([func_name, DomUtils.textContent(DomUtils.getElementsByTagName("textarea", htmlparser2.parseDocument(source))?.[0])]);
        }
      });
    });
  });
}

export class DataCache {
  static data: { [key: string]: FunctionData } = {};

  static Save(): void {
    fs.writeFileSync(path.join(__dirname, "../cache.json"), JSON.stringify(DataCache.data));
  }

  static Load(): void {
    if (!fs.existsSync(path.join(__dirname, "../cache.json"))) return;

    DataCache.data = JSON.parse(fs.readFileSync(path.join(__dirname, "../cache.json")).toString());
  }

}

export class FunctionData {
  name: string;
  origin?: string;
  alias?: string;
  summary?: string;
  return_type?: string;
  arguments: Array<string>;

  constructor() {
    this.name = "";
    this.arguments = [];
  }

  constructCompletionStrings(): [string, string] {
    let detail = "";
    let documentation = "";

    if (this.return_type) {
      detail += `(${this.return_type}) `;
    }

    detail += this.name;

    this.arguments.forEach(argument => {
      detail += ` ${argument}`;
    });

    if (this.alias) {
      documentation += `Or\n${detail.replace(this.name, this.alias)}\n\n`;
    }

    documentation += `Origin: ${this.origin}`;

    if (this.summary) {
      documentation += `\n\n${this.summary}`;
    }

    return [detail, documentation];
  }

  static GetData(func_name: string): Promise<FunctionData> {
    const func_data = new FunctionData();

    return new Promise<FunctionData>((resolve, reject) => {
      const cached_data = DataCache.data[func_name];
      if (cached_data) {
        resolve(cached_data);
        return;
      }

      GetWikiPageSource(func_name).then((data: [string, string]) => {
        const func_true_name = data[0];
        const page_source = data[1];

        func_data.name = func_true_name;
        func_data.origin = page_source.match(/(?<=\|origin\s*?=\s*?)\S.*/i)?.[0];
        func_data.alias = page_source.match(/(?<=\|alias\s*?=\s*?)\S.*/i)?.[0];
        func_data.summary = page_source.match(/(?<=\|summary\s*?=\s*?)\S.*?(?=\n.s*?\|)/is)?.[0];
        func_data.return_type = page_source.match(/(?<=\|returnType\s*?=\s*?)\S.*/i)?.[0];
        const func_args = page_source.match(/(?<={.*?{.*?FunctionArgument.*?)(?<=\|(Type|Name)\s*?=\s*?)\w.*?(?=\s*?}|$)(?=.*?}.*?})/sgim);
        if (func_args) {
          for (let i = 0; i < func_args.length; i += 2) {
            func_data.arguments.push(`${func_args[i]}:${func_args[i + 1]}`);
          }
        }

        DataCache.data[func_name] = func_data;
        DataCache.Save();

        resolve(func_data);
      });
    });
  }

  static GetCompletionStrings(func_name: string): Promise<[string, string]> {
    return FunctionData.GetData(func_name)
      .then(func_data => func_data.constructCompletionStrings());
  }

}

export const CompletionItems: {
  Functions: CompletionItem[];
} = {
  Functions: []
};

for (let i = 0; i < Completions.Functions.length; i++) {
  CompletionItems.Functions[i] = {
    label: Completions.Functions[i],
    kind: CompletionItemKind.Function,
    data: i
  };
}

