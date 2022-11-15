/**@type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: [
		"@typescript-eslint",
	],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
	],
	rules: {
		"semi": ["error", "always"],
		"quotes": ["error", "double"],
		"no-inner-declarations": "off",
		"no-constant-condition": ["error", { checkLoops: false }],
		"curly": ["error", "all"],
		"brace-style": ["error", "1tbs", { allowSingleLine: false }],
		// '@typescript-eslint/no-unused-vars': "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-namespace": "off",
		"@typescript-eslint/ban-types": "off",
	}
};