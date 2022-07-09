import * as td from "turndown";

const Turndown = new td();

Turndown.addRule("GECKWiki_code", {
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

Turndown.addRule("GECKWiki_tr", {
  filter: ["tr"],
  replacement: (content, node, options) => {
    if (node.previousSibling != null) return content.replace(/\n$/, "") + "\n";
    return (
      `${content.replace(/\n$/, "")}\n` +
      "|-".repeat(node.childElementCount) + "|\n"
    );
  }
});

Turndown.addRule("GECKWiki_th", {
  filter: ["th", "td"],
  replacement: (content, node, options) => {
    return `|${content.replace(/\n$/, "")}${(node.nextSibling == null ? "|" : "")}`;
  }
});

export function Convert(data: string): string {
  return Turndown.turndown(data);
}