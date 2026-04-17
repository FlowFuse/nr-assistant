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

## Release process

In this project, the [Release Please](https://github.com/googleapis/release-please) is used to automatically determine the next release version based on the commit messages in the codebase. 

By using the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), the project adheres to a standardized format for commit messages, which `Release Please` uses to determine whether the next release should be a major, minor, or patch release.

### Components

1. The `Prepare release` GitHub Action workflow:

    * A Release Please action that analyzes commit messages to determine the type of release required (major, minor, patch) based on the Conventional Commits specification
    * Creates a pre-release pull request with the proposed version bump and changelog
    * Once merged, automatically updates the version number in `package.json` and creates a new release on GitHub with the appropriate changelog

2. The `Lint Pull Request Title` GitHub Action workflow:

    * A workflow that runs on pull request creation and uses the `amannn/action-semantic-pull-request` action to validate that pull request titles follow the Conventional Commits format
    * Together with adjusted default merge commit message, this ensures that all commits merged into the main branch adhere to the expected format, allowing Release Please to function correctly

3. The `Release Published` GitHub Action workflow:

    * A workflow that runs when a new git tag in `v*.*.*` format is pushed and is responsible for publishing the new version of the package to the public npm registry using the `JS-DevTools/npm-publish` action
    * Once package is published, the workflow create a pull request in the `flowfuse/nr-launcher` repository to update the version of the plugin used in the nr-launcher

### Pull Request Title Format

The Conventional Commits preset expects pull request titles to be in the following format:

```
<type>(<scope>): <subject>
```

* Type: Describes the category of the commit. Examples include:
    * `feat`: A new feature (triggers a minor version bump).
    * `fix`: A bug fix (triggers a patch version bump).
    * `perf`: A code change that improves performance (triggers a patch version bump).
    * `refactor`: A code change that neither fixes a bug nor adds a feature (does not trigger a release unless it's accompanied by a BREAKING CHANGE).
    * `docs`: Documentation-only changes (does not trigger a release).
    * `chore`: Changes to the build process or auxiliary tools and libraries (does not trigger a release).
* Scope: An optional part that provides additional context about what was changed (e.g., module, component).
* Subject: A brief description of the changes.

### Handling Breaking Changes

To indicate a breaking change, the exclamation mark `!` should be used immediately after the type/scope:

* `feat!:,` 
* `fix!:`
* `refactor!:`

## License

Apache-2.0
