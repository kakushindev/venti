import { common, modules, node, stylistic, ignores, typescript, extend } from "@hazmi35/eslint-config";

export default [...common, ...modules, ...node, ...stylistic, ...ignores, ...typescript, ...extend(typescript, [
    {
        rule: "typescript/strict-boolean-expressions",
        option: ["off"]
    },
    {
        rule: "typescript/no-non-null-assertion",
        option: ["off"]
    },
    {
        rule: "typescript/naming-convention",
        option: [
            "off"
        ]
    }
]), ...extend(common, [
    {
        rule: "id-length",
        option: ["off"]
    },
    {
        rule: "camelcase",
        option: ["off"]
    },
    {
        rule: "require-await",
        option: ["off"]
    }
])];
