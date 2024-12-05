import { it } from 'mocha';
import test from 'unit.js';
import Config from '../../src';

const cfg = new Config(`${__dirname}/config.js`);

it('Check Javasctip file config values', () => {
  test.string(cfg.get('name')).is('name');
  test.number(cfg.get('number')).is(10);
  test.array(cfg.get('testArray')).is([1, 2, 3]);
  test.object(cfg.get('object')).is({ a: 1 });
});
