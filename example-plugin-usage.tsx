import React from 'react';
import {
  useConfig,
  useEditorPanelConfig,
  useElementColumns,
  useElementData,
  usePluginStyle,
} from '@sigmacomputing/plugin';
import type { PluginStyle } from '@sigmacomputing/plugin';

function ExamplePluginApp() {
  // Configure the editor panel - no need to add backgroundColor here
  // as it's automatically handled by the Sigma workbook format panel
  useEditorPanelConfig([
    { type: 'element', name: 'source' },
    {
      type: 'column',
      name: 'measure',
      source: 'source',
      allowMultiple: false,
      allowedTypes: ['number', 'integer'],
    },
  ]);

  // Get plugin configuration
  const config = useConfig();
  const data = useElementData(config.source);
  const info = useElementColumns(config.source);

  // Use the new hook to get style properties including background color
  const { backgroundColor }: PluginStyle = usePluginStyle();

  // Calculate some data
  const columnData = data[config.measure];
  const columnInfo = info[config.measure];
  const sumOfColumn = columnData?.reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        backgroundColor: backgroundColor || 'transparent',
        padding: '20px',
        minHeight: '200px',
        transition: 'background-color 0.3s ease',
      }}
    >
      <header>
        <h2>Plugin with Dynamic Background</h2>
        <p>Background color: {backgroundColor || 'transparent'}</p>
        <p>
          Sum of [{columnInfo?.name}]: {sumOfColumn}
        </p>
        <div style={{ marginTop: '20px' }}>
          <p>
            This plugin's background color can be changed using the format panel
            in Sigma. The background color is automatically applied through the
            usePluginStyle hook.
          </p>
        </div>
      </header>
    </div>
  );
}

export default ExamplePluginApp;
