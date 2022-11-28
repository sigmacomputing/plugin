require('ts-node').register({
  esm: true,
  compilerOptions: {
    module: 'CommonJS',
    esModuleInterop: true,
  },
});

module.exports = require('./rollup.config.ts');
