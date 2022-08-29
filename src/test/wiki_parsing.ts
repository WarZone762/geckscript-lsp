import * as functions from "../wiki/functions";
import * as parser from "../wiki/parser";


console.log(parser.Parse("{{Function\n |origin = GECK1\n |summary = When given a number, returns the absolute value of the number.\n |name = Abs\n |returnType = float\n |arguments = \n  {{FunctionArgument\n   |Name = x\n   |Type = float\n  }}\n |example = abs x\n Will return the absolute value of x.\n}}\n\n==Notes==\n*The abs directive ([[Mathematical UI directives]]) is a trait that returns the absolute value of an element in a user interface XML block.\n\n==See Also==\n*[[Cos]]\n*[[Log]]\n*[[Pow]]\n*[[Sin]]\n*[[Tan]]\n\n[[Category:User_Interface]]\n[[Category:Functions (GECK)]]\n[[Category:Functions]]\n[[Category:Math Functions]]\n[[Category:Functions (FO3)]]"));
