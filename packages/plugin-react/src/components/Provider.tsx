import React, { ReactNode } from 'react';

import { PluginInstance } from '@sigmacomputing/plugin';

import { PluginContext } from './context';

export interface SigmaClientProviderProps<T> {
  client: PluginInstance<T>;
  children?: ReactNode;
}

export function SigmaClientProvider<T>(props: SigmaClientProviderProps<T>) {
  return (
    <PluginContext.Provider value={props.client}>
      {props.children}
    </PluginContext.Provider>
  );
}
