import { format_doc } from "./format.js";
import { goto_def, goto_refs } from "./goto.js";
import { get_highlight } from "./highlight.js";
import { prepare_rename, rename } from "./rename.js";
import { LEGEND, build_semantic_tokens } from "./semantic_tokens.js";
import { symbols } from "./symbols.js";

export { goto_def, goto_refs as refs };
export { format_doc };
export { get_highlight };
export { prepare_rename, rename };
export { LEGEND, build_semantic_tokens };
export { symbols };
