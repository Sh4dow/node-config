module.exports = {
    file: 'js',
    name: 'name',
    db: {
        host: 'url',
        user: 'User'
    },
    service: {
        value: 1,
        'env:test': 2,
        ignore: 'blablabla'
    },
    testArray: [1, 2, 3],
    test2Array: {
        value: [2, 3],
        'env:test': [3, 4]
    }
}