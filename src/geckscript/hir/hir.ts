import * as ast from "../ast.js";
import { FunctionData } from "../function_data.js";
import { File } from "../hir.js";
import { SyntaxKind, Token } from "../syntax.js";

export type HirNode =
    | Script
    | StmtList
    | Stmt
    | Branch
    | Expr
    | VarOrVarDeclList
    | VarOrVarDecl
    | Blocktype
    | String
    | Number;

export class Script {
    constructor(
        public name: string,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.Script
    ) {}
}

export class StmtList {
    constructor(
        public stmts: Stmt[],
        public node: ast.StmtList
    ) {}
}

export type Stmt = IfStmt | WhileStmt | BeginStmt | ForeachStmt | SetStmt | VarDeclStmt | Expr;

export class IfStmt {
    constructor(
        public cond: Expr,
        public trueBranch: StmtList,
        public falseBranch: Branch | undefined,
        public symbolTable: Map<string, Symbol>,
        public node: ast.IfStmt | ast.Branch
    ) {}
}

export class Branch {
    constructor(
        public cond: Expr | undefined,
        public trueBranch: StmtList,
        public falseBranch: Branch | undefined,
        public symbolTable: Map<string, Symbol>,
        public node: ast.IfStmt | ast.Branch
    ) {}
}

export class WhileStmt {
    constructor(
        public cond: Expr,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.WhileStmt
    ) {}
}

export class BeginStmt {
    constructor(
        public blocktype: Blocktype,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.BeginStmt
    ) {}
}

export class Blocktype {
    constructor(
        public name: string,
        public args: Expr[],
        public node: ast.BlocktypeDesig
    ) {}
}

export class ForeachStmt {
    constructor(
        public nameRef: NameRef,
        public iter: Expr,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.ForeachStmt
    ) {}
}

export class SetStmt {
    constructor(
        public var_: Expr,
        public value: Expr,
        public node: ast.SetStmt
    ) {}
}

export class VarDeclStmt {
    constructor(
        public name: Name,
        public value: Expr | undefined,
        public node: ast.VarDeclStmt
    ) {}
}

export type Expr =
    | UnaryExpr
    | BinExpr
    | FieldExpr
    | IndexExpr
    | FuncExpr
    | LetExpr
    | LambdaInlineExpr
    | LambdaExpr
    | Literal
    | NameRef;

export class UnaryExpr {
    constructor(
        public type: ExprType,
        public op: UnaryExprOp,
        public operand: Expr,
        public node: ast.UnaryExpr
    ) {}
}

export const enum UnaryExprOp {
    Not,
}

export class BinExpr {
    constructor(
        public type: ExprType,
        public op: BinExprOp,
        public lhs: Expr,
        public rhs: Expr,
        public node: ast.BinExpr
    ) {}
}

export const enum BinExprOp {
    Plus,
    Minus,
    Asterisk,
    Slash,
    Percent,
    Eq,
}

export class FieldExpr {
    constructor(
        public type: ExprType,
        public op: FieldExprOp,
        public lhs: Expr,
        public field: NameRef,
        public node: ast.FieldExpr
    ) {}
}

export class IndexExpr {
    constructor(
        public type: ExprType,
        public lhs: Expr,
        public index: Expr,
        public node: ast.IndexExpr
    ) {}
}

export const enum FieldExprOp {
    Dot,
    RArrow,
}

export class FuncExpr {
    constructor(
        public type: ExprType,
        public func: Expr,
        public args: Expr[],
        public node: ast.FuncExpr
    ) {}
}

export class LetExpr {
    constructor(
        public type: ExprType,
        public lhs: Expr,
        public op: BinExprOp,
        public expr: Expr,
        public node: ast.LetExpr
    ) {}
}

export class LambdaInlineExpr {
    constructor(
        public type: ExprType,
        public params: VarOrVarDeclList,
        public expr: Expr,
        public symbolTable: Map<string, Symbol>,
        public node: ast.LambdaInlineExpr
    ) {}
}

export class LambdaExpr {
    constructor(
        public type: ExprType,
        public params: VarOrVarDeclList,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.LambdaExpr
    ) {}
}

