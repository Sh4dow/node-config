/// <reference types="node" />
import type { IConfigOptions } from './types';
import EventEmmiter from 'events';
export default class Config extends EventEmmiter {
    options: IConfigOptions;
    env: string;
    cliPrefix: string;
    private configObject;
    constructor(configTarget: string | Record<string, unknown>, configOptions?: IConfigOptions);
    get(configName?: string | null, defaultValue?: null): unknown;
    set(name: string, value: unknown): void;
    envVariable(arg: string): string[];
    fixValue(value: string): string | number | boolean;
    private initFiles;
    private merge;
    private getValue;
    private objectEnvTest;
    private objectEnvValue;
    private parseConfig;
    private changeValue;
    private loadFile;
    private readCli;
    private readEnv;
}
