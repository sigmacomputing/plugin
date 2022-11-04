import type { ReactNode } from 'react';

import { PluginContext } from './Context';
import { PluginInstance } from '../types';

export interface SigmaClientProviderProps<T = any> {
  client: PluginInstance<T>;
  children?: ReactNode;
}

export function SigmaClientProvider<T = any>(
  props: SigmaClientProviderProps<T>,
) {
  return (
    <PluginContext.Provider value={props.client}>
      {props.children}
    </PluginContext.Provider>
  );
}