export class VarOrVarDeclList {
    constructor(
        public list: VarOrVarDecl[],
        public node: ast.VarOrVarDeclList
    ) {}
}

export type VarOrVarDecl = Name | NameRef;

export class Name {
    symbol: Symbol;

    constructor(
        name: string,
        type: ExprType,
        public node: ast.Name
    ) {
        this.symbol = new Symbol(name, type, this);
    }

    public get type(): ExprType {
        return this.symbol.type;
    }
}

export class NameRef {
    constructor(
        public symbol: Symbol | GlobalSymbol | FunctionData,
        public node: ast.NameRef
    ) {}

    public get type(): ExprType {
        return this.symbol.type;
    }
}

export class Literal {
    constructor(
        public literal: String | Number,
        public type: ExprType,
        public node: ast.Literal
    ) {}
}

export class String {
    constructor(
        public value: string,
        public node: Token<SyntaxKind.STRING>
    ) {}
}

export class Number {
    constructor(
        public value: number,
        public node: Token<SyntaxKind.NUMBER_INT>
    ) {}
}

export type ExprType = ExprTypeSimple | ExprTypeFunction;

export class ExprTypeSimple {
    // for script variables
    file?: File;
    members: (Symbol | GlobalSymbol | FunctionData)[] = [];

    constructor(public kind: Exclude<ExprKind, "Function"> = "<unknown>") {}

    isAssignableTo(other: ExprType): boolean {
        if (other.kind === "Function") {
            return false;
        }
        const base = this.baseType();
        const otherBase = other.baseType();

        if (otherBase === "StringOrNumber") {
            return base === "StringVar" || base === "Number";
        }

        return base === otherBase;
    }

    // isChildOf(other: ExprType): boolean {
    //     switch (this.kind) {
    //         case "Ambiguous":
    //         case "AnyType":
    //         case "<unknown>":
    //             return true;
    //         case "Number":
    //         case "ObjectRef":
    //         case "StringOrNumber":
    //         case "StringVar":
    //         case "Array":
    //         case "Axis":
    //             return false;
    //         case "Integer":
    //         case "Float":
    //             return other.kind === "Number" || other.kind === "StringOrNumber";
    //         case "Double":
    //             return (
    //                 other.kind === "Float" ||
    //                 other.kind === "Number" ||
    //                 other.kind === "StringOrNumber"
    //             );
    //         case "1/0":
    //         case "Bool":
    //         // TODO: not sure
    //         case "AIPackage":
    //         case "ActorBase":
    //         case "ActorValue":
    //         case "Alignment":
    //         case "AnimationGroup":
    //         case "Array index":
    //         case "Casino":
    //         case "Challenge":
    //         case "Class":
    //         case "CombatStyle":
    //         case "CrimeType":
    //         case "CriticalStage":
    //         case "EffectShader":
    //         case "EncounterZone":
    //         case "EquipType":
    //         case "Faction":
    //         case "FormType":
    //         case "Furniture":
    //         case "Global":
    //         case "ImageSpace":
    //         case "ImageSpaceModifier":
    //         case "MagicEffect":
    //         case "MiscStat":
    //         case "ObjectID":
    //         case "Owner":
    //         case "Pair":
    //         case "Race":
    //         case "Reputation":
    //         case "ScriptVar":
    //         case "Sex":
    //         case "Slice":
    //         case "Sound":
    //         case "SoundFile":
    //         case "SpellItem":
    //         case "String":
    //         case "Topic":
    //         case "VariableName":
    //         case "WeatherID":
    //         case "unk2E":
    //             return (
    //                 other.kind === "Integer" ||
    //                 other.kind === "Number" ||
    //                 other.kind === "StringOrNumber"
    //             );
    //         case "Actor":
    //         case "AnyForm":
    //         case "CaravanDeck":
    //         case "Cell":
    //         case "Container":
    //         case "Form":
    //         case "FormList":
    //         case "IdleForm":
    //         case "InvObjectOrFormList":
    //         case "LeveledChar":
    //         case "LeveledCreature":
    //         case "LeveledItem":
    //         case "LeveledOrBaseChar":
    //         case "LeveledOrBaseCreature":
    //         case "MagicItem":
    //         case "MapMarker":
    //         case "Message":
    //         case "NPC":
    //         case "NonFormList":
    //         case "Note":
    //         case "Object":
    //         case "Perk":
    //         case "Quest":
    //         case "QuestStage":
    //         case "Region":
    //         case "Variable":
    //         case "WorldSpace":
    //             return other.kind === "ObjectRef";
    //     }
    // }
    //
    baseType(): ExprKind {
        switch (this.kind) {
            case "Ambiguous":
            case "AnyType":
            case "<unknown>":
            case "Number":
            case "StringOrNumber":
            case "StringVar":
            case "Array":
            case "Axis":
                return this.kind;
            case "String":
                return "StringVar";
            case "Integer":
            case "Float":
            case "Double":
            case "ObjectRef":
            case "1/0":
            case "Bool":
            // TODO: not sure
            case "AIPackage":
            case "ActorBase":
            case "ActorValue":
            case "Alignment":
            case "AnimationGroup":
            case "Array index":
            case "Casino":
            case "Challenge":
            case "Class":
            case "CombatStyle":
            case "CrimeType":
            case "CriticalStage":
            case "EffectShader":
            case "EncounterZone":
            case "EquipType":
            case "Faction":
            case "FormType":
            case "Furniture":
            case "Global":
            case "ImageSpace":
            case "ImageSpaceModifier":
            case "MagicEffect":
            case "MiscStat":
            case "ObjectID":
            case "Owner":
            case "Pair":
            case "Race":
            case "Reputation":
            case "ScriptVar":
            case "Sex":
            case "Slice":
            case "Sound":
            case "SoundFile":
            case "SpellItem":
            case "Topic":
            case "VariableName":
            case "WeatherID":
            case "unk2E":
                return "Number";
            case "Actor":
            case "AnyForm":
            case "CaravanDeck":
            case "Cell":
            case "Container":
            case "Form":
            case "FormList":
            case "IdleForm":
            case "InvObjectOrFormList":
            case "LeveledChar":
            case "LeveledCreature":
            case "LeveledItem":
            case "LeveledOrBaseChar":
            case "LeveledOrBaseCreature":
            case "MagicItem":
            case "MapMarker":
            case "Message":
            case "NPC":
            case "NonFormList":
            case "Note":
            case "Object":
            case "Perk":
            case "Quest":
            case "QuestStage":
            case "Region":
            case "Variable":
            case "WorldSpace":
                return "Number";
        }
    }

