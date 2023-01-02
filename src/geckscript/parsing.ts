import { Lexer } from "./lexer";
import { AnyEvent, EventError, EventKind } from "./parser/event";
import { Input, parse } from "./parser/parser";
import { SyntaxKind, syntax_kind_name } from "./syntax_kind/generated";
import { Node, Token } from "./types/syntax_node";

export function tree_to_str(node: Node): string {
    let indent = 0;

    return tree_to_str_recursive(node);

    function tree_to_str_recursive(node: Node): string {
        let text = `${"  ".repeat(indent)}${syntax_kind_name(node.kind)}\n`;
        ++indent;
        for (const child of node.children) {
            if (child.is_node()) {
                text += tree_to_str_recursive(child);
            } else {
                text += `${"  ".repeat(indent)}${syntax_kind_name(child.kind)} ${JSON.stringify(child.text)}\n`;
            }
        }
        --indent;

        return text;
    }
}

export function output_to_tree(output: AnyEvent[], tokens: Token[]): [Node, EventError[]] {
    const stack: Node[] = [];
    const errors: EventError[] = [];

    let i = 0;
    for (const e of output) {
        switch (e.kind) {
            case EventKind.Start:
                stack.push(Node(e.syntax_kind));
                break;

            case EventKind.Token:
                stack.at(-1)!.children.push(tokens[i++]);
                break;

            case EventKind.Finish:
                if (stack.length > 1) {
                    stack.at(-2)!.children.push(stack.pop()!);
                }
                break;

            case EventKind.Error:
                errors.push(e);
                break;

            default:
                break;
        }
    }

    return [stack.at(-1)!, errors];
}

export function parse_string(str: string): [Node, EventError[]] {
    const l = new Lexer(str);
    const tokens = Array.from(l.lex()).filter(t => t.kind != SyntaxKind.WHITESPACE && t.kind != SyntaxKind.COMMENT);
    const input = new Input(tokens.map(t => t.kind));

    return output_to_tree(parse(input), tokens);
}

