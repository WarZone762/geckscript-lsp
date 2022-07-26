/**@type {import("eslint").Linter.Config} */
module.exports = {
	"root": true,
	"env": {
		"browser": true,
		"commonjs": true
	},
	"parserOptions": {
		"ecmaVersion": "latest",
		"sourceType": "module"
	},
	"extends": [
		"eslint:recommended"
	],
	"rules": {
		"semi": [
			2,
			"always"
		]
	}
};