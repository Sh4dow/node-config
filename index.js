const EventEmmiter = require('events');

class Config extends EventEmmiter
{

    #configObject = {};

    options = {
        path: './config.json',
        envFiles: [],
        envSwitch: 'NODE_ENV'
    }

    /**
     * enviroment name
     * @type {String}
     */
    env = '';

    constructor(...arg) {
        super();

        let options = {};
        if (arg.length == 2) {
            let [path, options] = arg;
            options.path = path;
        } else if (arg.length == 1) {
            if (typeof arg[0] === 'string') {
                options.path = arg[0];
            } else if(typeof arg[0] == 'object') {
                options = arg[0];
            }
        }

        this.options = Object.assign(this.options, options);

        // console.log(this.options);


        if (process.env[this.options.envSwitch] != undefined
            && process.env[this.options.envSwitch].match(/^([a-zA-Z\d_]+)$/g)
        ) {
            this.env = process.env[this.options.envSwitch];
        }

        let config = this.#loadFile(this.options.path);
        // console.log(config);

        this.#configObject = this.#parseConfig(config, this.env);

        // this.#readEnv();
        // this.#readCli();

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
            return get(object[index], arr.join('.'));
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
        for(let index of Object.keys(object)) {
            switch(typeof object[index]) {
                case 'object':
                    if (this.#objectEnvTest(object[index])) {
                        returnObject[index] = this.#objectEnvValue(object[index], env);
                    } else {
                        returnObject[index] = this.#parseConfig(object[index], env);
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
    }

    #loadFile(file) {
        let path = require('path');
        console.log(path.parse(file).ext, file);
        switch(path.parse(file).ext) {
            case '.json':
            case '.js':
                return require(file);

            case '.yaml':
            case '.yml':
                const YAML = require('yaml');
                const fs = require('fs');
                return YAML.parse(
                    fs.readFileSync('./test/test.yml')
                        .toString()
                );
        }
    }

    #readCli() {
        for (let arg of process.argv) {
            if (arg.startsWith('--config.')) {
                console.log(arg);
            }
        }
    }
    #readEnv() {

        for (let arg of Object.keys(process.env)) {
            if (arg.startsWith('NODE_CONFIG_')) {
                console.log(process.env[arg]);
            }
        }
    }
}

module.exports = Config;