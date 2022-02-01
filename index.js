const EventEmmiter = require('events');
const { cwd } = require('process');
const fs = require('fs');
const path = require('path');

class Config extends EventEmmiter
{

    #configObject = {};

    options = {
        path: '',
        envFiles: [],
        envSwitch: 'NODE_ENV',
        env: ''
    }

    /**
     * enviroment name
     * @type {String}
     */
    env = '';

    constructor(...arg) {
        super();

        let options = {};
        let config;

        if (arg.length == 2) {
            if (typeof arg[0] == 'object' && typeof arg[1] == 'object') {
                // config + options
                // config = arg[0];
                [config, options] = arg;
            }
            if (typeof arg[0] == 'string' && typeof arg[1] == 'object') {
                // path + options
                [path, options] = arg;
                options.path = path;
            }

        } else if (arg.length == 1) {
            if (typeof arg[0] === 'string') {
                options.path = arg[0];
            } else if(typeof arg[0] == 'object') {
                options = arg[0];
            }
        }

        this.options = Object.assign(this.options, options);

        if (process.env[this.options.envSwitch] != undefined
            && process.env[this.options.envSwitch].match(/^([a-zA-Z\d_]+)$/g)
        ) {
            this.options.env = process.env[this.options.envSwitch];
        }

        config = this.#loadFile(this.options.path);

        this.#configObject = this.#parseConfig(config, this.options.env);

        this.#readEnv();
        this.#readCli();

    }

    /**
     * return config node value
     * @param {String|null} configName variable name
     * @returns {Object|String|Number|Boolean}
     */
    get(configName = null) {
        if (configName === null) {
            return this.#configObject;
        }
        return this.#getValue(this.#configObject, configName);
    }

    #getValue(object, configName) {
        let arr = configName.split('.');
        let index = arr.shift();
        if (object[index] === undefined) {
            return undefined;
        }
        if (arr.length > 0) {
            return this.#getValue(object[index], arr.join('.'));
        } else {
            return object[index];
        }
    }

    #objectEnvTest(obj) {
        return Object.keys(obj).findIndex(value => value.startsWith('env:')) != -1
    }

    #objectEnvValue = (obj, env) => {
        if (obj['env:'+env] !== undefined) {
            return obj['env:'+env];
        }
        return obj?.value;
    }

    #parseConfig(object, env) {
        let returnObject = {};
        if (object === undefined) {
            return returnObject;
        }
        for(let index of Object.keys(object)) {
            switch(typeof object[index]) {
                case 'object':
                    if (Array.isArray(object[index])) {
                        returnObject[index] = object[index];
                    } else {
                        if (this.#objectEnvTest(object[index])) {
                            returnObject[index] = this.#objectEnvValue(object[index], env);
                        } else {
                            returnObject[index] = this.#parseConfig(object[index], env);
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

    /**
     *
     * @param {String} name variable name
     * @param {Object|String|Number|Boolean} value value of config node
     */
    set(name, value) {
        this.emit('change', diff);
        this.#changeValue(name, value);
    }

    #changeValue(name, value, config) {

        if (name.match(/\./)) {
            let indexArray = name.split('.');
            let index = indexArray.shift();
            if (config[index] == undefined) {
                config[index] = {};
            }

            if (typeof config[index] == 'object') {
                this.#changeValue(indexArray.join('.'), value, config[index]);
            } else if(indexArray.length > 0) {
                console.error('You try to scalar value with object', indexArray);
            }
        } else {
            config[name] = value;
        }
    }

    #loadFile(file) {

        file = path.join(cwd(), file);
        if (!fs.existsSync(file)) {
            return console.error(`File missing: ${file}`);
        }

        switch(path.parse(file).ext) {
            case '.json':
                let str = fs.readFileSync(file);
                try {
                    return JSON.parse(str);
                } catch(exception) {
                    console.error(exception);
                    return {};
                }
            case '.js':
                return require(file);

            case '.yaml':
            case '.yml':
                const YAML = require('yaml');

                return YAML.parse(
                    fs.readFileSync(file)
                        .toString()
                );
        }
    }

    #readCli() {
        let flag = '--config.';
        for (let arg of process.argv) {
            if (arg.startsWith(flag)) {
                let [configName, value] = arg.replace(flag, '').split('=');
                configName = configName.trim();
                value = value.trim();
                if (value === 'true') {
                    value = true;
                }
                if (value === 'false') {
                    value = false;
                }
                this.#changeValue(configName, value, this.#configObject);
            }
        }
    }
    #readEnv() {
        let flag = 'NODE_CONFIG_';
        for (let arg of Object.keys(process.env)) {
            if (arg.startsWith(flag)) {
                let configName = arg.replace(flag, '').replace('_', '.');
                let value = process.env[arg];

                configName = configName.trim();
                value = value.trim();
                if (value === 'true') {
                    value = true;
                }
                if (value === 'false') {
                    value = false;
                }
                this.#changeValue(configName, value, this.#configObject);
            }
        }
    }
}

module.exports = Config;
