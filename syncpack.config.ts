import type { RcFile as Configuration_t } from 'syncpack';

const config: Configuration_t = {
  versionGroups: [
    {
      label: 'Ignored dependency types',
      dependencyTypes: ['resolutions'],
    },
    {
      label: 'React peer',
      dependencies: ['react', 'react-dom'],
      dependencyTypes: ['peer'],
      packages: ['@sigmacomputing/plugin'],
    },
  ],
};

export default config;
