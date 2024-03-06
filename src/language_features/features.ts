import { formatDoc } from "./format.js";
import { gotoDef, gotoRefs } from "./goto.js";
import { getHighlight } from "./highlight.js";
import { prepareRename, rename } from "./rename.js";
import { LEGEND, buildSemanticTokens } from "./semantic_tokens.js";
import { symbols } from "./symbols.js";

export { gotoDef, gotoRefs as refs };
export { formatDoc };
export { getHighlight };
export { prepareRename, rename };
export { LEGEND, buildSemanticTokens };
export { symbols };
