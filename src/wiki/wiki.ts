// import * as fs from "fs";
// import * as path from "path";

// import {
//   MarkupContent,
//   MarkupKind
// } from "vscode-languageserver/node";

// import * as TurndownService from "turndown";
// import { GetWikiPage } from "./api";


// export class DataCache {
//   static data: { [key: string]: string } = {};

//   static Save(): void {
//     fs.writeFileSync(path.join(__dirname, "../cache.json"), JSON.stringify(DataCache.data));
//   }

//   static Load(): void {
//     if (!fs.existsSync(path.join(__dirname, "../cache.json"))) return;

//     DataCache.data = JSON.parse(fs.readFileSync(path.join(__dirname, "../cache.json")).toString());
//   }

// }

// DataCache.Load();

// export const HTMLToMDConverter = new TurndownService();

// HTMLToMDConverter.addRule("GECKWiki_code", {
//   filter: (node, options) => {
//     return !!(node.tagName === "PRE");
//   },
//   replacement: (content, node, options) => {
//     return (
//       "\n```GECKScript\n" +
//       `${content.replace(/\n$/, "").replaceAll("\\", "")}\n` +
//       "```\n"
//     );
//   }
// });

// HTMLToMDConverter.addRule("GECKWiki_tr", {
//   filter: "tr",
//   replacement: (content, node, options) => {
//     if (node.previousSibling != null) return content.replace(/\n$/, "") + "\n";
//     return (
//       `${content.replace(/\n$/, "")}\n` +
//       "|-".repeat(node.childElementCount) + "|\n"
//     );
//   }
// });

// HTMLToMDConverter.addRule("GECKWiki_th", {
//   filter: ["th", "td"],
//   replacement: (content, node, options) => {
//     return `|${content.replace(/\n$/, "")}${(node.nextSibling == null ? "|" : "")}`;
//   }
// });

// HTMLToMDConverter.addRule("GECKWiki_i", {
//   filter: "i",
//   replacement: (content, node, options) => {
//     return content;
//   }
// });

// HTMLToMDConverter.addRule("GECKWiki_div#contentSub", {
//   filter: (node, options) => {
//     return !!(node.tagName === "DIV" && node.id === "contentSub");
//   },
//   replacement: (content, node, options) => {
//     return "";
//   }
// });

// const PageMarkdownRequstsRunning: Record<string, Promise<MarkupContent>> = {};

// export async function GetPageMarkdown(page_title: string): Promise<MarkupContent> {
//   if (DataCache.data?.[page_title] != undefined) return {
//     kind: MarkupKind.Markdown,
//     value: DataCache.data[page_title]
//   };

//   if (page_title in PageMarkdownRequstsRunning) {
//     return PageMarkdownRequstsRunning[page_title];
//   }

//   const promise: Promise<MarkupContent> = GetWikiPage(page_title).then(markdown => {
//     markdown = HTMLToMDConverter.turndown(markdown ?? "");
//     DataCache.data[page_title] = markdown;
//     DataCache.Save();

//     delete PageMarkdownRequstsRunning[page_title];

//     return {
//       kind: MarkupKind.Markdown,
//       value: markdown
//     };
//   });

//   PageMarkdownRequstsRunning[page_title] = promise;

//   return promise;
// }
