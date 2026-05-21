import { CustomPluginConfigOptions } from '../types';

export function validateConfigId(
  configId: string | undefined,
  expectedConfigType: CustomPluginConfigOptions['type'],
) {
  if (configId === undefined) {
    console.warn(`Invalid config ${expectedConfigType}`);
  }
}
