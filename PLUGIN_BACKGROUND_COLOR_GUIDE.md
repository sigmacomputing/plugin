# Plugin Background Color Communication Guide

This guide explains how to implement background color communication between Sigma plugins and the Sigma workbook application.

## Overview

The background color communication mechanism allows users to change a plugin's background color through Sigma's format panel, and the plugin automatically receives and applies these changes.

## Implementation

### 1. Plugin SDK Side (Already Implemented)

#### New Hook: `usePluginStyle`

A new React hook has been added to the plugin SDK that provides access to style properties including background color:

```typescript
/**
 * React hook for accessing plugin style properties like background color
 * @returns {object} Style properties including backgroundColor
 */
export function usePluginStyle(): { backgroundColor?: string }
```

#### Usage in Plugin

```typescript
import { usePluginStyle } from "@sigmacomputing/plugin";

function MyPlugin() {
  const { backgroundColor } = usePluginStyle();
  
  return (
    <div style={{ backgroundColor: backgroundColor || 'transparent' }}>
      {/* Your plugin content */}
    </div>
  );
}
```

### 2. Sigma Workbook Side (Already Implemented)

The Sigma workbook already has the infrastructure in place:

- **PluginElementFormatPanel.tsx**: Provides a background color picker in the format panel
- **ElementBackgroundPicker**: UI component for selecting background colors
- **updatePluginConfig**: Function that updates the plugin configuration with the selected background color

When a user selects a background color in the format panel, it automatically updates the plugin's config with the `backgroundColor` property.

## How It Works

1. **User Interaction**: User opens the format panel for a plugin element in Sigma
2. **Color Selection**: User selects a background color using the ElementBackgroundPicker
3. **Config Update**: The selected color is saved to the plugin's config as `backgroundColor`
4. **Plugin Update**: The `usePluginStyle` hook automatically detects the config change and returns the new background color
5. **Visual Update**: The plugin applies the new background color to its UI

## Key Features

- **Reactive**: Automatically updates when background color changes in Sigma
- **Type-safe**: Provides proper TypeScript types for style properties
- **Developer-friendly**: Plugin developers don't need to manually subscribe to config changes
- **Consistent**: Follows existing plugin API patterns like `useConfig`, `useElementData`, etc.
- **Future-proof**: Easy to extend with more style properties later

## Example Implementation

See `example-plugin-usage.tsx` for a complete example of how to use the new hook in a plugin.

## Benefits

1. **Seamless Integration**: No additional configuration needed - works with existing Sigma format panels
2. **Consistent UX**: Users can style plugins the same way they style other Sigma elements
3. **Easy Development**: Simple hook-based API for plugin developers
4. **Automatic Updates**: Real-time background color changes without page refresh
