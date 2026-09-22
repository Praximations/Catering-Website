import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { describe, it } from "node:test";

/**
 * The house conventions, enforced rather than remembered.
 *
 * AGENTS.md states them as rules for whoever works on this next, which is
 * exactly the kind of rule that decays. These are cheap to check, so they are
 * checked.
 */

const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".test-tmp",
  "data",
  "coverage",
  ".vercel",
]);
const CHECKED_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".md", ".sql", ".css", ".yml"]);

async function sourceFiles(directory = ROOT): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github" && entry.name !== ".env.example") {
      continue;
    }
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      found.push(...(await sourceFiles(full)));
    } else if (CHECKED_EXTENSIONS.has(extname(entry.name)) || entry.name === ".env.example") {
      found.push(full);
    }
  }
  return found;
}

/**
 * Built from escapes rather than written literally, or this file would be the
 * first thing its own check finds.
 */
const DASHES = /[\u2014\u2013]/;

/**
 * A modifier at the START of a constructor parameter, which is a parameter
 * property. Matching the bare keyword would also flag the `readonly` in a type
 * such as `fields: readonly string[]`, which is ordinary and fine.
 */
const PARAMETER_PROPERTY = /constructor\s*\(\s*(private|public|protected|readonly)\s|,\s*(private|public|protected|readonly)\s+\w+\s*[?:]/;

describe("house conventions", () => {
  it("uses no em dashes and no en dashes anywhere", async () => {
    // A standing rule across these repos, and the easiest one to break by
    // pasting text from somewhere else.
    const offenders: string[] = [];

    for (const file of await sourceFiles()) {
      const contents = await readFile(file, "utf8");
      contents.split("\n").forEach((line, index) => {
        if (DASHES.test(line)) {
          offenders.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 80)}`);
        }
      });
    }

    assert.deepEqual(
      offenders,
      [],
      `Use a comma, a period, or a middot instead:\n${offenders.join("\n")}`
    );
  });

  it("uses no TypeScript syntax that Node's type stripping cannot run", async () => {
    // Duplicates the lint rules on purpose: lint is the fast feedback, and
    // this is what stops the project from being one npm-script away from an
    // opaque ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX at runtime.
    const offenders: string[] = [];

    for (const file of await sourceFiles()) {
      if (![".ts", ".tsx"].includes(extname(file))) continue;
      const contents = await readFile(file, "utf8");

      contents.split("\n").forEach((line, index) => {
        const where = `${relative(ROOT, file)}:${index + 1}`;
        if (PARAMETER_PROPERTY.test(line)) {
          offenders.push(`${where}: parameter property`);
        }
        if (/^\s*(export\s+)?(declare\s+)?(const\s+)?enum\s+\w/.test(line)) {
          offenders.push(`${where}: enum`);
        }
        if (/^\s*(export\s+)?namespace\s+\w/.test(line)) {
          offenders.push(`${where}: namespace`);
        }
      });
    }

    assert.deepEqual(offenders, [], offenders.join("\n"));
  });

  it("never reads a form field without a length cap", async () => {
    // text(formData, key) with two arguments is the old unbounded reader. The
    // cap is a security control, so its absence is a finding, not a style note.
    const offenders: string[] = [];

    for (const file of await sourceFiles(join(ROOT, "app"))) {
      const contents = await readFile(file, "utf8");
      contents.split("\n").forEach((line, index) => {
        if (/\btext\(\s*formData\s*,\s*"[^"]*"\s*\)/.test(line)) {
          offenders.push(`${relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 80)}`);
        }
      });
    }

    assert.deepEqual(offenders, [], `text() needs a maximum:\n${offenders.join("\n")}`);
  });

  it("keeps the old single-document store from coming back", async () => {
    // lib/store.ts held the whole database in one object, read and rewritten on
    // every change. Note that lib/db/store.ts is the NEW contract and a
    // relative "./store" inside lib/db is correct: only the removed top-level
    // module is a finding.
    const offenders: string[] = [];

    for (const file of await sourceFiles()) {
      if (![".ts", ".tsx"].includes(extname(file))) continue;
      const contents = await readFile(file, "utf8");
      if (/from "@\/lib\/store"/.test(contents)) {
        offenders.push(`${relative(ROOT, file)}: imports the removed lib/store`);
      }
      if (/readData\(|updateData\(/.test(contents)) {
        offenders.push(`${relative(ROOT, file)}: calls the removed readData/updateData`);
      }
    }

    assert.deepEqual(offenders, [], offenders.join("\n"));
  });
});
