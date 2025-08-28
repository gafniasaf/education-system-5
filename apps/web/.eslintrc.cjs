/**
 * ESLint configuration for apps/web
 *
 * - Forbid importing server-only fetch helper inside dashboard pages to enforce Gateway usage.
 */
module.exports = {
	root: true,
	extends: ["next/core-web-vitals", "plugin:jsx-a11y/recommended"],
	plugins: ["jsx-a11y"],
	overrides: [
		{
			files: ["src/app/dashboard/**/*.{ts,tsx}"],
			rules: {
				"no-restricted-imports": [
					"error",
					{
						patterns: [
							"@/lib/serverFetch",
							"../lib/serverFetch",
							"../../lib/serverFetch",
							"../../../lib/serverFetch"
						]
					}
				]
			}
		},
		{
			files: ["src/server/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}"],
			rules: {
				"@next/next/no-server-import-in-page": "off"
			}
		}
	]
};


