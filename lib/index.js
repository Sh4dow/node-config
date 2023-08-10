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
            this.options.path = path_1.default.resolve(process.env.PWD ?? require.main.path, this.options.path);
        }
        const config = this.loadFile(this.options.path);
        this.configObject = this.parseConfig(config, this.options.env);
        if (Array.isArray(this.options.envFiles) && this.options.envFiles.length > 0) {
            const regex = new RegExp(`^${this.options.env}`, 'i');
            for (const singleFile of this.options.envFiles) {
                if (path_1.default.basename(singleFile).match(regex) !== null) {
                    const file = path_1.default.resolve(process.env.PWD, singleFile);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxnREFBd0I7QUFHeEIsb0RBQWtDO0FBQ2xDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFFeEIsTUFBcUIsTUFBTyxTQUFRLGdCQUFZO0lBQzVDLE9BQU8sR0FBbUI7UUFDdEIsSUFBSSxFQUFFLEVBQUU7UUFDUixRQUFRLEVBQUUsRUFBRTtRQUNaLFNBQVMsRUFBRSxVQUFVO1FBQ3JCLEdBQUcsRUFBRSxFQUFFO0tBQ1YsQ0FBQztJQUNGLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDVCxTQUFTLEdBQUcsY0FBYyxDQUFDO0lBQ25CLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBVW5ELFlBQVksWUFBOEMsRUFBRSxhQUE4QjtRQUN0RixLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksT0FBTyxHQUFtQixFQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUMsQ0FBQztRQUV0RCxJQUFJLFlBQVksSUFBSSxhQUFhLEVBQUU7WUFDL0IsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO2dCQUN2RSxPQUFPLEdBQUcsYUFBYSxDQUFDO2FBQzNCO1lBQ0QsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO2dCQUN2RSxPQUFPLEdBQUcsYUFBYSxDQUFDO2dCQUN4QixPQUFPLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQzthQUMvQjtTQUNKO2FBQU0sSUFBSSxZQUFZLEVBQUU7WUFDckIsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUU7Z0JBQ2xDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO2FBQy9CO2lCQUFNLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFO2dCQUN6QyxPQUFPLEdBQUcsWUFBeUMsQ0FBQzthQUN2RDtT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