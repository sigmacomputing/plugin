import { createContext } from 'react';

import { client, PluginInstance } from '@sigmacomputing/plugin';

export const PluginContext = createContext<PluginInstance>(client);
