import * as React from 'react';

import { PluginInstance } from '../types';

import { PluginContext } from './Context';

export interface SigmaClientProviderProps<T = any> {
  client: PluginInstance<T>;
  children?: React.ReactNode;
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
