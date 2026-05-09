import { systemDef, systemFunc } from "./system";
import { webDef, webFunc } from "./web";
import { skillDef, skillFunc } from "./skill";

export const toolDefinitions = [
    ...skillDef,
    ...systemDef,
    ...webDef
];

export const toolImplementations: Record<string, Function> = {
    ...skillFunc,
    ...systemFunc,
    ...webFunc
};
