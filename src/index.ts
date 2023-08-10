import YAML from 'yaml';

import type {IConfigOptions} from './types';
import EventEmmiter from 'events';
import fs from 'fs';
import path from 'path';

export default class Config extends EventEmmiter {
    options: IConfigOptions = {
        path: '',
        envFiles: [],
        envSwitch: 'NODE_ENV',
        env: '',
    };
    env = '';
    cliPrefix = 'NODE_CONFIG_';
    private configObject: Record<string, unknown> = {};

    /**
     * Generate new config handler
     *
     * @param {String | Record<string, unknown>} configTarget Config's location or full config
     * @param {IConfigOptions} configOptions Configs Options
     *
     * returns (Config) config handler
     */
    constructor(configTarget: string | Record<string, unknown>, configOptions?: IConfigOptions) {
        super();

        let options: IConfigOptions = {envSwitch: 'NODE_ENV'};

        if (configTarget && configOptions) {
            if (typeof configTarget === 'object' && typeof configOptions === 'object') {
                options = configOptions;
            }
            if (typeof configTarget === 'string' && typeof configOptions === 'object') {
                options = configOptions;
                options.path = configTarget;
            }
        } else if (configTarget) {
            if (typeof configTarget === 'string') {
                options.path = configTarget;
            } else if (typeof configTarget === 'object') {
                options = configTarget as unknown as IConfigOptions;
            }
        }

        this.options = Object.assign(this.options, options);
        this.initFiles();
    }

    /**
     * Return config node value
     *
     * @param {String|null} configName variable name
     * @param {String|null} defaultValue Predefined value, returned in case that target value does not exist
     *
     * @returns {Object|String|Number|Boolean}
     */
    get(configName: string | null = null, defaultValue = null): unknown {
        if (configName === null) {
            return this.configObject;
        }
        const value = this.getValue(this.configObject, configName);
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    }

    /**
     * Set param value
     *
     * @param {String} name variable name
     * @param {Object|String|Number|Boolean} value value of config node
     *
     * @returns {void}
     *
     */
    set(name: string, value: unknown): void {
        this.changeValue(name, value);
    }

    /**
     * Find path to config node
     *
     * @param {string} arg environment variable name
     *
     * @returns {Array <String>} path of config node
     */
    envVariable(arg: string): string[] {
        const configName = arg.replace(this.cliPrefix, '').replace('_', '.');
        const lowerConfigName = configName.toLowerCase(); // lower name
        const vars = lowerConfigName.split('.'); // array of config name for iteration and fing config node

        let configReference = this.configObject; // reference to config object
        const configNamePath: string[] = [];

        for (let a = 0; a < lowerConfigName.length; a++) {
            for (const index of Object.keys(configReference)) {
                if (index.toLowerCase() === vars[a]) {
                    // found matching index
                    configNamePath.push(index);
                    configReference = configReference[index] as Record<string, unknown>;
                    break;
                }
            }
        }

        return configNamePath;
    }

    /**
     * Cast value to type
     *
     * @param {string} value value of config node
     *
     * @returns {string|number|boolean} casted value
     */
    fixValue(value: string): string | number | boolean {
        let parsedValue: string | number | boolean = value.trim();

        if (value.match(/^[0-9]+$/)) {
            parsedValue = parseInt(value);
        } else if (value.match(/^[0-9]+\.[0-9]+$/)) {
            parsedValue = parseFloat(value);
        } else if (value === 'true') {
            parsedValue = true;
        } else if (value === 'false') {
            parsedValue = false;
        }
        return parsedValue;
    }

    /**
     * Initialize config files
     *
     * returns (void)
     */
    private initFiles(): void {
        if (process.env[this.options.envSwitch]?.match(/^([a-zA-Z\d_]+)$/g)) {
            this.options.env = process.env[this.options.envSwitch];
        }

        if (!this.options.path?.startsWith('/')) {
            this.options.path = path.resolve(process.env.PWD ?? require.main!.path, this.options.path!);
        }

        const config = this.loadFile(this.options.path);
        this.configObject = this.parseConfig(config, this.options.env!);

        if (Array.isArray(this.options.envFiles) && this.options.envFiles.length > 0) {
            const regex = new RegExp(`^${this.options.env!}`, 'i');
            // load second config
            for (const singleFile of this.options.envFiles) {
                if (path.basename(singleFile).match(regex) !== null) {
                    const file = path.resolve(process.env.PWD!, singleFile);
                    const config = this.loadFile(file);
                    this.configObject = this.merge(this.configObject, config);
                }
            }
        }

        this.readEnv();
        this.readCli();
    }

    /**
     * Merge 2 objects together
     *
     * @param {Record<string, unknown>} target target object
     * @param {Record<string, unknown>} source source object
     *
     * @returns {Record<string, unknown>} Merged object
     */
    private merge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
        const test = Object.keys(source).filter((value) => {
            return typeof source[value] === 'object' && !Array.isArray(source[value]);
        });

