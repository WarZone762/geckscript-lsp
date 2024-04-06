import assert from "assert";
import * as fsSync from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import * as ast from "./ast.js";
import { ServerConfig, WordStyle, parseConfig } from "./config.js";
import * as fnData from "./function_data.js";
import * as globals from "./globals.js";
import {
    Analyzer,
    ExprTypeSimple,
    GlobalSymbol,
    LowerContext,
    Script,
    SymbolTable,
    UnresolvedSymbol,
} from "./hir.js";
import * as parsing from "./parsing.js";
import { Node, NodeOrToken, SyntaxKind } from "./syntax.js";

export * from "./hir/api.js";
export * from "./hir/hir.js";
export * from "./hir/lower.js";

export class FileDatabase {
    files: Map<string, File> = new Map();
    openFiles: Set<string> = new Set();
    unresolvedSymbols: SymbolTable<UnresolvedSymbol> = new SymbolTable();
    globalSymbols: SymbolTable<GlobalSymbol | fnData.GlobalFunction>;
    config: ServerConfig = { keywordStyle: WordStyle.Lower, functionStyle: WordStyle.Capital };
    scriptCache: Map<Node<SyntaxKind.SCRIPT>, File> = new Map();

    constructor() {
        this.globalSymbols = new SymbolTable();
        fnData.loadFunctionData(this.globalSymbols);
        globals.loadGlobals(this.globalSymbols);

        this.globalSymbols.set(
            "player",
            new GlobalSymbol(
                "player",
                new ExprTypeSimple("ObjectRef"),
                false,
                "Referenc to the player"
            )
        );
    }

    async loadDir(
        dirPath: string,
        cbParse: (done: number, total: number) => void = () => {},
        cbParseDone: () => void = () => {},
        cbAnalyze: (done: number, total: number) => void = () => {}
    ) {
        const files = (await fs.readdir(dirPath, { recursive: true })).filter(
            (e) => e.endsWith(".gek") || e.endsWith(".geck") || e.endsWith("geckrc.json")
        );
        const total = files.length;
        let done = 0;
        for await (const file of files) {
            cbParse(done++, total);
            const fullPath = path.resolve(path.join(dirPath, file));
            const stat = await fs.stat(fullPath);

            if (!stat.isDirectory() && file.endsWith("geckrc.json")) {
                this.config = await this.loadConfig(fullPath);
                fsSync.watch(fullPath, undefined, async (eventType) => {
                    if (eventType === "change") {
                        this.config = await this.loadConfig(fullPath);
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
            this.parseFile(doc);
        }
        cbParse(done, total);
        cbParseDone();

        done = 0;
        const analyzer = new Analyzer(this);
        for (const file of this.files.values()) {
            cbAnalyze(done++, total);
            analyzer.analyzeFile(file);
            // need this for progress to be sent
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        cbAnalyze(done, total);
    }

    loadFile(doc: TextDocument): File {
        const file = this.parseFile(doc);
        const analyzer = new Analyzer(this);
        analyzer.analyzeFile(file);

        return file;
    }

    deleteFile(uri: string) {
        // remove old file from global symbols it references
        const oldFile = this.files.get(uri);
        if (oldFile !== undefined) {
            for (const unresolvedSymbol of oldFile.unresolvedSymbols.values()) {
                const symbol = this.unresolvedSymbols.get(unresolvedSymbol.name);
                symbol?.referencingFiles.delete(uri);
                if (symbol?.referencingFiles.size === 0) {
                    this.unresolvedSymbols.delete(unresolvedSymbol.name);
                }
            }

            this.files.delete(uri);
            this.scriptCache.delete(oldFile.root.green);
        }
    }

    parseFile(doc: TextDocument): File {
        const [node, errors] = parsing.parseStr(doc.getText());
        assert.strictEqual(node.kind, SyntaxKind.SCRIPT);

        const diagnostics: Diagnostic[] = [];
        for (const e of errors) {
            const start = doc.positionAt(e.offset);
            const end = doc.positionAt(e.offset + e.len);

            diagnostics.push({ message: e.msg, severity: e.severity, range: { start, end } });
        }

        const script = new ast.Script(node);

        this.deleteFile(doc.uri);
        const file = new File(doc, script, diagnostics);
        for (const symbol of file.unresolvedSymbols.values()) {
            this.unresolvedSymbols.set(symbol.name, symbol);
        }
        this.files.set(doc.uri, file);
        this.scriptCache.set(node, file);

        return file;
    }

    updateOpenFiles() {
        const analyzer = new Analyzer(this);
        for (const uri of this.openFiles.values()) {
            const file = this.parseFile(this.files.get(uri)!.doc);
            analyzer.analyzeFile(file);
        }
    }

    scriptToFile(script: Node<SyntaxKind.SCRIPT>): File | undefined {
        return this.scriptCache.get(script);
    }

    uriToFile(name: string): File | undefined {
        for (const file of this.files.values()) {
            if (file.root.name()?.name()?.text === name) {
                return file;
            }
        }
    }

    async loadConfig(configPath: string): Promise<ServerConfig> {
        return parseConfig((await fs.readFile(configPath)).toString());
    }
}

export class File {
    doc: TextDocument;
    root: ast.Script;
    hir?: Script;
    unresolvedSymbols: Set<UnresolvedSymbol> = new Set();
    diagnostics: Diagnostic[];

    constructor(doc: TextDocument, root: ast.Script, diagnostics: Diagnostic[]) {
        this.doc = doc;
        this.root = root;
        const lower = new LowerContext();
        this.hir = lower.script(root);
        for (const symbol of lower.globalSymbols) {
            this.unresolvedSymbols.add(symbol);
        }
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
