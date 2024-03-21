import * as fs from "fs";
import * as path from "path";
import * as url from "url";

export function loadFunctionData(): Map<string, FunctionData> {
    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const functionDataPath = path.resolve(
        path.join(__dirname, "..", "..", "resources", "function_data.json")
    );

    const funcs = JSON.parse(fs.readFileSync(functionDataPath).toString()) as FunctionDataJSON[];
    const map = new Map();
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
        const func = new FunctionData(
            name,
            alias,
            params.map(({ type, name, optional }) => new FunctionParam(type, name, optional)),
            retType,
            opcode,
            origin,
            isCondFunc,
            reqRef,
            desc
        );

        map.set(name.toLowerCase(), func);
        if (alias !== undefined) {
            const newFunc = new FunctionData(
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
            map.set(alias.toLowerCase(), newFunc);
        }
    }

    return map;
}

export class FunctionData {
    alias?: string;

    constructor(
        public name: string,
        alias: string | undefined,
        public params: FunctionParam[],
        public retType: FunctionType,
        public opcode: number,
        public origin: string,
        public isCondFunc: boolean,
        public reqRef: boolean,
        public desc?: string
    ) {
        this.alias = alias;
    }

    toSignature(): string {
        if (this.params.length !== 0) {
            return `(${this.retType}) ${this.name} ${this.params.join(" ")}`;
        } else {
            return `(${this.retType}) ${this.name}`;
        }
    }
}

export class FunctionParam {
    constructor(
        public type: FunctionType,
        public name?: string,
        public optional: boolean = false
    ) {}

    toString(): string {
        const str = this.name !== undefined ? `${this.name}:${this.type}` : this.type;

        if (this.optional) {
            return `<i>${str}</i>`;
        } else {
            return str;
        }
    }
}

export interface FunctionDataJSON {
    name: string;
    alias?: string;
    params: FunctionParamJSON[];
    retType: FunctionType;
    opcode: number;
    origin: string;
    isCondFunc: boolean;
    reqRef: boolean;
    desc?: string;
}

export interface FunctionParamJSON {
    type: FunctionType;
    name?: string;
    optional: boolean;
}

export type FunctionType =
    | "1/0"
    | "<unknown>"
    | "AIPackage"
    | "Actor"
    | "ActorBase"
    | "ActorValue"
    | "Alignment"
    | "Ambiguous"
    | "AnimationGroup"
    | "AnyForm"
    | "AnyType"
    | "Array index"
    | "Array"
    | "Axis"
    | "Bool"
    | "CaravanDeck"
    | "Casino"
    | "Cell"
    | "Challenge"
    | "Class"
    | "CombatStyle"
    | "Container"
    | "CrimeType"
    | "CriticalStage"
    | "Double"
    | "EffectShader"
    | "EncounterZone"
    | "EquipType"
    | "Faction"
    | "Float"
    | "Form"
    | "FormList"
    | "FormType"
    | "Furniture"
    | "Global"
    | "IdleForm"
    | "ImageSpace"
    | "ImageSpaceModifier"
    | "Integer"
    | "InvObjectOrFormList"
    | "LeveledChar"
    | "LeveledCreature"
    | "LeveledItem"
    | "LeveledOrBaseChar"
    | "LeveledOrBaseCreature"
    | "MagicEffect"
    | "MagicItem"
    | "MapMarker"
    | "Message"
    | "MiscStat"
    | "NPC"
    | "NonFormList"
    | "Note"
    | "Number"
    | "Object"
    | "ObjectID"
    | "ObjectRef"
    | "Owner"
    | "Pair"
    | "Perk"
    | "Quest"
    | "QuestStage"
    | "Race"
    | "Region"
    | "Reputation"
    | "ScriptVar"
    | "Sex"
    | "Slice"
    | "Sound"
    | "SoundFile"
    | "SpellItem"
    | "String"
    | "StringOrNumber"
    | "StringVar"
    | "Topic"
    | "Variable"
    | "VariableName"
    | "WeatherID"
    | "WorldSpace"
    | "unk2E";

export function isFunctionType(str: string): str is FunctionType {
    switch (str) {
        case "1/0":
        case "<unknown>":
        case "AIPackage":
        case "Actor":
        case "ActorBase":
        case "ActorValue":
        case "Alignment":
        case "Ambiguous":
        case "AnimationGroup":
        case "AnyForm":
        case "AnyType":
        case "Array index":
        case "Array":
        case "Axis":
        case "Bool":
        case "CaravanDeck":
        case "Casino":
        case "Cell":
        case "Challenge":
        case "Class":
        case "CombatStyle":
        case "Container":
        case "CrimeType":
        case "CriticalStage":
        case "Double":
        case "EffectShader":
        case "EncounterZone":
        case "EquipType":
        case "Faction":
        case "Float":
        case "Form":
        case "FormList":
        case "FormType":
        case "Furniture":
        case "Global":
        case "IdleForm":
        case "ImageSpace":
        case "ImageSpaceModifier":
        case "Integer":
        case "InvObjectOrFormList":
        case "LeveledChar":
        case "LeveledCreature":
        case "LeveledItem":
        case "LeveledOrBaseChar":
        case "LeveledOrBaseCreature":
        case "MagicEffect":
        case "MagicItem":
        case "MapMarker":
        case "Message":
        case "MiscStat":
        case "NPC":
        case "NonFormList":
        case "Note":
        case "Number":
        case "Object":
        case "ObjectID":
        case "ObjectRef":
        case "Owner":
        case "Pair":
        case "Perk":
        case "Quest":
        case "QuestStage":
        case "Race":
        case "Region":
        case "Reputation":
        case "ScriptVar":
        case "Sex":
        case "Slice":
        case "Sound":
        case "SoundFile":
        case "SpellItem":
        case "String":
        case "StringOrNumber":
        case "StringVar":
        case "Topic":
        case "Variable":
        case "VariableName":
        case "WeatherID":
        case "WorldSpace":
        case "unk2E":
            return true;
        default:
            return false;
    }
}
