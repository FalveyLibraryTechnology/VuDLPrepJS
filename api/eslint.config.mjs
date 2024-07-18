import typescriptEslint from "@typescript-eslint/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    // jsdoc configuration, currently disabled until we're ready to enforce it:
    //jsdoc.configs['flat/recommended'],
    ...compat.extends("plugin:@typescript-eslint/recommended"), {
        files: ["**/*.ts", "**/*.js", "**/*.jsx"],

        plugins: {
            "@typescript-eslint": typescriptEslint,
            jsdoc,
        },

        languageOptions: {
            parser: tsParser,
        },
    }
];
