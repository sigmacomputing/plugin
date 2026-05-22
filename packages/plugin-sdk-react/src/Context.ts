import * as React from 'react';

import { client, PluginInstance } from '@sigmacomputing/plugin';

export const PluginContext = React.createContext<PluginInstance>(client);
