module.exports = {
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    'google',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  rules: {
    'max-len': 'off',
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
  },
};
