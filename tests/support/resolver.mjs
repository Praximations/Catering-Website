import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Lets Node's built-in test runner load this project's TypeScript directly.
 *
 * Node 22 strips types on its own, but its ESM resolver still wants a file
 * extension, and it knows nothing about the "@/" alias in tsconfig.json.
 * Teaching it both here is what keeps `npm test` free of a bundler, a
 * transpiler, and the dependency tree either would bring.
 */

const ROOT = process.cwd();
/** Mirrors how a bundler resolves a directory or an extensionless file. */
const CANDIDATES = ["", ".ts", ".tsx", ".mts", "/index.ts", "/index.tsx"];

function firstExisting(base) {
  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    // A bare directory is not a module; only its index file is.
    if (suffix === "" && !/\.[a-z]+$/i.test(candidate)) continue;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const hit = firstExisting(resolvePath(ROOT, specifier.slice(2)));
    if (hit) return { url: hit, shortCircuit: true };
  }
  if (specifier.startsWith(".")) {
    const parent = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : ROOT;
    const hit = firstExisting(resolvePath(parent, specifier));
    if (hit) return { url: hit, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
