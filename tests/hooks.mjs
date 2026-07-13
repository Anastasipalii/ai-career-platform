// Minimal module-resolution hook so tests can import source via the "@/" alias
// (mapped to <repo>/src) the same way Next/tsconfig does. Zero dependencies.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    const candidate =
      existsSync(base) ? base
      : existsSync(base + ".ts") ? base + ".ts"
      : existsSync(path.join(base, "index.ts")) ? path.join(base, "index.ts")
      : base;
    return next(pathToFileURL(candidate).href, context);
  }
  return next(specifier, context);
}