    toString(): string {
        if (this.members.length === 0) {
            return this.kind;
        } else {
            return `{\n    ${this.members.map((e) => e.type.toStringWithName(e.name)).join("\n    ")}\n} ${this.kind}`;
        }
    }

    toStringWithName(name: string): string {
        return `${this.toString()} ${name}`;
    }
}

export class ExprTypeFunction {
    kind = "Function" as const;

    constructor(
        public ret: ExprType,
        public args: ExprType[] = []
    ) {}

    isAssignableTo(other: ExprType): boolean {
        if (other.kind !== "Function" || other.ret.kind !== this.ret.kind) {
            return false;
        }
        for (let i = 0; i < Math.min(this.args.length, other.args.length); ++i) {
            if (this.args[i].kind !== other.args[i].kind) {
                return false;
            }
        }
        return true;
    }

    // isChildOf(_other: ExprType): boolean {
    //     return false;
    // }

    toString(): string {
        if (this.args.length !== 0) {
            return `(${this.ret}) ${this.args.join(" ")}`;
        } else {
            return this.ret.toString();
        }
    }

    toStringWithName(name: string): string {
        if (this.args.length !== 0) {
            return `(${this.ret}) ${name} ${this.args.join(" ")}`;
        } else {
            return this.ret.toStringWithName(name);
        }
    }
}

export type ExprKind = ExprKindEngine | ExprKindCustom;

export type ExprKindEngine =
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

export function isExprKindEngine(str: string): str is ExprKindEngine {
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

export type ExprKindCustom = "Function";

export class GlobalSymbol {
    referencingFiles: Set<string> = new Set();

    constructor(
        public name: string,
        public type: ExprType,
        public buildtin?: FunctionData
    ) {}
}

export class Symbol {
    constructor(
        public name: string,
        public type: ExprType,
        public decl: Name
    ) {}
}
