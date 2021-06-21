import Visitor from "@swc/core/Visitor";
import {
  Argument,
  CallExpression,
  Expression,
  ImportDeclaration,
  transformSync,
} from "@swc/core";
import { readFile } from "fs/promises";

type ArgumentExtractor = (
  e: Argument[]
) => string | number | boolean | Array<string | number | boolean> | undefined;

interface PermissionExtractor {
  permission: "read" | "write" | "net";
  extractArgs: ArgumentExtractor;
}
const permissionExtractor: Record<string, PermissionExtractor> = {
  "Deno.readTextFile": {
    permission: "read",
    extractArgs: (e: Argument[]) => {
      return e[0].expression.type === "StringLiteral"
        ? e[0].expression.value
        : ``;
    },
  },
  fetch: {
    permission: "net",
    extractArgs: (e: Argument[]) => {
      return e[0].expression.type === "StringLiteral"
        ? e[0].expression.value
        : ``;
    },
  },
};

interface PermissionCall {
  filename?: string;
  start?: number;
  end?: number;
  fnCall: string;
  permission: string;
  args?:
    | string
    | number
    | boolean
    | Array<string | number | boolean>
    | undefined;
}
const filename = "./sample/reader/reader.ts";

const collection: Record<string, PermissionCall> = {};
const filesToProcess = {};

class ConsoleStripper extends Visitor {
  visitCallExpression(e: CallExpression): Expression {
    if (e.callee.type === "MemberExpression") {
      // look for Deno.readTextFile type calls
      if (
        e.callee.object.type === "Identifier" &&
        e.callee.property.type === "Identifier"
      ) {
        const fnCall = `${e.callee.object.value}.${e.callee.property.value}`;
        if (fnCall in permissionExtractor) {
          const { permission, extractArgs } = permissionExtractor[fnCall];
          collection[`${filename}:${e.span.start}:${e.span.end}`] = {
            fnCall,
            permission,
            args: extractArgs(e.arguments),
          };
        }
      }
    } else if (e.type === "CallExpression") {
      // look for `fetch` type calls
      if (e.callee.type === "Identifier") {
        const fnCall = e.callee.value;
        if (fnCall in permissionExtractor) {
          const { permission, extractArgs } = permissionExtractor[fnCall];
          collection[`${filename}:${e.span.start}:${e.span.end}`] = {
            fnCall,
            permission,
            args: extractArgs(e.arguments),
          };
        }
      }
    }
    return e;
  }
}
async function main() {
  const text = await readFile(filename, "utf8");

  transformSync(text, {
    plugin: (m) => new ConsoleStripper().visitProgram(m),
    filename,
  });

  console.log(JSON.stringify(collection, null, 2));
}

main().catch(console.error);
