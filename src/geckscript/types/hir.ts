import { AstNode } from "../ast/generated";

export class TreeData {
    name: string;
    children: TreeData[];

    constructor(name: string, children: TreeData[] = []) {
        this.name = name;
        this.children = children;
    }

    append(child: TreeData): void {
        this.children.push(child);
    }

    concat(children: TreeData[]): void {
        this.children = this.children.concat(children);
    }
}

export const enum ExprType {
    Unknown,
    Ambiguous,
    Integer,
    Float,
    Form,
    Reference,
    String,
    Array,
}

const EXPR_TYPE_NAME_MAP: { [key in ExprType]?: string } = {
    [ExprType.Unknown]: "unknown",
    [ExprType.Ambiguous]: "ambiguous",
    [ExprType.Integer]: "integer",
    [ExprType.Float]: "float",
    [ExprType.Form]: "form",
    [ExprType.Reference]: "reference",
    [ExprType.String]: "string",
    [ExprType.Array]: "array",
};

export function expr_type_name(type: ExprType): string {
    return EXPR_TYPE_NAME_MAP[type] ?? "unable to find Type name";
}

export const enum SymbolKind {
    Unknown,

    Variable,
    Function,
    Script,
}

export interface Symbol {
    name: string;
    kind: SymbolKind;
    // declaration?: AnyNode;
    declaration?: AstNode;
    type: ExprType;
}

export type SymbolTable = { [key: string]: Symbol; };

