import { client } from 'client';
import { PluginInstance } from 'types';

declare global {
  interface Window {
    sigmaClient: PluginInstance;
  }
}

if (typeof window !== 'undefined') {
  window.sigmaClient = client;
}
