import tseslint from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "dist-types/**", "node_modules/**", "src-tauri/**"],
  },
  ...tseslint.configs["flat/recommended"],
  reactHooks.configs["recommended-latest"],
];
