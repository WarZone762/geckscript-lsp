# geckscript-lsp

Provides various language features for the scripting language used by GECK for Fallout: New Vegas and Fallout 3.

## Features

- [x] parsing and error checking
- [x] configuration
- [x] document symbols
- [x] formatting
- [x] goto definition and references
- [x] highlight ranges
- [x] renaming
- [x] semantic tokens
- [x] static analysis
- [x] proper code completion
- [ ] selection range
- [ ] hover
- [ ] signature help
- [ ] code actions
- [ ] inlay hints

## Installation

[VSCode](https://github.com/WarZone762/vscode-geckscript)

[Neovim](https://github.com/WarZone762/geckscript.nvim)

Works best with [Hot Reload](https://www.nexusmods.com/newvegas/mods/70962) plugin

The server can infer global symbols (like references and quests), so it may be useful to extract
all vanilla scripts into a separate directory inside your project (e.g. `my_mod/lib`) with a tool
like [FNVEdit](https://www.nexusmods.com/newvegas/mods/34703)

## Configuration

The server can be configured in `geckrc.json` or `.geckrc.json` file.

### Configuration options

| Name           | Possible Values                     | Explanation                                                                                                  |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `keywordStyle` | `"lower"`, `"upper"` or `"capital"` | Enforce keyword naming convention: *lowercase* (`begin`), *UPPERCASE* (`BEGIN`) or *Capital* (`Begin`) |

### Example

```json
{
    "keywordStyle": "lower"
}
```

## Credits

The design of the parser is based on [rust-analyzer](https://rust-analyzer.github.io/)'s parser
