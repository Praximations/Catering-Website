import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Loaded with --import so the hook is in place before the first test file
// is resolved.
register("./resolver.mjs", pathToFileURL(`${import.meta.dirname}/`));
