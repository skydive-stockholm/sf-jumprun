module.exports = {
    env: {
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'prettier'],
    rules: {
        'no-console': 'off',
        // override/add rules settings here, such as:
        // 'vue/no-unused-vars': 'error'
    },
}
