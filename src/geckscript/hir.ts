import assert from "assert";
import * as fsSync from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import { KeywordStyle } from "../language_features/format.js";
import * as ast from "./ast.js";
import * as fnData from "./function_data.js";
import { Analyzer, ExprTypeSimple, GlobalSymbol, LowerContext, Script } from "./hir.js";
import * as parsing from "./parsing.js";
import { Node, NodeOrToken, SyntaxKind } from "./syntax.js";

export * from "./hir/api.js";
export * from "./hir/hir.js";
export * from "./hir/lower.js";

export class FileDatabase {
    files: Map<string, ParsedString> = new Map();
    globalSymbols: Map<string, GlobalSymbol> = new Map([
        ["player", new GlobalSymbol("player", new ExprTypeSimple("ObjectRef"))],
    ]);
    builtinFunctions: Map<string, fnData.FunctionData> = fnData.loadFunctionData();
    config: ServerConfig = { keywordStyle: KeywordStyle.LOWER };
    scriptCache: Map<Node<SyntaxKind.SCRIPT>, ParsedString> = new Map();

    async loadFolder(dirPath: string) {
        const files = await fs.readdir(dirPath, { recursive: true });
        for (const file of files) {
            const fullPath = path.resolve(path.join(dirPath, file));
            const stat = await fs.stat(fullPath);

            if (!stat.isDirectory() && file.endsWith("geckrc.json")) {
                this.loadConfig(file);
                fsSync.watch(file, undefined, (eventType) => {
                    if (eventType === "change") {
                        this.loadConfig(file);
                    }
                });

                continue;
            }

            if (stat.isDirectory() || (!file.endsWith(".gek") && !file.endsWith(".geck"))) {
                continue;
            }

            const content = await fs.readFile(fullPath);
            const doc = TextDocument.create(
                URI.file(fullPath).toString(),
                "geckscript",
                0,
                content.toString()
            );
            this.parseDoc(doc);
        }
    }

    parseDoc(doc: TextDocument): ParsedString {
        const [node, errors] = parsing.parseStr(doc.getText());
        assert.strictEqual(node.kind, SyntaxKind.SCRIPT);

        const diagnostics: Diagnostic[] = [];
        for (const e of errors) {
            const start = doc.positionAt(e.offset);
            const end = doc.positionAt(e.offset + e.len);

            diagnostics.push({ message: e.msg, severity: e.severity, range: { start, end } });
        }

        const script = new ast.Script(node);

        // remove old file from global symbols it references
        const oldParsed = this.files.get(doc.uri);
        if (oldParsed !== undefined) {
            for (const unresolvedSymbol of oldParsed.unresolvedSymbols.values()) {
                const symbol = this.globalSymbols.get(unresolvedSymbol.name.toLowerCase());
                symbol?.referencingFiles.delete(doc.uri);
                if (symbol?.referencingFiles.size === 0) {
                    this.globalSymbols.delete(unresolvedSymbol.name.toLowerCase());
                }
            }
        }

        const parsed = new ParsedString(doc, script, diagnostics);
        this.files.set(doc.uri, parsed);
        this.scriptCache.set(node, parsed);

        if (parsed.hir !== undefined) {
            const analyzer = new Analyzer(this, parsed);
            analyzer.analyze(parsed.hir);
        }

        return parsed;
    }

    findScript(script: Node<SyntaxKind.SCRIPT>): ParsedString | undefined {
        return this.scriptCache.get(script);
    }

    scriptToUri(name: string): ParsedString | undefined {
        for (const parsed of this.files.values()) {
            if (parsed.root.name()?.name()?.text === name) {
                return parsed;
            }
        }
    }

    async loadConfig(configPath: string) {
        const config = JSON.parse((await fs.readFile(configPath)).toString());
        switch (config.keywordStyle) {
            case "lower":
                this.config.keywordStyle = KeywordStyle.LOWER;
                break;
            case "upper":
                this.config.keywordStyle = KeywordStyle.UPPER;
                break;
            case "capital":
                this.config.keywordStyle = KeywordStyle.CAPITAL;
                break;
        }
    }
}

export class ParsedString {
    doc: TextDocument;
    root: ast.Script;
    hir?: Script;
    unresolvedSymbols: Set<GlobalSymbol> = new Set();
    diagnostics: Diagnostic[];

    constructor(doc: TextDocument, root: ast.Script, diagnostics: Diagnostic[]) {
        this.doc = doc;
        this.root = root;
        const lower = new LowerContext();
        this.hir = lower.script(root);
        this.diagnostics = diagnostics;
    }

    rangeOf(node: NodeOrToken): Range {
        return { start: this.posAt(node.offset), end: this.posAt(node.end()) };
    }

    posAt(offset: number): Position {
        return this.doc.positionAt(offset);
    }

    offsetAt(pos: Position): number {
        return this.doc.offsetAt(pos);
    }
}

export interface ServerConfig {
    keywordStyle: KeywordStyle;
}
