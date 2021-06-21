"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Visitor_1 = __importDefault(require("@swc/core/Visitor"));
const core_1 = require("@swc/core");
const promises_1 = require("fs/promises");
const permissionExtractor = {
    "Deno.readTextFile": {
        permission: "read",
        extractArgs: (e) => {
            return e[0].expression.type === "StringLiteral"
                ? e[0].expression.value
                : ``;
        },
    },
    fetch: {
        permission: "net",
        extractArgs: (e) => {
            return e[0].expression.type === "StringLiteral"
                ? e[0].expression.value
                : ``;
        },
    },
};
const filename = "./sample/reader/reader.ts";
const collection = {};
const filesToProcess = {};
class ConsoleStripper extends Visitor_1.default {
    visitCallExpression(e) {
        if (e.callee.type === "MemberExpression") {
            // look for Deno.readTextFile type calls
            if (e.callee.object.type === "Identifier" &&
                e.callee.property.type === "Identifier") {
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
        }
        else if (e.type === "CallExpression") {
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
    const text = await promises_1.readFile(filename, "utf8");
    core_1.transformSync(text, {
        plugin: (m) => new ConsoleStripper().visitProgram(m),
        filename,
    });
    console.log(JSON.stringify(collection, null, 2));
}
main().catch(console.error);
