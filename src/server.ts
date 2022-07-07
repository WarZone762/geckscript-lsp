import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  SemanticTokensRequest,
  SemanticTokensLegend,
  TextDocumentIdentifier,
  ProgressToken
} from "vscode-languageserver/node";

import * as vsc from "vscode-languageserver/node";

import {
  TextDocument
} from "vscode-languageserver-textdocument";

import * as Completions from "./completions";

import * as CompletionData from "./completion_data";

// Create a connection for the server, using Node"s IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

enum TokenTypes {
  function,
  variable,
  total
}

enum TokenModifiers {
  declaration,
  total
}

const legend: SemanticTokensLegend = {
  tokenTypes: [],
  tokenModifiers: []
};

for (let i = 0; i < TokenTypes.total; i++) {
  legend.tokenTypes[i] = TokenTypes[i];
}
for (let i = 0; i < TokenTypes.total; i++) {
  legend.tokenModifiers[i] = TokenModifiers[i];
}

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

  if (capabilities.textDocument?.semanticTokens) {
    result.capabilities.semanticTokensProvider = {
      documentSelector: [{
        language: "GECKScript",
        scheme: "file"
      }],
      legend: legend,
      full: true
    };
  }

  return result;
});

connection.onRequest(SemanticTokensRequest.method, (
  documentId: TextDocumentIdentifier,
  progressToken: ProgressToken
) => {
  console.log(legend);
  const tokensBuilder = new vsc.SemanticTokensBuilder();

  tokensBuilder.push(0, 0, 5, TokenTypes["function"], TokenModifiers["declaration"]);

  return tokensBuilder.build();
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
  while ((m = pattern.exec(text))) {
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
    return CompletionData.CompletionItems.Functions;
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): Promise<CompletionItem> => {
    return new Promise<CompletionItem>((resolve, reject) => {
      if (item.data) {
        CompletionData.FunctionData.GetCompletionStrings(
          Completions.Functions[item.data]
        ).then(
          (data: [string, string]) => {
            item.detail = data[0];
            item.documentation = data[1];

            resolve(item);
          }
        );
      }
    });
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
