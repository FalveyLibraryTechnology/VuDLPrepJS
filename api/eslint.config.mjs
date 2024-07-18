import typescriptEslint from "@typescript-eslint/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import tsParser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";

export default [
    // jsdoc configuration, currently disabled until we're ready to enforce it:
    //jsdoc.configs['flat/recommended'],
    // typescript configuration:
    ...tseslint.configs.recommended,
    // local settings:
    {
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
