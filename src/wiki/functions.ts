import { FunctionInfo } from "../geckscript/function_data";
import * as api from "./api";
import * as fs from "fs";
import * as path from "path";
import * as wtf from "wtf_wikipedia";

// eslint-disable-next-line @typescript-eslint/no-var-requires
wtf.plugin(require("wtf-plugin-markdown"));

const CachePath = path.join(__dirname, "../../resources", "function_page_cache.json");

const FunctionPageCache: { [key: string]: string } = fs.existsSync(CachePath)
    ? JSON.parse(fs.readFileSync(CachePath).toString())
    : {};

async function SaveCache() {
    await fs.promises.writeFile(CachePath, JSON.stringify(FunctionPageCache));
}

async function GetCacheValue(key: string): Promise<string | undefined> {
    if (FunctionPageCache[key] != undefined) {
        return FunctionPageCache[key];
    } else {
        const value = await api.GetPageWikitext(key);
        if (value != undefined) {
            FunctionPageCache[key] = value;
            await SaveCache();
        }

        return value;
    }
}

export interface Template {
    title: string;
    arguments: { [key: string]: unknown };
}

export interface FunctionArgumentTemplate {
    name?: string;
    type?: string;
    optional?: string;
    value?: string;
}

export const enum FunctionTemplateOrigin {
    "CONSOLENV" = "console functions",
    "GECK1" = "GECK 1.1",
    "GECK1.5" = "GECK 1.5",
    "FOSE1" = "FOSE v1",
    "VEGAS1" = "GECK 1.1 New Vegas",
    "NVSE" = "NVSE",
    "NX" = "NX plugin",
    "LU" = "Lutana Plugin",
    "PN" = "Project Nevada",
    "MCM" = "MCM",
    "UDF" = "UDF",
    "JIP" = "JIP",
    "JohnnyGuitar" = "Johnny Guitar",
    "SUP" = "SUP NVSE",
    "kNVSE" = "kNVSE Plugin",
    "TTW" = "TTW",
    "LNONLY" = "Lutana, not merged in JIP",
    "BookMenu" = "Book Menu Restored",
    "CommandExtender" = "Command Extender",
    "HotReload" = "Hot Reload",
    "ShowOff" = "ShowOff NVSE",
    "Anh" = "AnhNVSE",
    "ClearCommand" = "Clear Command NVSE",
}

export interface FunctionTemplate {
    cswikipage?: string;
    origin?: keyof FunctionArgumentTemplate;
    originversion?: string;
    summary?: string;
    name?: string;
    alias?: string;
    returnval?: string;
    returntype?: string;
    referencetype?: string;
    arguments?: (FunctionArgumentTemplate | string)[];
    example?: string;
    categorylist?: string[];
    consoleonly?: string;
    conditionfunc?: "Condition" | "Script" | "Both";
}

export interface FunctionDocumentation {
    template: FunctionTemplate;
    text: string;
}

export async function GetFunctions(): Promise<string[]> {
    return (await api.GetCategoryPages("Category:Functions (All)", ["page"])).concat(
        await api.GetCategoryPages("Category:Function Alias", ["page"])
    );
}

// TODO: update types for the new parser
export function ParseTemplate(
    element: Record<string, Record<string, unknown>>
): Template | FunctionArgumentTemplate | FunctionTemplate {
    const parameters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(element.parameters)) {
        parameters[k] = v;
    }

    return parameters;
}

wtf.extend((models: Record<string, { new (): unknown }>, templates: Record<string, Function>) => {
    models.Link.prototype.markdown = function () {
        const href = this.href().replaceAll(" ", "_");
        const str = this.text() || this.page();
        if (this.type() === "internal") {
            return `[${str}](https://geckwiki.com/index.php?title=${href.substring(2)})`;
        } else {
            return `[${str}](${href})`;
        }
    };

    models.Sentence.prototype.old = {
        markdown: models.Sentence.prototype.markdown,
    };

    models.Sentence.prototype.markdown = function (options: unknown) {
        let text = this.old.markdown.bind(this)(options);

        if (this.wikitext()[0] === " ") {
            text = "\t" + text + "\n";
        }

        return text;
    };

    templates.pre = (tmpl: unknown, list: Array<unknown>, parse: Function) => {
        const obj = parse(tmpl);
        list.push(obj);

        obj.inner = "\n " + obj.inner.replaceAll("\n", "\n\n ") + "\n";
        return obj.inner;
    };

    templates.functionargument = (tmpl: unknown, list: Array<unknown>, parse: Function) => {
        const obj = parse(tmpl);
        list.push(obj);

        return `${JSON.stringify(obj)},`;
    };

    templates.function = (tmpl: unknown, list: Array<unknown>, parse: Function) => {
        const obj = parse(tmpl);

        if (obj.arguments != undefined) {
            obj.arguments = JSON.parse(`[${obj.arguments.substring(0, obj.arguments.length - 1)}]`);
        }

        list.push(obj);

        return "";
    };
});

export async function GetFunctionDocumentation(
    page_name: string
): Promise<FunctionDocumentation | undefined> {
    let text = await GetCacheValue(page_name);
    if (text == undefined) {
        return undefined;
    }

    text = text.replaceAll(/<pre>(.*?)<\/pre>/gs, "{{pre|inner=$1}}").replaceAll(/^\* /gm, "*");

    const page = wtf(text);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const template = page.template("function")?.json() as FunctionTemplate;

    return {
        template: template,
        text: (page as unknown as { markdown: Function }).markdown().trim(),
    };
}

// GetFunctionDocumentation("StopQuest").then(d => {
//   console.log(d?.text);
//   console.log();
// });

export function GetFunctionSignature(func_info: FunctionInfo, doc: FunctionDocumentation): string {
    let signature = "";

    if (doc.template.returnval != undefined || doc.template.returntype != undefined) {
        signature += "(";

        if (doc.template.returnval != undefined) {
            signature += `${doc.template.returnval}:`;
        }

        if (doc.template.returntype != undefined) {
            signature += doc.template.returntype;
        }

        signature += ") ";
    }

    if (doc.template.referencetype != undefined) {
        signature += `${doc.template.referencetype}.`;
    }

    signature += `${doc.template.name ?? func_info.canonical_name} `;

    for (const arg of doc.template.arguments ?? []) {
        if (arg instanceof String) {
            signature += arg;
        } else {
            if ((arg as FunctionArgumentTemplate)?.name != undefined) {
                signature += `${(arg as FunctionArgumentTemplate).name}:`;
            }

            if ((arg as FunctionArgumentTemplate)?.type != undefined) {
                signature += `${(arg as FunctionArgumentTemplate).type}`;
            }

            if ((arg as FunctionArgumentTemplate)?.value != undefined) {
                signature += `{${(arg as FunctionArgumentTemplate).value}}`;
            }

            if ((arg as FunctionArgumentTemplate)?.optional != undefined) {
                signature += "?";
            }
        }

        signature += " ";
    }

    return signature;
}
