import * as fs from "fs";
import * as path from "path";
import { inspect } from "util";

import * as Lexer from "../geckscript/lexer";
import * as Parser from "../geckscript/parser";

function JSONToTree(json: Record<string, any>, name?: string): Record<string, any> {
  const tree: {
    "name"?: string,
    "children": Record<string, any>[]
  } = {
    "name": name ?? "root",
    "children": []
  };

  if (Object.entries(json).length > 0 && typeof json != "string") {
    for (const [k, v] of Object.entries(json)) {
      tree.children.push(JSONToTree(v, k.toString()));
    }
  } else {
    tree.children.push({ "name": json });
  }

  return tree;
}

const data = fs.readFileSync(path.join(__dirname, "./test_geck_parsing.gek")).toString();

const ast = Parser.GetAST(data);
fs.writeFileSync(path.join(__dirname, "../../tree-view/data.json"), JSON.stringify(Parser.GetAST(data)));
// fs.writeFileSync(path.join(__dirname, "../../tree-view/data.json"), JSON.stringify([JSONToTree(
//   Parser.GetAST(data)
// )]));

// Parser.Expression.PrettyPrint(Parser.GetAST(data));
// console.log(inspect(Parser.GetAST(data), false, null, true));
// console.log(inspect(Lexer.GetTokens(data), false, null, true));
