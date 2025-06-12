# FlowFuse Node-RED Assistant

A Node-RED plugin to assist FlowFuse users.


**This plugin can only be used within FlowFuse-managed Node-RED instances.**

FlowFuse is the Industrial application platform for building and operating custom industrial solutions that digitalize processes and operations. It integrates seamlessly into both IT and OT environments, leveraging Node-RED to enable teams to connect, collect, transform, and visualize data from industrial systems. Companies use FlowFuse to manage, scale, and secure their Node-RED-based applications across industrial environments.

Sign-up to FlowFuse Cloud now to get started: https://app.flowfuse.com

## About

This plugin is designed to assist users of the FlowFuse platform by providing tools to aid development of their Node-RED instances including:
* A function builder
* Function node Code Lens
* JSON generation in all typed inputs and JSON editors (like the inject node, change node, template node, etc)
* Flows Explainer

### Function Builder
![flowfuse-assistant-function builder](https://github.com/user-attachments/assets/5efc4c24-a4e6-4d0c-b836-aebf97d3ca02)


### JSON generator
![flowfuse-assistant-json-generator](https://github.com/user-attachments/assets/d3271f64-a733-48dd-924b-0a946b9a6e7f)


### Flows Explainer
![flowfuse-assistant-flow-explainer](https://github.com/user-attachments/assets/3a8c17bb-066b-4264-9ad1-3a031bd2afee)


## Installation

```bash
npm install @flowfuse/nr-assistant
```

## Development

Client-side portion of the plugin is in `index.html`. The server side code is in `index.js`


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

### Function Builder
* Only a single function node can be generated at a time.

### Function Node Editor Codelens
* The codelens feature is only supported for the on-message editor in the function node.

## Versioning

While in development, the version number of this package will remain at `0.x.y`.
`x` will be incremented for breaking changes, `y` for new features and patches.

Once plugin and API are stable, the version number will be updated to 1.0.0 and full SemVer rules will be applied.

## License

Apache-2.0
