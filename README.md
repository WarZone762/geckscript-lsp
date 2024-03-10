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
- [ ] static analysis
- [ ] selection range
- [ ] proper code completion (currently only basic without function docs)
- [ ] hover
- [ ] signature help
- [ ] code actions
- [ ] inlay hints

## Installation

[VSCode](https://github.com/WarZone762/vscode-geckscript)

[Neovim](https://github.com/WarZone762/geckscript.nvim)

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
