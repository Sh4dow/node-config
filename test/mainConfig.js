module.exports = {
    file: 'js',
    name: 'name',
    db: {
        host: 'url',
        user: 'User'
    },
    env: {
        value: 1,
        "env:test": 2
    },
    env2: {
        value: {
            obj: 1
        },
        "env:test": {
            obj2: 2
        }
    }
}