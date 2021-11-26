const Config = require('../');

let cfg = new Config('./config.json');

console.log(cfg.get());