import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField, fontProviders } from "astro/config";
import { siteInfo } from "./src/features/shared/siteInfo.js";
import { mdxAutoImport } from "./src/features/shared/mdx-auto-import.ts";

function sanitizeName(name) {
  if (!name) return 'asset';
  return name
    .replace(/[^a-zA-Z0-9_.-]/g, '-') 
    .replace(/-+/g, '-')              
    .replace(/^-|-$/g, '');           
}

export default defineConfig({
	site: process.env.SITE_URL || siteInfo.url.replace(/\/$/, ""),
	trailingSlash: "always",
	build: {
		format: "directory",
    inlineStylesheets: "always",
	},
	output: "static",

	adapter: cloudflare({
		imageService: "compile",
		sessionKVBindingName: "SESSION",
		prerenderEnvironment: "workerd",
	}),

	integrations: [
		sitemap({
			filter: (page) => {
				const pathname = new URL(page).pathname;
				return !pathname.startsWith("/checkout/");
			},
		}),
		mdxAutoImport({
			scopes: [
				{
					match: "/blog/",
					imports: [
						"./src/features/blog/post-components/BlogpostImage.astro",
						"./src/features/blog/post-components/BlogpostVideo.astro",
						"./src/features/blog/post-components/BlogProductList.astro",
					],
				},
				{ match: "/products/", imports: ["./src/components/CardSystem/SimpleCard.astro"] },
			],
		}),
		mdx(),
	],

	image: {
		remotePatterns: [
			{ protocol: "https", hostname: `assets.${siteInfo.domain}` },
			{ protocol: "https", hostname: "images.unsplash.com" },
			{ protocol: "https", hostname: "placehold.co" },
		],
	},

	vite: {
		build: {
			assetsInlineLimit: 4096,
      rollupOptions: {
        // sanitize static assets to prevent cloudflare redirect
        output: {
          assetFileNames: (assetInfo) => {
            const originalName = assetInfo.names?.[0] ?? 'asset';
            let baseName = originalName;
            const extIndex = baseName.lastIndexOf('.');
            if (extIndex > 0) {
              baseName = baseName.substring(0, extIndex);
            }
            return `_astro/${sanitizeName(baseName)}.[hash][extname]`;
          },
          chunkFileNames: (chunkInfo) => {
            return `_astro/${sanitizeName(chunkInfo.name)}-[hash].js`;
          },
          entryFileNames: (chunkInfo) => {
            return `_astro/${sanitizeName(chunkInfo.name)}-[hash].js`;
          }
        },
      },
		},
		server: {
			allowedHosts: [`local.${siteInfo.domain}`],
		},
	},

	// 4. Type-safe Environment Variables for Gateways & Webhooks
	env: {
		schema: {
			// Chip-in Payment Gateway
			ACTIVE_ONETIME_GATEWAY: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			CHIPIN_SECRET_KEY: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			CHIPIN_BRAND_ID: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			CHIPIN_WEBHOOK_PUBLIC_KEY: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			SITE_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			ACTIVE_SUBSCRIPTION_GATEWAY: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			STRIPE_SECRET_KEY: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			STRIPE_WEBHOOK_SECRET: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			MAKE_WEBHOOK_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			MAKE_WEBHOOK_API_KEY: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			POST_PURCHASE_GENERIC_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			POST_PURCHASE_BACKEND_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			GOOGLE_SCRIPT_WEBHOOK_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			NOTIFY_SECRET: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			NOTIFY_SLACK_WEBHOOK_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			NOTIFY_GENERIC_WEBHOOK_URL: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			// Live Stock (Baserow)
			BASEROW_API_TOKEN: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
			ACTIVE_STOCK_PROVIDER: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
		},
		validateSecrets: true,
	},

	// 5. Native Session Handling for PII via Cloudflare KV
	session: {
		cookie: {
			name: "yoursite-session",
			secure: true,
			httpOnly: true,
			sameSite: "lax",
		},
		ttl: 15552000, // 180 days
	},

	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: "Playfair Display",
			cssVariable: "--serif-font",
			weights: [400, 700],
			styles: ["normal"],
			fallbacks: [
				"Avenir Next",
				"Avenir",
				"Nimbus Sans L",
				"Roboto",
				"Noto Sans",
				"Segoe UI",
				"Arial",
				"Helvetica",
				"Helvetica Neue",
				"sans-serif",
			],
		},
		{
			provider: fontProviders.fontsource(),
			name: "Source Sans 3",
			cssVariable: "--sans-font",
			weights: [400, 700],
			styles: ["normal"],
			fallbacks: [
				"Consolas",
				"Menlo",
				"Monaco",
				"Andale Mono",
				"Ubuntu Mono",
				"monospace",
			],
		},
	],
});
