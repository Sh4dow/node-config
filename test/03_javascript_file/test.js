const test = require('unit.js')
const Config = require('../../');

let cfg = new Config('./test/03_javascript_file/config.js');

it('Check Javasctip file config values', () => {
    test.string(cfg.get('name')).is('name');
    test.number(cfg.get('number')).is(10);
    test.array(cfg.get('testArray')).is([1,2,3]);
    test.object(cfg.get('object')).is({a: 1});
});