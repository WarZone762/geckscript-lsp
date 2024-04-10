# geckscript-lsp

Provides various language features for the scripting language used by GECK for Fallout: New Vegas and Fallout 3.

## Features

- [x] parsing and syntax error checking
- [x] code actions
- [x] code completion
- [x] formatting
- [x] goto definition and references
- [x] hover
- [x] renaming
- [x] semantic tokens
- [x] signature help
- [ ] static analysis
- [ ] code lens
- [ ] inlay hints

## Installation

- [VSCode](https://github.com/WarZone762/vscode-geckscript)
- [Neovim](https://github.com/WarZone762/geckscript.nvim)

Works best with [Hot Reload](https://www.nexusmods.com/newvegas/mods/70962) plugin

The server can infer global symbols (like references and quests), so it may be useful to extract
all vanilla scripts into a separate directory inside your project (e.g. `my_mod/lib`) with a tool
like [FNVEdit](https://www.nexusmods.com/newvegas/mods/34703)

## Configuration

The server can be configured in `geckrc.json` or `.geckrc.json` file at the root of your project.

### Configuration options

| Name            | Possible Values                     | Explanation                                                                                                                  |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `keywordStyle`  | `"lower"`, `"upper"` or `"capital"` | Enforce keyword naming convention: *lowercase* (`begin`), *UPPERCASE* (`BEGIN`) or *Capital* (`Begin`)                       |
| `functionStyle` | `"lower"`, `"upper"` or `"capital"` | Enforce function naming convention: *lowercase* (`getitemcount`), *UPPERCASE* (`GETITEMCOUNT`) or *Capital* (`GetItemCount`) |

### Example

```json
{
    "$schema": "https://raw.githubusercontent.com/WarZone762/geckscript-lsp/dev/src/geckscript/config.schema.json",
    "keywordStyle": "lower",
    "functionStyle": "capital"
}
```

## Credits

The design of the parser is based on [rust-analyzer](https://rust-analyzer.github.io/)'s parser
