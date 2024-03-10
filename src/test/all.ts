#!/bin/env -S node --loader ts-node/esm
import * as formatting from "./formatting.js";
import * as parser from "./parser.js";

parser.main();
formatting.main();
