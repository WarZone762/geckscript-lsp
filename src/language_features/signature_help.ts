import { SignatureHelp } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { hir } from "../geckscript.js";

export function signatureHelp(db: hir.FileDatabase, file: hir.File, pos: Position): SignatureHelp {
    return {
        signatures: [
            {
                label: "Test",
                parameters: [
                    { label: "param1", documentation: "doc1" },
                    { label: "param2", documentation: "doc2" },
                ],
                documentation: "fn doc",
                activeParameter: 0,
            },
        ],
    };
}
