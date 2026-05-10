import * as React from 'react';

import { client } from '../client';
import { PluginInstance } from '../types';

export const PluginContext = React.createContext<PluginInstance>(client);
