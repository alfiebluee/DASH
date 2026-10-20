import eslint from "@eslint/js"
import prettier from "eslint-config-prettier"
import jsxA11y from "eslint-plugin-jsx-a11y"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "playwright-report", "test-results", "blob-report", "coverage"],
  },
  {
    settings: { react: { version: "18.3" } },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: { react: { version: "18.3" } },
    rules: {
      "react/prop-types": "off",
    },
  },
  prettier,
)
