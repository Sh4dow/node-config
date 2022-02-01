const test = require('unit.js')
const path = require('path');
const Config = require('../../');

let cfg = new Config('./test/01_json_file/config.json');

it('Check JSON file config values', () => {
    test.string(cfg.get('name')).is('name');
    test.number(cfg.get('number')).is(10);
    test.array(cfg.get('testArray')).is([1,2,3]);
    test.object(cfg.get('object')).is({a: 1});
});
