// Registers the "@/" alias resolver hook for the test run. Zero dependencies.
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
