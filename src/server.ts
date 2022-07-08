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
  SemanticTokensParams,
  MarkupContent,
  MarkupKind
} from "vscode-languageserver/node";

import {
  TextDocument
} from "vscode-languageserver-textdocument";

import * as Constructs from "./geckscript_constructs";
import * as CompletionData from "./completion_data";
import * as st from "./semantic_tokens";

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

  if (capabilities.textDocument?.semanticTokens) {
    result.capabilities.semanticTokensProvider = {
      documentSelector: [{
        language: "GECKScript",
        scheme: "file"
      }],
      legend: st.Legend,
      full: true
    };
  }

  return result;
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
import * as htmlparser from "htmlparser2";
import * as DU from "DomUtils";
// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  // (item: CompletionItem): CompletionItem => {
  //   item.detail = "Test";
  //   const content: MarkupContent = {
  //     kind: MarkupKind.Markdown,
  //     value: "<p><b>Syntax:</b>\n</p>\n<pre> begin MenuMode <i>MenuType (optional)</i>\n</pre>\n<p><b>Example:</b>\n</p>\n<pre> begin MenuMode\n begin MenuMode 1\n begin MenuMode 1012\n begin MenuMode iTest  &#160;;filtered according to the current value of the int variable\n</pre>\n<p>With no parameter, this block type will run whenever the game is NOT in gamemode -- whenever ANY menu is being displayed.\n</p><p>If you include a parameter, you can specify the menu type, or the specific menu, when you want the script block to run:\n</p><p><br />\n</p><p>Menu type:\n</p>\n<table>\n\n\n\n<table class=\"wikitable\" style=\"width:50%;\">\n\n<tr>\n<th> Menu Code  </th>\n<th>  Menu Name\n</th></tr>\n<tr>\n<td>  1 </td>\n<td> \"main four\" (the character interface: stats, magic, inventory, quest log)\n</td></tr>\n<tr>\n<td>  2 </td>\n<td> any other menu (message boxes, containers, etc.)\n</td></tr>\n<tr>\n<td>  3 </td>\n<td> console ( opened with '~' )\n</td></tr>\n<tr>\n<td>  4 </td>\n<td> title screen main menu (added by JIPLN)\n</td></tr></table>\n<p>Specific menu:\n</p>\n<table>\n\n\n\n<table class=\"wikitable\" style=\"width:50%;\">\n\n<tr>\n<th> Menu Code  </th>\n<th>  Menu Name\n</th></tr>\n<tr>\n<td>  1001  </td>\n<td>  Message\n</td></tr>\n<tr>\n<td>  1002  </td>\n<td>  Inventory\n</td></tr>\n<tr>\n<td>  1003  </td>\n<td>  Stats\n</td></tr>\n<tr>\n<td>  1004  </td>\n<td>  HUDMainMenu\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1007  </td>\n<td>  Loading\n</td></tr>\n<tr>\n<td>  1008  </td>\n<td>  Container\n</td></tr>\n<tr>\n<td>  1009  </td>\n<td>  Dialog\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1012  </td>\n<td>  SleepWait\n</td></tr>\n<tr>\n<td>  1013  </td>\n<td>  Pause\n</td></tr>\n<tr>\n<td>  1014  </td>\n<td>  LockPick\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1016  </td>\n<td>  Quantity\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1023  </td>\n<td>  Pipboy Data\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1026  </td>\n<td>  Book Menu (<a href=\"/index.php?title=Book_Menu_Restored_Plugin\" title=\"Book Menu Restored Plugin\">Book Menu Restored Plugin</a>)\n</td></tr>\n<tr>\n<td>  1027  </td>\n<td>  LevelUp\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1035  </td>\n<td>  Pipboy Repair\n</td></tr>\n<tr>\n<td>  1036  </td>\n<td>  RaceMenu, BarberMenu, PlasticSurgeryMenu\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1047  </td>\n<td>  Credits\n</td></tr>\n<tr>\n<td>  1048  </td>\n<td>  CharGen\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1051  </td>\n<td>  TextEdit\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1053  </td>\n<td>  Barter\n</td></tr>\n<tr>\n<td>  1054  </td>\n<td>  Surgery\n</td></tr>\n<tr>\n<td>  1055  </td>\n<td>  Hacking\n</td></tr>\n<tr>\n<td>  1056  </td>\n<td>  VATS\n</td></tr>\n<tr>\n<td>  1057  </td>\n<td>  Computers\n</td></tr>\n<tr>\n<td>  1058  </td>\n<td>  Vendor Repair\n</td></tr>\n<tr>\n<td>  1059  </td>\n<td>  Tutorial\n</td></tr>\n<tr>\n<td>  1060  </td>\n<td>  You're SPECIAL book\n</td></tr>\n<tr>\n<td>  1061  </td>\n<td>  Item Mod Menu (New Vegas)\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1069  </td>\n<td>  Tweaks Menu (<a href=\"/index.php?title=LStewieAl%27s_Tweaks\" title=\"LStewieAl's Tweaks\">LStewieAl's Tweaks</a>)\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1074  </td>\n<td>  Love Tester (New Vegas)\n</td></tr>\n<tr>\n<td>  1075  </td>\n<td>  Companion Wheel (New Vegas)\n</td></tr>\n<tr>\n<td>  1076  </td>\n<td>  The Medical Questionnaire (Not Used) (New Vegas)\n</td></tr>\n<tr>\n<td>  1077  </td>\n<td>  Recipe (New Vegas)\n</td></tr>\n<tr>\n<td>  ...   </td>\n<td>\n</td></tr>\n<tr>\n<td>  1080  </td>\n<td>  Slot Machine MiniGame (New Vegas)\n</td></tr>\n<tr>\n<td>  1081  </td>\n<td>  Blackjack Table MiniGame (New Vegas)\n</td></tr>\n<tr>\n<td>  1082  </td>\n<td>  Roulette Table MiniGame (New Vegas)\n</td></tr>\n<tr>\n<td>  1083  </td>\n<td>  Caravan MiniGame (New Vegas)\n</td></tr>\n<tr>\n<td>  1084  </td>\n<td>  Character Creation Traits (not the Medical Questionnaire) (New Vegas)\n</td></tr></table>\n<h2><span class=\"mw-headline\" id=\"Notes\">Notes</span><span class=\"mw-editsection\"><span class=\"mw-editsection-bracket\">[</span><a href=\"/index.php?title=MenuMode&amp;action=edit&amp;section=1\" title=\"Edit section: Notes\">edit</a><span class=\"mw-editsection-bracket\">]</span></span></h2>\n<ul><li> For Effect Scripts, this block will never run when the Pause menu is open.</li>\n<li> <a href=\"/index.php?title=Lutana\" class=\"mw-redirect\" title=\"Lutana\">Lutana NVSE Plugin</a> (and <a href=\"/index.php?title=Functions_(JIP)\" class=\"mw-redirect\" title=\"Functions (JIP)\">JIP NVSE Plugin</a> v40+, which Lutana was merged in to) hooks the MenuMode function to properly detect MenuMode 3 (Console)</li>\n<li> The Main Menu that appears when F3 first starts up does not have its own menu code.  However, the following three (and only these three) will return true: 1004, 1007, 1013.</li>\n<li> The Main Menu has its own code in Fallout New Vegas with the JIPLN plugin which is 4, so the above is only needed if you are not using it.</li>\n<li> <a href=\"/index.php?title=Quest_scripts\" title=\"Quest scripts\">Quest scripts</a> on <a href=\"/index.php?title=Quest\" class=\"mw-redirect\" title=\"Quest\">Quests</a> set to start-game-enabled will run even on the main menu.  Be extremely careful when using scripts that attempt to perform game-related behaviour in MenuMode to ensure that they are operating on a loaded saved game.  For instance, unsafely calling <a href=\"/index.php?title=SetNameEx\" title=\"SetNameEx\">SetNameEx</a> on a base effect in MenuMode will result in a guaranteed crash, before the main menu displays -- which is almost indistinguishable from other boot-related crashes like missing master files.  The easiest way to avoid this is to check for an initialisation variable that has been set in a begin-<a href=\"/index.php?title=GameMode\" title=\"GameMode\">GameMode</a> block.</li></ul>\n<h2><span class=\"mw-headline\" id=\"See_Also\">See Also</span><span class=\"mw-editsection\"><span class=\"mw-editsection-bracket\">[</span><a href=\"/index.php?title=MenuMode&amp;action=edit&amp;section=2\" title=\"Edit section: See Also\">edit</a><span class=\"mw-editsection-bracket\">]</span></span></h2>\n<ul><li> <a href=\"/index.php?title=MenuMode_(Function)\" title=\"MenuMode (Function)\">MenuMode (Function)</a></li>\n<li> <a href=\"/index.php?title=GameMode\" title=\"GameMode\">GameMode</a></li>\n<li> <a href=\"/index.php?title=UI_Functions\" class=\"mw-redirect\" title=\"UI Functions\">UI Functions</a></table></li></ul>\n</table>\n\n<!-- \nNewPP limit report\nCached time: 20220709004516\nCache expiry: 86400\nDynamic content: false\nCPU time usage: 0.064 seconds\nReal time usage: 0.067 seconds\nPreprocessor visited node count: 139/1000000\nPreprocessor generated node count: 402/1000000\nPost\u2010expand include size: 2086/2097152 bytes\nTemplate argument size: 40/2097152 bytes\nHighest expansion depth: 4/40\nExpensive parser function count: 0/100\n-->\n<!--\nTransclusion expansion time report (%,ms,calls,template)\n100.00%   31.451      1 -total\n100.00%   31.451      1 Template:MenuTypes\n 74.95%   23.573      2 Template:Wikitable\n-->\n\n<!-- Saved in parser cache with key geck_wiki:pcache:idhash:1682-0!*!0!!*!*!* and timestamp 20220709004516 and revision id 30747\n -->\n"
  //   };
  //   item.documentation = content;

  //   return item;
  (item: CompletionItem): Promise<CompletionItem> => {
    return new Promise<CompletionItem>((resolve, reject) => {
      if (item.data) {
        CompletionData.FunctionData.GetCompletionStrings(
          Object.keys(Constructs.Functions)[item.data]
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

connection.onRequest(SemanticTokensRequest.method, (
  params: SemanticTokensParams
) => {
  return st.onSemanticTokenRequestFull(documents.get(params.textDocument.uri), params.partialResultToken, params.workDoneToken);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
