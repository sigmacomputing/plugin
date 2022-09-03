import { createContext } from 'react';

import { client } from 'client';
import { PluginInstance } from 'types';

export const PluginContext = createContext<PluginInstance>(client);
