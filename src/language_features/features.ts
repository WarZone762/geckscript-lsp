import { format_doc } from "./format";
import { goto_def, goto_refs } from "./goto";
import { get_highlight } from "./highlight";
import { prepare_rename, rename } from "./rename";
import { legend, build_semantic_tokens } from "./semantic_tokens";
import { symbols } from "./symbols";

export { goto_def, goto_refs as refs };
export { format_doc };
export { get_highlight };
export { prepare_rename, rename };
export { legend, build_semantic_tokens };
export { symbols };
