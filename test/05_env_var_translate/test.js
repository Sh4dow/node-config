const test = require('unit.js')
const path = require('path');
const Config = require('../../');

let cfg = new Config(__dirname + '/config.json');

it('Translate UPPER_CASE_SNAKE to config variables', () => {

    test.array(cfg.envVariable('NODE_CONFIG_MISSING')).is([]);
    test.array(cfg.envVariable('NODE_CONFIG_camelCase')).is(['camelCase']);
    test.array(cfg.envVariable('NODE_CONFIG_CAMELCASE')).is(['camelCase']);
    test.array(cfg.envVariable('NODE_CONFIG_NESTED_VAR')).is(['nested', 'var']);
});