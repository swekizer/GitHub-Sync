import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: __dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...(obsidianmd.configs?.recommended as any || []),
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"esbuild-inject.js",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
