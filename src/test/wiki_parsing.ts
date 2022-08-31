import * as functions from "../wiki/functions";

import * as wtf from "wtf_wikipedia";
// eslint-disable-next-line @typescript-eslint/no-var-requires
wtf.extend(require("wtf-plugin-markdown"));

// const text = "{{Function\n |origin = GECK1\n |summary = When given a number, returns the absolute value of the number.\n |name = Abs\n |returnType = float\n |arguments = \n  {{FunctionArgument\n   |Name = x\n   |Type = float\n  }}\n |example = abs x\nWill return the absolute value of x.\n}}\n\n==Notes==\n*The abs directive ([[Mathematical UI directives]]) is a trait that\n\n\n returns the absolute value of an element in a user interface XML block.\n\n==See Also==\n*[[Cos]]\n*[[Log]]\n*[[Pow]]\n*[[Sin]]\n*[[Tan]]\n\n[[Category:User_Interface]]\n[[Category:Functions (GECK)]]\n[[Category:Functions]]\n[[Category:Math Functions]]\n[[Category:Functions (FO3)]]";
const text = "{{Function\n |origin = ShowOff\n |originVersion = 1.15\n |summary = Returns true (1) if the [[Actor]]'s [[BaseForm]] has the specified flag enabled. If the function is called with an actor reference (''actorRefr''), its BaseForm is used.\n\nThe flag being checked is different depending on if the actor is a [[Creature]] or an [[NPC]].\n |alias = GetActorHasBaseFlag\n |returnVal = hasFlag\n |returnType = 0/1\n |referenceType = actorRefr\n |arguments = \n  {{FunctionArgument\n   |Name = flagIndex\n   |Type = int\n  }}{{FunctionArgument\n   |Name = actor\n   |Type = baseForm\n   |Optional = y\n  }}\n |conditionFunc = Both\n}}\n==''flagIndex'' Values==\n{| class=\"wikitable\" \n|- style=\"font-weight:bold;\"\n! Flag Index (Bit)\n! NPC Flag\n! Creature Flag\n|-\n| 0\n| female\n| unknown\n|-\n| 1\n| essential\n| essential\n|-\n| 2\n| has chargen face\n| \"weapon&shield?\"\n|-\n| 3\n| respawn\n| respawn\n|-\n| 4\n| auto-calc stats\n| swims\n|-\n| 5\n| unknown\n| flies\n|-\n| 6\n| unknown\n| walks\n|-\n| 7\n| pc level mult\n| pc level mult\n|-\n| 8\n| unknown\n| unknown\n|-\n| 9\n| no low-level processing\n| no low-level processing\n|-\n| 10\n| unknown\n| unknown\n|-\n| 11\n| no blood spray\n| unknown\n|-\n| 12\n| no blood decal\n| unknown\n|-\n| 13\n| unknown\n| unknown\n|-\n| style=\"vertical-align:middle;\" | 14\n| unknown\n| unknown\n|-\n| 15\n| unknown\n| No head\n|-\n| 16\n| unknown\n| No Right Arm\n|-\n| 17\n| unknown\n| No Left Arm\n|-\n| 18\n| unknown\n| No Combat In Water\n|-\n| 19\n| unknown\n| No Shadow\n|-\n| 20\n| no VATS melee\n| no VATS melee\n|-\n| 21\n| unknown\n| Allow PC Dialogue\n|-\n| 22\n| Can Be All Races\n| Can't Open Doors\n|-\n| 23\n| Auto-Calc Services\n| Immobile\n|-\n| 24\n| unknown\n| Tilt Front/Back\n|-\n| 25\n| unknown\n| Tilt Left/Right\n|-\n| 26\n| no knockdowns\n| no knockdowns\n|-\n| 27\n| not pushable\n| not pushable\n|-\n| 28\n| unknown\n| Allow Pickpocket\n|-\n| 29\n| unknown\n| Is Ghost\n|-\n| 30\n| no rotate to head track\n| no rotate to head track\n|-\n| 31\n| unknown\n| Invulnerable\n|}\n\n==Example==\n let short bHasFlag := SunnyREF.ActorHasBaseFlag 23\n''bHasFlag'' will be set to 1 if ''SunnyREF'''s BaseForm (GSSunnySmiles) has the ''Auto-Calc Services'' flag enabled, 0 otherwise.\n\n let short bHasFlag := ActorHasBaseFlag 5 CrBloatFly\n''bHasFlag'' will be set to 1 if ''CrBloatFly'' has the ''Flies'' flag enabled, 0 otherwise.\n\n==Notes==\n*This function essentially checks [[GetActorBaseFlagsLow]] and [[GetActorBaseFlagsHigh]] for the enabled bits.\n*This was made with condition functions in mind, as unlike in scripts, bit manipulation is not possible for conditions.\n\n==See Also==\n*[[GetActorBaseFlagsLow]] / [[GetActorBaseFlagsHigh]]\n*[[GetFlagsLow]] / [[GetFlagsHigh]]\n\n[[Category:Functions (ShowOff NVSE)]]\n[[Category:Actor Functions]]\n[[Category:Creature Functions]]\n[[Category:Bit Functions]]\n[[Category:Flag Functions]]";

wtf.extend((models: any, templates: any) => {
  templates.functionargument = (tmpl: any, list: any, parse: any) => {
    const obj = parse(tmpl);
    list.push(obj);

    return JSON.stringify(obj);
  };
});

const page = wtf(text);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
console.log(page.json());
