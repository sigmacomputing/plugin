import type { RcFile as Configuration_t } from 'syncpack';

const config: Configuration_t = {
  versionGroups: [
    {
      label: 'Ignored dependency types',
      dependencyTypes: ['resolutions'],
    },
  ],
};

export default config;
