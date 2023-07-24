"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yaml_1 = __importDefault(require("yaml"));
const events_1 = __importDefault(require("events"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Config extends events_1.default {
    options = {
        path: '',
        envFiles: [],
        envSwitch: 'NODE_ENV',
        env: '',
    };
    env = '';
    cliPrefix = 'NODE_CONFIG_';
    configObject = {};
    constructor(configTarget, configOptions) {
        super();
        let options = { envSwitch: 'NODE_ENV' };
        if (configTarget && configOptions) {
            if (typeof configTarget === 'object' && typeof configOptions === 'object') {
                options = configOptions;
            }
            if (typeof configTarget === 'string' && typeof configOptions === 'object') {
                options = configOptions;
                options.path = configTarget;
            }
        }
        else if (configTarget) {
            if (typeof configTarget === 'string') {
                options.path = configTarget;
            }
            else if (typeof configTarget === 'object') {
                options = configTarget;
            }
        }
        this.options = Object.assign(this.options, options);
        this.initFiles();
    }
    get(configName = null, defaultValue = null) {
        if (configName === null) {
            return this.configObject;
        }
        const value = this.getValue(this.configObject, configName);
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    }
    set(name, value) {
        this.changeValue(name, value);
    }
    envVariable(arg) {
        const configName = arg.replace(this.cliPrefix, '').replace('_', '.');
        const lowerConfigName = configName.toLowerCase();
        const vars = lowerConfigName.split('.');
        let configReference = this.configObject;
        const configNamePath = [];
        for (let a = 0; a < lowerConfigName.length; a++) {
            for (const index of Object.keys(configReference)) {
                if (index.toLowerCase() === vars[a]) {
                    configNamePath.push(index);
                    configReference = configReference[index];
                    break;
                }
            }
        }
        return configNamePath;
    }
    fixValue(value) {
        let parsedValue = value.trim();
        if (value.match(/^[0-9]+$/)) {
            parsedValue = parseInt(value);
        }
        else if (value.match(/^[0-9]+\.[0-9]+$/)) {
            parsedValue = parseFloat(value);
        }
        else if (value === 'true') {
            parsedValue = true;
        }
        else if (value === 'false') {
            parsedValue = false;
        }
        return parsedValue;
    }
    initFiles() {
        if (process.env[this.options.envSwitch]?.match(/^([a-zA-Z\d_]+)$/g)) {
            this.options.env = process.env[this.options.envSwitch];
        }
        if (!this.options.path?.startsWith('/')) {
            this.options.path = path_1.default.resolve(require.main.path, this.options.path);
        }
        const config = this.loadFile(this.options.path);
        this.configObject = this.parseConfig(config, this.options.env);
        if (Array.isArray(this.options.envFiles) && this.options.envFiles.length > 0) {
            const regex = new RegExp(`^${this.options.env}`, 'i');
            for (const singleFile of this.options.envFiles) {
                if (path_1.default.basename(singleFile).match(regex) !== null) {
                    const file = path_1.default.resolve(require.main.path, singleFile);
                    const config = this.loadFile(file);
                    this.configObject = this.merge(this.configObject, config);
                }
            }
        }
        this.readEnv();
        this.readCli();
    }
    merge(target, source) {
        const test = Object.keys(source).filter((value) => {
            return typeof source[value] === 'object' && !Array.isArray(source[value]);
        });
        if (test.length > 0) {
            for (const index of test) {
                const config = this.merge(target[index], source[index]);
                target[index] = { ...target[index], ...config };
            }
            return target;
        }
        return { ...target, ...source };
    }
    getValue(object, configName) {
        const arr = configName.split('.');
        const index = arr.shift();
        if (object[index] === undefined) {
            return undefined;
        }
        if (arr.length > 0) {
            return this.getValue(object[index], arr.join('.'));
        }
        return object[index];
    }
    objectEnvTest(obj) {
        return Object.keys(obj).findIndex((value) => value.startsWith('env:')) !== -1;
    }
    objectEnvValue = (obj, env) => {
        if (obj[`env:${env}`] !== undefined) {
            return obj[`env:${env}`];
        }
        return obj?.value;
    };
    parseConfig(object, env) {
        const returnObject = {};
        if (object === undefined) {
            return returnObject;
        }
        for (const index of Object.keys(object)) {
            switch (typeof object[index]) {
                case 'object':
                    if (Array.isArray(object[index]) || object[index] === null) {
                        returnObject[index] = object[index];
                    }
                    else {
                        if (this.objectEnvTest(object[index])) {
                            returnObject[index] = this.objectEnvValue(object[index], env);
                        }
                        else {
                            returnObject[index] = this.parseConfig(object[index], env);
                        }
                    }
                    break;
                case 'function':
                    returnObject[index] = object[index](env);
                    break;
                default:
                    returnObject[index] = object[index];
                    break;
            }
        }
        return returnObject;
    }
    changeValue(name, value, config = this.configObject) {
        if (name.match(/\./)) {
            const indexArray = name.split('.');
            const index = indexArray.shift();
            if (config[index] === undefined) {
                config[index] = {};
            }
            if (typeof config[index] === 'object') {
                this.changeValue(indexArray.join('.'), value, config[index]);
            }
            else if (indexArray.length > 0) {
                console.error('You try to scalar value with object', indexArray);
            }
        }
        else {
            config[name] = value;
        }
    }
    loadFile(file) {
        if (!fs_1.default.existsSync(file)) {
            console.error(`File missing: ${file}`);
            return {};
        }
        switch (path_1.default.parse(file).ext) {
            case '.json':
                try {
                    return JSON.parse(fs_1.default.readFileSync(file).toString());
                }
                catch (exception) {
                    console.error(exception);
                    return {};
                }
            case '.js':
                return require(file);
            case '.yaml':
            case '.yml':
                return yaml_1.default.parse(fs_1.default.readFileSync(file).toString());
            default:
                return {};
        }
    }
    readCli() {
        const flag = '--config.';
        for (const arg of process.argv) {
            if (arg.startsWith(flag)) {
                let [configName, value] = arg.replace(flag, '').split('=');
                configName = configName.trim();
                value = this.fixValue(value);
                this.changeValue(configName, value);
            }
        }
    }
    readEnv() {
        for (const arg of Object.keys(process.env)) {
            if (arg.startsWith(this.cliPrefix)) {
                const configNamePath = this.envVariable(arg);
                if (configNamePath.length > 0) {
                    const value = this.fixValue(process.env[arg]);
                    this.changeValue(configNamePath.join('.'), value);
                }
            }
        }
    }
}
exports.default = Config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxnREFBd0I7QUFHeEIsb0RBQWtDO0FBQ2xDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFFeEIsTUFBcUIsTUFBTyxTQUFRLGdCQUFZO0lBQzlDLE9BQU8sR0FBbUI7UUFDeEIsSUFBSSxFQUFFLEVBQUU7UUFDUixRQUFRLEVBQUUsRUFBRTtRQUNaLFNBQVMsRUFBRSxVQUFVO1FBQ3JCLEdBQUcsRUFBRSxFQUFFO0tBQ1IsQ0FBQztJQUNGLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDVCxTQUFTLEdBQUcsY0FBYyxDQUFDO0lBQ25CLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBVW5ELFlBQVksWUFBOEMsRUFBRSxhQUE4QjtRQUN4RixLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksT0FBTyxHQUFtQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQztRQUV4RCxJQUFJLFlBQVksSUFBSSxhQUFhLEVBQUU7WUFDakMsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO2dCQUN6RSxPQUFPLEdBQUcsYUFBYSxDQUFDO2FBQ3pCO1lBQ0QsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO2dCQUN6RSxPQUFPLEdBQUcsYUFBYSxDQUFDO2dCQUN4QixPQUFPLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQzthQUM3QjtTQUNGO2FBQU0sSUFBSSxZQUFZLEVBQUU7WUFDdkIsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUU7Z0JBQ3BDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO2FBQzdCO2lCQUFNLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFO2dCQUMzQyxPQUFPLEdBQUcsWUFBeUMsQ0FBQzthQUNyRDtT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