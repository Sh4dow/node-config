# node-config
Configuration module for nodejs applications

config.json
```json
{
    "database": {
        "host": "localhost",
        "user": "user"
    },
    "version": "1.2"
}
```

```js
var config = new Config('./config.json');
config.get('database.host'); // 'localhost'
config.get('database'); //  {"host": "localhost", "user": "user"}
config.set('database.host', 'extrenal.host.com'); //emit('change', ['database.host'])
```

config.json
```json
{
    "database": {
        "host": "localhost",
        "user": "user"
    },
    "logLevel": "info"
}
```
stage.json
```json
{
    "logLevel": "debug"
}
```
production.json
```json
{
    "database": {
        "host": "production.com",
        "user": "xo74ffo2blydbow"
    }
}
```

```js
var options =  {
    envFiles: [
        './stage.json',
        './production.json'
    ],
    envSwitch: 'NODE_ENV' //default value
}
var config = new Config('./config.json', options);

// process.env.NODE_ENV == 'stage'
config.get('database.host'); // localhost
config.get('logLevel'); // debug

// process.env.NODE_ENV == 'production'
config.get('database.host'); // production.com
config.get('logLevel'); // info

```

config.json
```json
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
        "env:stage": "debug"
}
```