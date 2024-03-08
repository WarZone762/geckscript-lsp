import { completionItems } from "./completion.js";
import { formatDoc } from "./format.js";
import { gotoDef, refs } from "./goto.js";
import { getHighlight } from "./highlight.js";
import { prepareRename, rename } from "./rename.js";
import { LEGEND, buildSemanticTokens } from "./semantic_tokens.js";
import { symbols } from "./symbols.js";

export { completionItems };
export { gotoDef, refs };
export { formatDoc };
export { getHighlight };
export { prepareRename, rename };
export { LEGEND, buildSemanticTokens };
export { symbols };
