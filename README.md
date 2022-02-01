# node-config
Configuration module for nodejs applications. Supports json, js and yaml format files

## Simple use

```json
// config.json
{
    "database": {
        "host": "localhost",
        "user": "user"
    },
    "version": "1.2"
}
```


```js
// index.js
var config = new Config('./config.json');
config.get('database.host'); // 'localhost'
config.get('database'); //  {"host": "localhost", "user": "user"}
config.set('database.host', 'extrenal.host.com'); //emit change event if You need to reload something
```

## Platform configs
Default trigger to recognize platform is enviroment variable `NODE_ENV`. NODE_ENV can be changed using option `envSwitch` or manualy set platform name using option `env`.

```json
// config.json
{
    "database": {
        "host": "localhost",
        "user": "user"
    },
    "logLevel": "info"
}
```

```javascript
// stage.js
module.exports = {
    logLevel: "debug"
}
```

require module `YAML@2`
```yaml
# production.yml
database:
  host: production.com
  user: xo74ffo2blydbow
```

```js
// index.js
var options =  {
    path: './config.json', // main config
    envFiles: [
        './stage.json',
        './production.json'
    ],
    envSwitch: 'NODE_ENV' //default value
}
var config = new Config(, options);

// process.env.NODE_ENV == 'stage'
config.get('database.host'); // localhost
config.get('logLevel'); // debug

// process.env.NODE_ENV == 'production'
config.get('database.host'); // production.com
config.get('logLevel'); // info

```

## Single config with platform changes
Replacing value with object You can change single value.
```json
{
    "index": {
        "value": "default", // default value for all platforms
        "env:plaftormName": "diffrent",
        "env:plaftormName2": "diffrent",
    }
}
```
Example:
```json
// config.json
{
    "database": {
        "value": {
            "host": "localhost",
            "user": "user"
        },
        "env:production": {
            "host": "production.com",
            "user": "xo74ffo2blydbow"
        }
    },
    "logLevel": {
        "value": "info",
        "env:production": "warning",
        "env:stage": "debug"
}
```

### Cli support
You can use cli arguments (```--config.```) or enviroment variables (```NODE_CONFIG_```) to change config value
```
$ node index.js --config.loglevel=info --config.database.host=test.host.com --config.new.index=true

{
    "database": {
        "host": "test.host.com",
        "user": "user"
    },
    "logLevel": "info",
    "new": {
        "index": true
    }
}
```

Enviroment variable has disadvantage. Config can't have underscore "`_`"
```
$ NODE_CONFIG_logLevel=warning NODE_CONFIG_database_host=example.com node index.js

{
    "database": {
        "host": "example.com",
        "user": "user"
    },
    "logLevel": "warning"
}
```