import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, minified PDF.js worker (Mozilla, Apache-2.0, from pdfjs-dist),
    // served at /pdf.worker.min.mjs for client-side résumé parsing. It is a
    // generated third-party asset, not CareerAI source — exclude it from lint.
    "public/pdf.worker*.mjs",
  ]),
]);

export default eslintConfig;
