# FlowFuse Node-RED Expert Plugin

A plugin to bring AI assistance to your Node-RED flow building.

This plugin is preinstalled in Node-RED instances hosted and managed by the FlowFuse platform.

It can also be installed locally for use outside of FlowFuse - but does require a FlowFuse Cloud user account.

FlowFuse is the Industrial application platform for building and operating custom industrial solutions that digitalize processes and operations. It integrates seamlessly into both IT and OT environments, leveraging Node-RED to enable teams to connect, collect, transform, and visualize data from industrial systems. Companies use FlowFuse to manage, scale, and secure their Node-RED-based applications across industrial environments.

Sign-up to FlowFuse Cloud now to get started: https://app.flowfuse.com

## About

This plugin is designed to assist users of the FlowFuse platform by providing tools to aid development of their Node-RED instances including:
* A function builder
* Function node Code Lens
* JSON generation in all typed inputs and JSON editors (like the inject node, change node, template node, etc)
* Flows Explainer
* HTML, VUE, and CSS generation in FlowFuse Dashboard ui-template nodes
* Context-aware inline and multi-line code completions for functions, templates, and tables

### Function Builder
![flowfuse-assistant-assistant-builder](https://github.com/user-attachments/assets/6520eeaf-83f5-466e-ad32-6b4ae1d62954)

### JSON generator
![flowfuse-assistant-json-generator](https://github.com/user-attachments/assets/9d4bf3ef-7ea8-4e72-9e04-73712d5323e3)

### Flows Explainer
![flowfuse-assistant-flow-explainer](https://github.com/user-attachments/assets/6b631048-392b-4028-be8c-bc50f1398a17)

### FlowFuse Dashboard UI Template Assistant
![flowfuse-assistant-ui-template](https://github.com/user-attachments/assets/c6810553-40c0-429e-aa6b-039317b1dc30)

### FlowFuse Dashboard UI CSS Assistant
![flowfuse-assistant-css](https://github.com/user-attachments/assets/fea87030-294e-4bce-a9ce-146249ee0459)


### Inline Code Completions

#### functions
![flowfuse-assistant-inline-function-completions](https://github.com/user-attachments/assets/487b07be-861b-48d1-88c7-22c9cebffefa)

#### templates
![flowfuse-assistant-inline-template-completions](https://github.com/user-attachments/assets/a6a53c1d-b067-411f-b155-0dcbf67f7e88)

#### tables
![flowfuse-assistant-inline-table-completions](https://github.com/user-attachments/assets/d9b18f96-9889-401e-a530-c89623f72610)

## Installation

```bash
npm install @flowfuse/nr-assistant
```

## Development

Client-side portion of the plugin is in `index.html`. The server side code is in `index.js`

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
