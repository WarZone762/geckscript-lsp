import * as fs from "fs";
import * as path from "path";
import * as https from "https";

import {
  CompletionItem,
  CompletionItemKind,
  MarkupContent,
  MarkupKind
} from "vscode-languageserver/node";

import * as TurndownService from "turndown";

import * as Tokens from "./geckscript/tokens";


export const CompletionItems: {
  Functions: CompletionItem[];
} = {
  Functions: []
};

for (let i = 0; i < Object.keys(Tokens.Functions).length; i++) {
  CompletionItems.Functions[i] = {
    label: Object.keys(Tokens.Functions)[i],
    kind: CompletionItemKind.Function,
    data: i
  };
}

export class DataCache {
  static data: { [key: string]: string } = {};

  static Save(): void {
    fs.writeFileSync(path.join(__dirname, "../cache.json"), JSON.stringify(DataCache.data));
  }

  static Load(): void {
    if (!fs.existsSync(path.join(__dirname, "../cache.json"))) return;

    DataCache.data = JSON.parse(fs.readFileSync(path.join(__dirname, "../cache.json")).toString());
  }

}

DataCache.Load();

const HTMLToMDConverter = new TurndownService();

HTMLToMDConverter.addRule("GECKWiki_code", {
  filter: (node, options) => {
    return !!(node.tagName === "PRE");
  },
  replacement: (content, node, options) => {
    return (
      "\n```GECKScript\n" +
      `${content.replace(/\n$/, "")}\n` +
      "```\n"
    );
  }
});

HTMLToMDConverter.addRule("GECKWiki_tr", {
  filter: ["tr"],
  replacement: (content, node, options) => {
    if (node.previousSibling != null) return content.replace(/\n$/, "") + "\n";
    return (
      `${content.replace(/\n$/, "")}\n` +
      "|-".repeat(node.childElementCount) + "|\n"
    );
  }
});

HTMLToMDConverter.addRule("GECKWiki_th", {
  filter: ["th", "td"],
  replacement: (content, node, options) => {
    return `|${content.replace(/\n$/, "")}${(node.nextSibling == null ? "|" : "")}`;
  }
});

async function GetWikiPage(page_title: string): Promise<string> {
  console.log(`Requesting "${page_title}" page`);
  return new Promise<string>((resolve, reject) => {
    https.get(
      `https://geckwiki.com/api.php?action=parse&page=${page_title}&redirects=1&prop=text&disabletoc=1&format=json`,
      (response) => {
        let page = "";

        response.on("data", chunk => page += chunk);

        response.on("end", () => {
          console.log(`"${page_title}" page request finished`);

          resolve(JSON.parse(page)?.parse?.text?.["*"]);
        });
      }
    );
  });
}

export async function GetPageMarkdown(page_title: string): Promise<MarkupContent> {
  if (DataCache.data?.[page_title] != undefined) return {
    kind: MarkupKind.Markdown,
    value: DataCache.data[page_title]
  };

  const markdown = HTMLToMDConverter.turndown(await GetWikiPage(page_title));
  DataCache.data[page_title] = markdown;
  DataCache.Save();

  return {
    kind: MarkupKind.Markdown,
    value: markdown
  };
}
