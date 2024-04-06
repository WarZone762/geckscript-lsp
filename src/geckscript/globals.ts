import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import { ExprKindEngine, ExprTypeSimple, GlobalSymbol, SymbolTable } from "./hir.js";

export function loadGlobals(symbolTable: SymbolTable) {
    const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
    const globalsDataPath = path.resolve(
        path.join(__dirname, "..", "..", "resources", "globals.json")
    );

    const globalsData = JSON.parse(fs.readFileSync(globalsDataPath).toString()) as GlobalData[];

    const combinedMap = new SymbolTable<GlobalDataCombined>();
    for (const { type, edid, origin, script } of globalsData) {
        let combined = combinedMap.get(edid);
        if (combined === undefined) {
            combined = { edid, type, origins: [origin], script };
        } else {
            combined.origins.push(origin);
            combined.script ??= script;
        }

        combinedMap.set(edid, combined);
    }

    // for (const { type, edid, origin, script } of globalsData) {
    for (const { type, edid, origins, script } of combinedMap.values()) {
        let globalSymbol;
        if (script !== undefined) {
            globalSymbol = new GlobalSymbol(
                edid,
                new ExprTypeSimple("Quest"),
                false,
                `origin: ${origins.join(", ")}`
            );
        } else {
            const kind = kindFromFormType(type);
            if (kind === undefined) {
                console.error(`unknown record signature ${type}`);
                continue;
            }
            globalSymbol = new GlobalSymbol(
                edid,
                new ExprTypeSimple(kind),
                false,
                `origin: ${origins.join(", ")}`
            );
        }

        symbolTable.set(edid, globalSymbol);
    }
}

function kindFromFormType(type: FormType): ExprKindEngine | undefined {
    switch (type) {
        // TODO: expand type system to include all form types
        case "ACHR":
        case "ACRE":
            return "Actor";
        case "CREA":
            return "ActorBase";
        case "ACTI":
        case "ADDN":
        case "ALOC":
        case "AMEF":
        case "ANIO":
        case "ARMA":
        case "ASPC":
        case "AVIF":
        case "BPTD":
        case "CAMS":
        case "CLMT":
        case "CPTH":
        case "DEBR":
        case "DEHY":
        case "DOBJ":
        case "DOOR":
        case "EXPL":
        case "EYES":
        case "GRAS":
        case "HAIR":
        case "HDPT":
        case "HUNG":
        case "IDLM":
        case "INGR":
        case "IPCT":
        case "IPDS":
        case "LGTM":
        case "LIGH":
        case "LSCR":
        case "LSCT":
        case "LTEX":
        case "MICN":
        case "MSET":
        case "MSTT":
        case "MUSC":
        case "NAVM":
        case "PACK":
        case "PGRE":
        case "PROJ":
        case "PWAT":
        case "RADS":
        case "RCCT":
        case "RCPE":
        case "RGDL":
        case "SCOL":
        case "SCPT":
        case "SLPD":
        case "STAT":
        case "TACT":
        case "TERM":
        case "TREE":
        case "TXST":
        case "VTYP":
        case "WATR":
            return "AnyForm";
        case "CDCK":
            return "CaravanDeck";
        case "CSNO":
            return "Casino";
        case "CELL":
            return "Cell";
        case "CHAL":
            return "Challenge";
        case "CLAS":
            return "Class";
        case "CSTY":
            return "CombatStyle";
        case "CONT":
            return "Container";
        case "EFSH":
            return "EffectShader";
        case "ECZN":
            return "EncounterZone";
        case "FACT":
            return "Faction";
        case "FLST":
            return "FormList";
        case "FURN":
            return "Furniture";
        case "GLOB":
            return "Global";
        case "IDLE":
            return "IdleForm";
        case "IMGS":
            return "ImageSpace";
        case "IMAD":
            return "ImageSpaceModifier";
        case "ALCH":
        case "AMMO":
        case "ARMO":
        case "BOOK":
        case "CCRD":
        case "CHIP":
        case "CMNY":
        case "IMOD":
        case "KEYM":
        case "MISC":
        case "WEAP":
            return "InvObjectOrFormList";
        case "LVLN":
            return "LeveledChar";
        case "LVLC":
            return "LeveledCreature";
        case "LVLI":
            return "LeveledItem";
        case "MGEF":
            return "MagicEffect";
        case "ENCH":
            return "MagicItem";
        case "MESG":
            return "Message";
        case "NOTE":
            return "Note";
        case "NPC_":
            return "NPC";
        case "PLYR":
        case "REFR":
            return "ObjectRef";
        case "PERK":
            return "Perk";
        case "QUST":
            return "Quest";
        case "RACE":
            return "Race";
        case "REGN":
            return "Region";
        case "REPU":
            return "Reputation";
        case "SOUN":
            return "Sound";
        case "SPEL":
            return "SpellItem";
        case "GMST":
            return "String";
        case "DIAL":
            return "Topic";
        case "WTHR":
            return "WeatherID";
        case "WRLD":
            return "WorldSpace";
    }
}

export interface GlobalData {
    type: FormType;
    edid: string;
    origin: string;
    script?: string;
}

export interface GlobalDataCombined {
    type: FormType;
    edid: string;
    origins: string[];
    script?: string;
}

type FormType =
    | "ACHR"
    | "ACRE"
    | "ACTI"
    | "ADDN"
    | "ALCH"
    | "ALOC"
    | "AMEF"
    | "AMMO"
    | "ANIO"
    | "ARMA"
    | "ARMO"
    | "ASPC"
    | "AVIF"
    | "BOOK"
    | "BPTD"
    | "CAMS"
    | "CCRD"
    | "CDCK"
    | "CELL"
    | "CHAL"
    | "CHIP"
    | "CLAS"
    | "CLMT"
    | "CMNY"
    | "CONT"
    | "CPTH"
    | "CREA"
    | "CSNO"
    | "CSTY"
    | "DEBR"
    | "DEHY"
    | "DIAL"
    | "DOBJ"
    | "DOOR"
    | "ECZN"
    | "EFSH"
    | "ENCH"
    | "EXPL"
    | "EYES"
    | "FACT"
    | "FLST"
    | "FURN"
    | "GLOB"
    | "GMST"
    | "GRAS"
    | "HAIR"
    | "HDPT"
    | "HUNG"
    | "IDLE"
    | "IDLM"
    | "IMAD"
    | "IMGS"
    | "IMOD"
    | "INGR"
    | "IPCT"
    | "IPDS"
    | "KEYM"
    | "LGTM"
    | "LIGH"
    | "LSCR"
    | "LSCT"
    | "LTEX"
    | "LVLC"
    | "LVLI"
    | "LVLN"
    | "MESG"
    | "MGEF"
    | "MICN"
    | "MISC"
    | "MSET"
    | "MSTT"
    | "MUSC"
    | "NAVM"
    | "NOTE"
    | "NPC_"
    | "PACK"
    | "PERK"
    | "PGRE"
    | "PLYR"
    | "PROJ"
    | "PWAT"
    | "QUST"
    | "RACE"
    | "RADS"
    | "RCCT"
    | "RCPE"
    | "REFR"
    | "REGN"
    | "REPU"
    | "RGDL"
    | "SCOL"
    | "SCPT"
    | "SLPD"
    | "SOUN"
    | "SPEL"
    | "STAT"
    | "TACT"
    | "TERM"
    | "TREE"
    | "TXST"
    | "VTYP"
    | "WATR"
    | "WEAP"
    | "WRLD"
    | "WTHR";
