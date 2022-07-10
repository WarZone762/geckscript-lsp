import * as fs from "fs";
import * as path from "path";
import * as https from "https";

import {
  MarkupContent,
  MarkupKind
} from "vscode-languageserver/node";

import * as TurndownService from "turndown";


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

export const HTMLToMDConverter = new TurndownService();

HTMLToMDConverter.addRule("GECKWiki_code", {
  filter: (node, options) => {
    return !!(node.tagName === "PRE");
  },
  replacement: (content, node, options) => {
    return (
      "\n```GECKScript\n" +
      `${content.replace(/\n$/, "").replaceAll("\\", "")}\n` +
      "```\n"
    );
  }
});

HTMLToMDConverter.addRule("GECKWiki_tr", {
  filter: "tr",
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

HTMLToMDConverter.addRule("GECKWiki_i", {
  filter: "i",
  replacement: (content, node, options) => {
    return content;
  }
});

HTMLToMDConverter.addRule("GECKWiki_div#contentSub", {
  filter: (node, options) => {
    return !!(node.tagName === "DIV" && node.id === "contentSub");
  },
  replacement: (content, node, options) => {
    return "";
  }
});

export async function RequestGet(url: string): Promise<string | undefined> {
  console.log(`Starting request GET "${url}"`);

  return new Promise<string | undefined>((resolve, reject) => {
    https.get(url, (response) => {
      let data = "";

      response.on("data", chunk => data += chunk);

      response.on("end", () => {
        console.log(`Request GET ${url} successful`);

        resolve(data);
      });

      response.on("error", (error) => {
        console.log(`Request GET ${url} failed (${error})`);

        resolve(undefined);
      });
    }
    );
  });
}

async function GetWikiPage(page_title: string): Promise<string | undefined> {
  const response = await RequestGet(`https://geckwiki.com/api.php?action=parse&page=${page_title}&redirects=1&prop=text&disabletoc=1&format=json`);

  if (response == undefined) return undefined;

  return JSON.parse(response)?.parse?.text?.["*"];
}

const PageMarkdownRequstsRunning: Record<string, Promise<MarkupContent>> = {};

export async function GetPageMarkdown(page_title: string): Promise<MarkupContent> {
  if (DataCache.data?.[page_title] != undefined) return {
    kind: MarkupKind.Markdown,
    value: DataCache.data[page_title]
  };

  if (page_title in PageMarkdownRequstsRunning) {
    return PageMarkdownRequstsRunning[page_title];
  }

  const promise: Promise<MarkupContent> = GetWikiPage(page_title).then(markdown => {
    markdown = HTMLToMDConverter.turndown(markdown ?? "");
    DataCache.data[page_title] = markdown;
    DataCache.Save();

    delete PageMarkdownRequstsRunning[page_title];

    return {
      kind: MarkupKind.Markdown,
      value: markdown
    };
  });

  PageMarkdownRequstsRunning[page_title] = promise;

  return promise;
}

export async function GetCategoryPages(category: string, types?: string | string[]): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  types = types != undefined ? "&cmtype=" + [].concat(types).join("|") : "";

  const items: string[] = [];

  let response = JSON.parse(await RequestGet(
    `https://geckwiki.com/api.php?action=query&list=categorymembers&cmtitle=${category}&cmprop=title|type${types}&cmlimit=max&format=json`
  ) ?? "");

  response?.query?.categorymembers.forEach((item: any) => items.push(item?.title));

  while (response?.continue?.cmcontinue != undefined) {
    response = JSON.parse(await RequestGet(
      `https://geckwiki.com/api.php?action=query&list=categorymembers&cmtitle=${category}&cmprop=title|type${types}&cmlimit=max&cmcontinue=${response?.continue?.cmcontinue}&format=json`
    ) ?? "");
    response?.query?.categorymembers.forEach((item: any) => items.push(item?.title));
  }

  return items;
}