        if (test.length > 0) {
            for (const index of test) {
                const config = this.merge(target[index] as Record<string, unknown>, source[index] as Record<string, unknown>);
                target[index] = {...(target[index] as Record<string, unknown>), ...config};
            }
            return target;
        }
        return {...target, ...source};
    }

    /**
     * Get value out of object
     *
     * @param {Record<string, unknown>} object target object
     * @param {string} configName Config name
     *
     * @returns {unknown} Value from object
     */
    private getValue(object: Record<string, unknown>, configName: string): unknown {
        const arr = configName.split('.');
        const index = arr.shift()!;
        if (object[index] === undefined) {
            return undefined;
        }
        if (arr.length > 0) {
            return this.getValue(object[index] as Record<string, unknown>, arr.join('.'));
        }
        return object[index];
    }

    /**
     * Tests, whenever object has prefix of env
     *
     * @param {Record<string, unknown>} obj target object
     *
     * @returns {boolean}
     */
    private objectEnvTest(obj: Record<string, unknown>): boolean {
        return Object.keys(obj).findIndex((value) => value.startsWith('env:')) !== -1;
    }

    /**
     * Return env value from object
     *
     * @param {Record<string, unknown>} obj target object
     * @param {string} env Env to access
     *
     * @returns {unknown}
     */
    private objectEnvValue = (obj: Record<string, unknown>, env: string): unknown => {
        if (obj[`env:${env}`] !== undefined) {
            return obj[`env:${env}`];
        }
        return obj?.value;
    };

    /**
     * Parse config
     *
     * @param {Record<string, unknown>} object target object
     * @param {string} env Env to access
     *
     * @returns {unknown}
     */
    private parseConfig(object: Record<string, unknown>, env: string): Record<string, unknown> {
        const returnObject: Record<string, unknown> = {};
        if (object === undefined) {
            return returnObject;
        }
        for (const index of Object.keys(object)) {
            switch (typeof object[index]) {
                case 'object':
                    if (Array.isArray(object[index]) || object[index] === null) {
                        returnObject[index] = object[index];
                    } else {
                        if (this.objectEnvTest(object[index] as Record<string, unknown>)) {
                            returnObject[index] = this.objectEnvValue(object[index] as Record<string, unknown>, env);
                        } else {
                            returnObject[index] = this.parseConfig(object[index] as Record<string, unknown>, env);
                        }
                    }
                    break;

                case 'function':
                    returnObject[index] = (object[index] as (env: string) => unknown)(env);
                    break;

                default:
                    returnObject[index] = object[index];
                    break;
            }
        }
        return returnObject;
    }

    /**
     * Change value for element
     *
     * @param {string} name Element's name
     * @param {unknown} value Element's new value
     * @param {config} config Config object with parameters to modify specific values
     *
     * @returns {void}
     */
    private changeValue(name: string, value: unknown, config: Record<string, unknown> = this.configObject): void {
        if (name.match(/\./)) {
            const indexArray = name.split('.');
            const index = indexArray.shift()!;
            if (config[index] === undefined) {
                config[index] = {};
            }

            if (typeof config[index] === 'object') {
                this.changeValue(indexArray.join('.'), value, config[index] as Record<string, unknown>);
            } else if (indexArray.length > 0) {
                console.error('You try to scalar value with object', indexArray);
            }
        } else {
            config[name] = value;
        }
    }

    /**
     * Load selected file
     *
     * @param {string} file File to load
     *
     * @returns {unknown} Loaded file
     */
    private loadFile(file: string): Record<string, unknown> {
        if (!fs.existsSync(file)) {
            console.error(`File missing: ${file}`);
            return {};
        }

        switch (path.parse(file).ext) {
            case '.json':
                try {
                    return JSON.parse(fs.readFileSync(file).toString()) as Record<string, unknown>;
                } catch (exception) {
                    console.error(exception);
                    return {};
                }
            case '.js':
                return require(file) as unknown as Record<string, unknown>;

            case '.yaml':
            case '.yml':
                return YAML.parse(fs.readFileSync(file).toString()) as Record<string, unknown>;
            default:
                return {};
        }
    }

    /**
     * Change config's value, based on cli params
     *
     * @returns {void}
     */
    private readCli(): void {
        const flag = '--config.';
        for (const arg of process.argv) {
            if (arg.startsWith(flag)) {
                let [configName, value] = arg.replace(flag, '').split('=');
                configName = configName!.trim();

                value = this.fixValue(value!) as string;

                this.changeValue(configName, value);
            }
        }
    }

    /**
     * Change config value, based on process.env
     *
     * @returns {void}
     */
    private readEnv(): void {
        for (const arg of Object.keys(process.env)) {
            if (arg.startsWith(this.cliPrefix)) {
                const configNamePath = this.envVariable(arg);

                if (configNamePath.length > 0) {
                    const value = this.fixValue(process.env[arg]!);
                    this.changeValue(configNamePath.join('.'), value);
                }
            }
        }
    }
}
