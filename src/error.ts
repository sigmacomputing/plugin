import { CustomPluginConfigOptions } from './types';

export function validateConfigId(
  configId: string,
  expectedConfigType: CustomPluginConfigOptions['type'],
) {
  if (configId === undefined) {
    console.warn(`Invalid config ${expectedConfigType}: ${configId}`);
  }
}
