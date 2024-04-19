#!/bin/env node
import open from "open";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
    DiagnosticSeverity,
    InitializeResult,
    ProposedFeatures,
    TextDocumentSyncKind,
    WorkspaceFolder,
    createConnection,
} from "vscode-languageserver/node.js";
import * as vs from "vscode-languageserver/node.js";
import { URI } from "vscode-uri";

import * as features from "./features.js";
import { ast, config, hir } from "./geckscript.js";
import { TreeViewServer } from "./tree_view/server.js";

const DB = new hir.FileDatabase();

const checkIndex = process.argv.indexOf("--check");
if (checkIndex !== -1) {
    const path = process.argv.at(checkIndex + 1);
    if (path === undefined) {
        console.log("ERROR: expected path after --check");
        process.exit(1);
    }

    await DB.loadDir(path);
    for (const [uri, doc] of DB.files.entries()) {
        for (const diagnostic of doc.diagnostics) {
            if (diagnostic.severity === DiagnosticSeverity.Error) {
                console.log(
                    `${path}${uri.split(path).at(-1) ?? uri}:${diagnostic.range.start.line}:${diagnostic.range.start.character}: ${diagnostic.message}`
                );
            }
        }
    }

    process.exit();
}

/** Helper to create a document reqest handler function */
function handler<P extends { textDocument: { uri: string } }, E, R>(
    handler: (file: hir.File, params: P) => vs.HandlerResult<R, E>
): (params: P) => vs.HandlerResult<R, E> {
    return (params: P) => {
        const file = DB.files.get(params.textDocument.uri);
        if (file !== undefined) {
            return handler(file, params);
        }

        return new vs.ResponseError(404, "unable to find requested file");
    };
}

const connection = createConnection(ProposedFeatures.all);
let treeViewServer: TreeViewServer | undefined;
let rootDirs: WorkspaceFolder[] = [];

connection.onInitialize(async (params) => {
    rootDirs = params.workspaceFolders ?? [];
    const capabilities = params.capabilities;

    const result: InitializeResult = {
        capabilities: {
            executeCommandProvider: { commands: ["open"] },
            codeActionProvider: true,
            completionProvider: { triggerCharacters: ["."] },
            definitionProvider: true,
            documentFormattingProvider: true,
            documentHighlightProvider: true,
            documentSymbolProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            renameProvider: { prepareProvider: true },
            selectionRangeProvider: true,
            signatureHelpProvider: { triggerCharacters: [" ", ","] },
            textDocumentSync: TextDocumentSyncKind.Full,
        },
    };

    if (capabilities.textDocument?.semanticTokens) {
        result.capabilities.semanticTokensProvider = {
            documentSelector: [
                {
                    language: "geckscript",
                    scheme: "file",
                },
            ],
            legend: features.LEGEND,
            range: false,
            full: { delta: false },
        };
    }

    if (process.argv.find((e) => e === "--tree-view-server") !== undefined) {
        console.log("Running tree view server");
        treeViewServer = new TreeViewServer(8000, "localhost");
    }

    return result;
});

connection.onInitialized(async () => {
    connection.client.register(vs.DidChangeConfigurationNotification.type, {
        section: "geckscript-lsp",
    });

    for (const dir of rootDirs) {
        const progressParse = await connection.window.createWorkDoneProgress();
        const progressAnalyze = await connection.window.createWorkDoneProgress();
        progressParse.begin("Loading workspace");
        await DB.loadDir(
            URI.parse(dir.uri).fsPath,
            async (done, total) => {
                progressParse.report(Math.round((done * 100) / total), `${done} / ${total} files`);
            },
            async () => {
                progressParse.done();
                progressAnalyze.begin("Analyzing workspace");
            },
            async (done, total) => {
                progressAnalyze.report(
                    Math.round((done * 100) / total),
                    `${done} / ${total} files`
                );
            }
        );
        progressAnalyze.done();
    }

    for (const file of DB.files.values()) {
        connection.sendDiagnostics({ uri: file.doc.uri, diagnostics: file.diagnostics });
    }
});

connection.onDidChangeConfiguration(async (params) => {
    DB.clientConfig = params.settings["geckscript-lsp"] as config.ServerConfig;
    Object.assign(DB.config, DB.clientConfig);
});

connection.onDidOpenTextDocument(async (params) => {
    const doc = params.textDocument;
    const file = DB.loadFile(TextDocument.create(doc.uri, doc.languageId, doc.version, doc.text));
    DB.updateOpenFiles();
    DB.openFiles.add(doc.uri);

    treeViewServer?.writeTreeData(ast.toTreeData(file.root.green));

    connection.sendDiagnostics({ uri: file.doc.uri, diagnostics: file.diagnostics });
});

connection.onDidChangeTextDocument(
    handler(async (file, params) => {
        TextDocument.update(file.doc, params.contentChanges, params.textDocument.version);
        file = DB.loadFile(file.doc);
        DB.updateOpenFiles();
        DB.openFiles.add(file.doc.uri);

        treeViewServer?.writeTreeData(ast.toTreeData(file.root.green));

        connection.sendDiagnostics({ uri: file.doc.uri, diagnostics: file.diagnostics });
    })
);

connection.onDidCloseTextDocument(
    handler(async (file) => {
        DB.openFiles.delete(file.doc.uri);
    })
);

connection.onExecuteCommand(async ({ command, arguments: args }) => {
    if (command === "open" && args !== undefined) {
        open(`https://geckwiki.com/index.php?title=${args[0]}`);
    }
});

connection.onCodeAction(
    handler(async (file, params) => features.codeAction(DB, file, params.range))
);

connection.onCompletion(
    handler(async (file, params) =>
        features.completionItems(DB, file, params.position, params.context?.triggerCharacter)
    )
);

connection.onDefinition(
    handler(async (file, params) => features.gotoDef(DB, file, params.position))
);
connection.onDocumentFormatting(
    handler(async (file, params) => features.formatDoc(DB, file, params.options, DB.config))
);
connection.onDocumentHighlight(
    handler(async (file, params) => features.getHighlight(DB, file, params.position))
);
connection.onDocumentSymbol(handler(async (file) => features.symbols(file)));
connection.onHover(handler(async (file, params) => features.hover(DB, file, params.position)));
connection.onReferences(handler(async (file, params) => features.refs(DB, file, params.position)));
connection.onPrepareRename(
    handler(async (file, params) => features.prepareRename(file, params.position))
);
connection.onRenameRequest(
    handler(async (file, params) => features.rename(DB, file, params.newName, params.position))
);
connection.onSelectionRanges(handler(async () => null));
connection.languages.semanticTokens.on(
    handler<vs.SemanticTokensParams, void, vs.SemanticTokens>(async (parsed) =>
        features.buildSemanticTokens(DB, parsed)
    )
);
connection.onSignatureHelp(
    handler(async (file, params) => features.signatureHelp(DB, file, params.position))
);
connection.onExit(() => treeViewServer?.close());

connection.listen();
