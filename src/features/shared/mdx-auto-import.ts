import { parse as parseJs } from "acorn";
import type { AstroIntegration } from "astro";
import { satteri } from "@astrojs/markdown-satteri";
import { parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const resolveModulePath = (path: string) => {
	if (path.startsWith(".")) return resolve(path);
	return path;
};

type NamedImportConfig = string | [from: string, as: string];
type ImportsConfig = (string | Record<string, string | NamedImportConfig[]>)[];
type MdxjsEsm = { type: "mdxjsEsm"; value: string; data: { estree: Record<string, unknown> } };

interface AutoImportScope {
	match: string;
	imports: ImportsConfig;
}

interface AutoImportConfig {
	scopes: AutoImportScope[];
}

function getDefaultImportName(path: string): string {
	return parse(path).name.replaceAll(/[^\w\d]/g, "");
}

function formatImport(imported: string, module: string): string {
	return `import ${imported} from ${JSON.stringify(module)};`;
}

function formatNamedImports(namedImport: NamedImportConfig[]): string {
	const imports: string[] = [];
	for (const imp of namedImport) {
		if (typeof imp === "string") {
			imports.push(imp);
		} else {
			const [from, as] = imp;
			imports.push(`${from} as ${as}`);
		}
	}
	return `{ ${imports.join(", ")} }`;
}

function processImportsConfig(config: ImportsConfig) {
	const imports = [];
	for (const option of config) {
		if (typeof option === "string") {
			imports.push(formatImport(getDefaultImportName(option), resolveModulePath(option)));
		} else {
			for (const path in option) {
				const namedImportsOrNamespace = option[path];
				if (typeof namedImportsOrNamespace === "string") {
					imports.push(formatImport(`* as ${namedImportsOrNamespace}`, resolveModulePath(path)));
				} else {
					const importString = formatNamedImports(namedImportsOrNamespace);
					imports.push(formatImport(importString, resolveModulePath(path)));
				}
			}
		}
	}
	return imports;
}

function generateImportsNode(config: ImportsConfig): MdxjsEsm {
	const imports = processImportsConfig(config);
	const js = imports.join("\n");
	return {
		type: "mdxjsEsm",
		value: js,
		data: {
			estree: {
				body: [],
				...parseJs(js, { ecmaVersion: "latest", sourceType: "module" }),
				type: "Program",
				sourceType: "module",
			},
		},
	};
}

interface MdxVisitorContext {
	fileURL?: string;
	insertBefore(node: unknown, newNode: unknown): void;
}

// Satteri mdast plugins are visitor objects keyed by node type.
// Insert the import before the first top-level block node.
const BLOCK_NODE_KEYS = [
	"paragraph",
	"heading",
	"thematicBreak",
	"blockquote",
	"list",
	"html",
	"code",
	"table",
	"mdxJsxFlowElement",
	"mdxFlowExpression",
	"mdxjsEsm",
] as const;

export function mdxAutoImport(integrationConfig: AutoImportConfig): AstroIntegration {
	return {
		name: "mdx-auto-import",
		hooks: {
			"astro:config:setup": ({ updateConfig }) => {
				const nodesByScope = new Map(
					integrationConfig.scopes.map((scope) => [scope.match, generateImportsNode(scope.imports)]),
				);
				updateConfig({
					markdown: {
						processor: satteri({
							mdastPlugins: [
								function injectMdxImports() {
									let injected = false;
									const visitor: Record<string, (node: unknown, ctx: MdxVisitorContext) => void> = {};
									for (const key of BLOCK_NODE_KEYS) {
										visitor[key] = (node, ctx) => {
											if (injected) return;
											injected = true;
											const filePath = ctx.fileURL ? fileURLToPath(ctx.fileURL) : "";
											if (filePath.endsWith(".md")) return;
											const scope = integrationConfig.scopes.find((s) => filePath.includes(s.match));
											if (!scope) return;
											ctx.insertBefore(node, nodesByScope.get(scope.match));
										};
									}
									return visitor;
								},
							],
						}),
					},
				});
			},
		},
	};
}
