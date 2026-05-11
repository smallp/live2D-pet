import { systemDef, systemFunc } from "./system";
import { webDef, webFunc } from "./web";

export const toolDefinitions = [
    ...systemDef,
    ...webDef
];

export const toolImplementations: Record<string, Function> = {
    ...systemFunc,
    ...webFunc
};
