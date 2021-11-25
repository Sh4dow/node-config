const Config = require('./index');
console.log(require('./test/test.json'));
let cfg = new Config('./test/test.json');

console.log(cfg.get('db'));
console.log(cfg.get('service'));
console.log(cfg.get('test2Array'));
console.log(cfg.get('object'));
console.log(cfg.get());