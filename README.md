# FlowFuse Node-RED Assistant

A Node-RED plugin to assist FlowFuse users.

This plugin can only be used within FlowFuse-managed Node-RED instances.

## Installation

```bash
npm install @flowfuse/nr-assistant
```

## Development

Client-side portion of the plugin is in `index.html`. The server side code is in `index.js`

## About

This plugin is designed to assist users of the FlowFuse platform by providing tools to aid development of their Node-RED project.

The capabilities it adds to Node-RED can be found in Node-RED editor on the main toolbar and within the function node editor.

## NOTES:

* Requires the settings.js file to contain the following:

```json
{
    "flowforge": {
        "assistant": {
            "enabled": true,
            "url": "https://", // URL of the AI service
            "token": "", // API token for the AI service
            "requestTimeout": 60000 // Timeout value for the AI service request
        }
    }
}
```

These values are automatically set when running within the FlowFuse platform via the `nr-launcher` component.

The `url` and `token` are for an AI service hosted by FlowFuse; it is not publicly available for use outside of the FlowFuse platform.


## Limitations

* Only function node generation is currently supported.
* Only a single function node can be generated at a time.
* The codelens feature is only supported for the on-message editor.

## Versioning

While in development, the version number of this package will remain at `0.x.y`.
`x` will be incremented for breaking changes, `y` for new features and patches.

Once plugin and API are stable, the version number will be updated to 1.0.0 and full SemVer rules will be applied.

## License

Apache-2.0
