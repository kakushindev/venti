import { common, modules, node, stylistic, ignores, typescript, extend } from "@hazmi35/eslint-config";

export default [...common, ...modules, ...node, ...stylistic, ...ignores, ...typescript, ...extend([
    {
        "rules": {
            "typescript/strict-boolean-expressions": "off"
        }
    }
])];
