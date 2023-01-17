// export function FindSymbolDeclarationBlock(
//   node: NodeOrToken,
//   name: string
// ): StatementList | undefined {
//   while (true) {
//     const parent = FindAncestor(node, node => node.kind === SyntaxKind.StatementList) as StatementList | undefined;

//     if (parent == undefined) {
//       break;
//     }

//     if (parent.symbol_table[name] != undefined) {
//       return parent;
//     }

//     if ("parent" in parent.parent) {
//       node = parent.parent;
//     } else {
//       break;
//     }
//   }

//   return undefined;
// }

// export async function ResolveSymbol(
//   node: AnyNodeWithParent,
//   name: string
// ): Promise<Symbol | undefined> {
//   const block = FindSymbolDeclarationBlock(node, name);

//   if (block != undefined) {
//     return block.symbol_table[name];
//   } else {
//     const script = FindAncestor(node, node => node.kind === SyntaxKind.Script)! as Script;
//     return script.environment.global_symbol_table[name] ??
//       await CreateGlobalFunctionSymbol(name.toLowerCase());
//   }
// }

// export function FindAllReferences(
//   scope: AnyNodeWithParent,
//   name: string
// ): Identifier[] {
//   const block = FindSymbolDeclarationBlock(scope, name);

//   if (block == undefined) {
//     return [];
//   }

//   const refs: Identifier[] = [];
//   const symbol = block.symbol_table[name];
//   const leafs = GetNodeLeafs(block);

//   for (const leaf of leafs) {
//     if (leaf.kind === SyntaxKind.Identifier && leaf.symbol === symbol) {
//       refs.push(leaf);
//     }
//   }

//   return refs;
// }

// export function GetVisibleSymbols(node: AnyNodeWithParent): SymbolTable {
//   const symbol_table: SymbolTable = {};

//   let last_node: AnyNode = node;

//   while (true) {
//     const parent = FindAncestor(last_node, node => node.kind === SyntaxKind.StatementList) as StatementList | undefined;
//     if (parent == undefined) {
//       break;
//     }
//     Object.assign(symbol_table, parent.symbol_table);
//     last_node = parent.parent;
//     if (!("parent" in last_node)) {
//       break;
//     }
//   }

//   Object.assign(
//     symbol_table,
//     (last_node as Script).environment.global_symbol_table
//   );

//   return symbol_table;
// }

// export function GetExpressionType(node: AnyNode): Type {
//   if (node.expression_type != undefined) {
//     return node.expression_type;
//   }

//   switch (node.kind) {
//     case SyntaxKind.Number:
//       if (node.content.includes(".")) {
//         node.expression_type = Type.Float;
//       } else {
//         node.expression_type = Type.Integer;
//       }

//       return node.expression_type!;

//     case SyntaxKind.String:
//       node.expression_type = Type.String;
//       return Type.String;

//     case SyntaxKind.BinaryExpresison: {
//       const lhs = GetExpressionType(node.children.lhs);
//       const rhs = GetExpressionType(node.children.rhs);

//       node.expression_type =
//         lhs === Type.Ambiguous ? rhs :
//           rhs === Type.Ambiguous ? lhs :
//             lhs === rhs ? lhs :
//               Type.Unknown;

//       return node.expression_type!;
//     }

//     case SyntaxKind.Identifier:
//     case SyntaxKind.FunctionExpression:
//       node.expression_type = Type.Ambiguous;
//       return Type.Ambiguous;

//     default: return Type.Unknown;
//   }
// }

// export function AssignNodeSymbol(
//   node: AnyNode,
//   symbol_table: SymbolTable,
//   global_symbol_table: SymbolTable,
// ): void {
//   switch (node.kind) {
//     case SyntaxKind.VariableDeclaration:
//       symbol_table[node.children.variable.content] = {
//         name: node.children.variable.content,
//         kind: SymbolKind.Variable,
//         declaration: node,
//         type: Type.Ambiguous,
//       };
//       break;

//     case SyntaxKind.Script:
//       symbol_table[node.children.name.content] = {
//         name: node.children.name.content,
//         kind: SymbolKind.Script,
//         declaration: node,
//         type: Type.Ambiguous,
//       };
//       break;

//     case SyntaxKind.BlockTypeFunction: {
//       const parent = node.parent;
//       if (parent.kind === SyntaxKind.BlockTypeExpression) {
//         const script = parent.parent.parent;
//         if (script.kind === SyntaxKind.Script) {
//           global_symbol_table[script.children.name.content] = {
//             name: script.children.name.content,
//             kind: SymbolKind.Function,
//             declaration: script,
//             type: Type.Ambiguous,
//           };
//         }
//       }
//       break;
//     }

//     default:
//       break;
//   }
// }

// export function BuildScriptSymbolTables(script: Script) {
//   let last_symbol_table: SymbolTable = script.environment.global_symbol_table;
//   let last_symbol_table_saved: SymbolTable;

//   ForEachChildRecursive(
//     script,
//     node => {
//       last_symbol_table_saved = last_symbol_table;

//       if (node.kind === SyntaxKind.StatementList) {
//         last_symbol_table = node.symbol_table;
//       } else {
//         AssignNodeSymbol(
//           node,
//           last_symbol_table,
//           script.environment.global_symbol_table
//         );
//       }
//     },
//     () => {
//       last_symbol_table = last_symbol_table_saved;
//     }
//   );
// }

// export async function ValidateNode(node: AnyNode, script: Script): Promise<void> {
//   switch (node.kind) {
//     case SyntaxKind.BinaryExpresison: {
//       const lhs = GetExpressionType(node.children.lhs);
//       const rhs = GetExpressionType(node.children.rhs);

//       if (
//         (lhs === rhs || lhs === Type.Ambiguous || rhs === Type.Ambiguous) &&
//         lhs !== Type.Unknown &&
//         rhs !== Type.Unknown
//       ) {
//         return;
//       } else {
//         script.diagnostics.push({
//           message: `Unexpected operand types: "${GetTypeName(lhs)}" and "${GetTypeName(rhs)}"`,
//           range: node.range
//         });
//       }

//       break;
//     }

//     case SyntaxKind.Identifier:
//       node.symbol = await ResolveSymbol(
//         node,
//         node.content
//       );

//       if (node.symbol == undefined) {
//         script.semantic_tokens.push(node);
//       }
//   }
// }

// export async function ValidateScript(script: Script): Promise<void> {
//   ForEachChildRecursiveAsync(
//     script,
//     async node => await ValidateNode(node, script)
//   );
// }
