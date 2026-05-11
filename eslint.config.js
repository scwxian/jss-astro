import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import astroParser from "astro-eslint-parser";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
	// Ignore patterns
	{
		ignores: ["dist/**", ".astro/**", "node_modules/**", "*.d.ts"],
	},

	// Base Astro configuration
	...eslintPluginAstro.configs.recommended,

	// TypeScript files
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: "module",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"max-len": [
				"error",
				{
					code: 120,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreUrls: true,
					ignoreRegExpLiterals: true,
				},
			],
		},
	},

	// JavaScript files
	{
		files: ["**/*.js"],
		rules: {
			"max-len": [
				"error",
				{
					code: 120,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreUrls: true,
					ignoreRegExpLiterals: true,
				},
			],
		},
	},

	// Astro files
	{
		files: ["**/*.astro"],
		languageOptions: {
			parser: astroParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: 2022,
				sourceType: "module",
				extraFileExtensions: [".astro"],
			},
		},
		rules: {
			"max-len": [
				"error",
				{
					code: 120,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreUrls: true,
					ignoreRegExpLiterals: true,
				},
			],
		},
	},
];

