import type { Configuration } from 'lint-staged';

const config: Configuration = {
  '*': () => ['oxlint', 'oxfmt'],
};

export default config;
