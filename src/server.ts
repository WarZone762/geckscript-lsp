import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult
} from "vscode-languageserver/node";

import {
  TextDocument
} from "vscode-languageserver-textdocument";

import * as Completions from "./completions"
import * as htmlparser2 from "htmlparser2"
import * as https from "https"
import * as DomUtils from "DomUtils"

function GetFunctionPageSource(func: string): Promise<string> {
  var options: https.RequestOptions = {
    host: "geckwiki.com",
    path: `/index.php?title=${func}&action=edit`
  };

  return new Promise((resolve, reject) => {
    https.request(options, (response) => {
      var str = "";

      response.on("data", (chunk: string) => { str += chunk });

      response.on("end", () => {
        console.log("Request finished");
        if (/#redirect \[\[\w+\]\]/i.test(str)) {
          GetFunctionPageSource(str.match(/(?<=#redirect \[\[)\w+(?=\]\])/i)?.[0] ?? "").then(resolve);
        } else {
          resolve(DomUtils.textContent(DomUtils.getElementsByTagName("textarea", htmlparser2.parseDocument(str))?.[0]));
        }
      });
    }).end();
  })
}

interface FunctionData {
  origin?: string;
  alias?: string;
  summary?: string;
  arguments: Map<string, string>;
};

function GetFunctionData(func: string): Promise<FunctionData> {
  var func_data: FunctionData = {
    arguments: new Map<string, string>()
  }

  return new Promise((resolve, reject) => {
    GetFunctionPageSource(func).then((page_source: string) => {
      func_data.origin = page_source.match(/(?<=\|origin\s*=\s*)\S.*/i)?.[0];
      func_data.alias = page_source.match(/(?<=\|alias\s*=\s*)\S.*/i)?.[0];
      func_data.summary = page_source.match(/(?<=\|summary\s*=\s*)\S.*/i)?.[0];
      var func_args = page_source.match(/(?<={.*?{.*?FunctionArgument.*?)(?<=\|(Type|Name)\s*?=\s*?)\w.*?(?=\s*}|$)(?=.*?}.*?})/sgim)
      if (func_args) {
        for (let i = 0; i < func_args.length; i += 2) {
          func_data.arguments?.set(func_args[i], func_args[i + 1]);
        }
      }

      resolve(func_data);
    })
  })
}

// GetFunctionPageSource("GetQR").then(console.log);
GetFunctionData("GetQR").then(console.log);
GetFunctionData("IsKeyPressed").then(console.log);

var CompletionItems: {
  Functions: CompletionItem[];
} = {
  Functions: []
};

for (let i = 0; i < Completions.Functions.length; i++) {
  CompletionItems.Functions[i] = {
    label: Completions.Functions[i],
    kind: CompletionItemKind.Function
  };
}

// Create a connection for the server, using Node"s IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      }
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText();
  const pattern = /\b[A-Z]{2,}\b/g;
  let m: RegExpExecArray | null;

  const diagnostics: Diagnostic[] = [];
  while (m = pattern.exec(text)) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length)
      },
      message: `${m[0]} is all uppercase.`,
      source: "ex"
    };
    if (hasDiagnosticRelatedInformationCapability) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range)
          },
          message: "Spelling matters"
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range)
          },
          message: "Particularly for names"
        }
      ];
    }
    diagnostics.push(diagnostic);
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return CompletionItems.Functions
    return [
      {
        label: "TypeScript",
        kind: CompletionItemKind.Text,
        data: 1
      },
      {
        label: "JavaScript",
        kind: CompletionItemKind.Text,
        data: 2
      }
    ];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = "TypeScript details";
      item.documentation = "TypeScript documentation";
    } else if (item.data === 2) {
      item.detail = "JavaScript details";
      item.documentation = "JavaScript documentation";
    }
    return item;
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
