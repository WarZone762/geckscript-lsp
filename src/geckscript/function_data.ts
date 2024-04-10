import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import { ExprKindEngine, ExprTypeFunction, ExprTypeSimple, ParamType, SymbolTable } from "./hir.js";

export function loadFunctionData(symbolTable: SymbolTable) {
    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const functionDataPath = path.resolve(
        path.join(__dirname, "..", "..", "resources", "function_data.json")
    );

    const funcs = JSON.parse(fs.readFileSync(functionDataPath).toString()) as FunctionDataJSON[];
    for (const {
        name,
        alias,
        params,
        retType,
        opcode,
        origin,
        isCondFunc,
        reqRef,
        desc,
    } of funcs) {
        const func = new GlobalFunction(
            name,
            alias,
            params.map(({ type, name, optional }) => new GlobalFunctionParam(type, name, optional)),
            retType,
            opcode,
            origin,
            isCondFunc,
            reqRef,
            desc
        );

        symbolTable.set(name, func);
        if (alias !== undefined) {
            const newFunc = new GlobalFunction(
                alias,
                name,
                func.params,
                retType,
                opcode,
                origin,
                isCondFunc,
                reqRef,
                desc
            );
            symbolTable.set(alias, newFunc);
        }
    }
}

export class GlobalFunction {
    alias?: string;

    constructor(
        public name: string,
        alias: string | undefined,
        public params: GlobalFunctionParam[],
        public retType: ExprKindEngine,
        public opcode: number,
        public origin: string,
        public isCondFunc: boolean,
        public reqRef: boolean,
        public desc?: string
    ) {
        this.alias = alias;
    }

    signature(): string {
        let name;
        if (this.reqRef) {
            name = `ref.${this.name}`;
        } else {
            name = this.name;
        }

        if (this.params.length !== 0) {
            return `(${this.retType}) ${name} ${this.params.join(" ")}`;
        } else {
            return `(${this.retType}) ${name}`;
        }
    }

    signatureMarkdown(): string {
        let name;
        if (this.reqRef) {
            name = `*ref*.\`${this.name}\``;
        } else {
            name = `\`${this.name}\``;
        }

        if (this.params.length !== 0) {
            return `(**${this.retType}**) ${name} ${this.params.map((e) => e.toMarkdown()).join(" ")}`;
        } else {
            return `(**${this.retType}**) ${name}`;
        }
    }

    docs(): string {
        return (
            (this.desc ?? "") +
            `\n\n\n*From: ${this.origin}*` +
            `\n\n[GECKWiki](https://geckwiki.com/index.php?title=${this.name})`
        );
    }

    get type(): ExprTypeFunction {
        const type = new ExprTypeFunction(this.name, this.desc, new ExprTypeSimple(this.retType));
        for (const param of this.params) {
            type.args.push(new ParamType(param.name, new ExprTypeSimple(param.type)));
        }

        return type;
    }
}

export class GlobalFunctionParam {
    constructor(
        public type: ExprKindEngine,
        public name?: string,
        public optional: boolean = false
    ) {}

    toMarkdown(): string {
        const str = this.name !== undefined ? `${this.name}:${this.type}` : this.type;

        if (this.optional) {
            return `*${str}*`;
        } else {
            return str;
        }
    }

    toString(): string {
        const str = this.name !== undefined ? `${this.name}:${this.type}` : this.type;

        if (this.optional) {
            return `[${str}]`;
        } else {
            return str;
        }
    }
}

export interface FunctionDataJSON {
    name: string;
    alias?: string;
    params: FunctionParamJSON[];
    retType: ExprKindEngine;
    opcode: number;
    origin: string;
    isCondFunc: boolean;
    reqRef: boolean;
    desc?: string;
}

export interface FunctionParamJSON {
    type: ExprKindEngine;
    name?: string;
    optional: boolean;
}
