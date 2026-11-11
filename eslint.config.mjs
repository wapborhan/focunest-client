import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  { ignores: [".next/**", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals"),
  { files: ["**/*.{js,jsx,mjs}"], languageOptions: { globals: { ...globals.browser, ...globals.node } }, rules: { "react/no-unescaped-entities": "off", "no-undef": "error", "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] } },
];
export default config;
