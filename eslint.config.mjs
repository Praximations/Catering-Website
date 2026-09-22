import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /**
       * Node runs this project's TypeScript by STRIPPING types, not by
       * compiling them, which is what lets `npm test` work without a
       * transpiler. Syntax that has to be compiled away is therefore a build
       * error at runtime rather than a style question:
       *
       *   class C { constructor(readonly x: number) {} }   parameter property
       *   enum Status { New }                              needs a runtime object
       *   namespace Foo {}                                 needs a runtime object
       *
       * Caught here, where the message says why, rather than as an opaque
       * ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX from a test run.
       */
      "@typescript-eslint/parameter-properties": "error",
      "@typescript-eslint/no-namespace": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message:
            "Use a union of string literals plus a const array. An enum needs a runtime object, and Node strips types rather than compiling them.",
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
