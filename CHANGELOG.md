## 0.13.0

 - ci: Use new project-automation workflow (#303)
 - ci: Replace PAT with GitHub Application token in `Projects automations` workflow (#300)
 - chore(deps): bump actions/setup-node from 6.3.0 to 6.4.0 (#282)
 - chore(deps): bump googleapis/release-please-action from 4.4.1 to 5.0.0 (#289)
 - ci: Ensure release PR title follows conventional commit pattern (#284)
 - ci: Introduce automatic release PR creation with `release-please` (#274)
 - build(deps): bump flowfuse/github-actions-workflows (#279)
 - build(deps): bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#280)
 - build(deps): bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#281)
 - build(deps): bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#278)
 - Bump actions/create-github-app-token from 3.0.0 to 3.1.1 (#253)
 - fix: ensure all nls message lookups are fully namespaced (#306) @knolleary
 - feat(actions): add automation/list-config-nodes action (#299) @andypalmi
 - fix(actions): allow config nodes in add-nodes without z property (#297) @andypalmi
 - feat: add automation/get-palette action (#295) @andypalmi
 - feat(actions): add automation/get-node-types action (#291) @andypalmi
 - feat(actions): return node validation results from create/update actions (#288) @andypalmi
 - feat(actions): return contextual payloads from all write actions (#286) @andypalmi
 - feat(update-node): add line-based partial edits via patches (#271) @andypalmi
 - fix: Update debug log selectors to be compatible with NR5 (#302) @Steve-Mcl
 - Support union types in schema (#277) @Steve-Mcl
 - fix action automation issues in flow gen (#276) @Steve-Mcl
 - Add correlationId to event data and message replies in ExpertComms (#275) @Steve-Mcl
 - feat(set-links): add automation/set-links action for link nodes (#264) @andypalmi
 - fix: Revert jsonschema dependency and return to hand-rolled parameter validation (#269) @Steve-Mcl
 - Rename to/from parameters to source/target for consistency (#268) @Steve-Mcl
 - fix: Support nested properties in validation (#266) @Steve-Mcl
 - build(deps): bump hono from 4.12.12 to 4.12.14 (#265) @app/dependabot
 - fix(add-nodes): reject empty nodes array and pre-check duplicate IDs (#263) @andypalmi
 - feat: add automation/import-flow action (#242) @andypalmi
 - feat: add automation/remove-nodes action (#236) @andypalmi
 - feat: add automation/add-nodes action (#235) @andypalmi
 - feat: add automation/remove-tab action (#240) @andypalmi
 - feat: add automation/add-tab action (#239) @andypalmi
 - feat: add close UI panel actions (#244) @andypalmi
 - feat: add automation/get-workspace-nodes action (#241) @andypalmi
 - feat: add automation/show-workspace action (#243) @andypalmi
 - feat: add automation/update-node action (#237) @andypalmi
 - Update lint scripts to include all subdirectories (#255) @Steve-Mcl
 - Use git ref_name for version instead of npm info (#252) @allthedoll

## [0.13.1](https://github.com/FlowFuse/nr-assistant/compare/v0.13.0...v0.13.1) (2026-05-07)


### Bug Fixes

* **actions:** add-nodes respects z, update-node redraws correctly ([45b870d](https://github.com/FlowFuse/nr-assistant/commit/45b870d725450e5da4a2ac135af40a61cd4babd1))
* **actions:** add-nodes respects z, update-node redraws correctly ([#311](https://github.com/FlowFuse/nr-assistant/issues/311)) ([eabba18](https://github.com/FlowFuse/nr-assistant/commit/eabba18f49c92769f69fb840f1d406dd3399cf6c))

## 0.12.0

 - Bump actions/create-github-app-token from 2.2.1 to 3.0.0 (#191)
 - Bump actions/setup-node from 6.2.0 to 6.3.0 (#177)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#179)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#178)
 - Bump flowfuse/github-actions-workflows from 0.51.0 to 0.52.0 (#181)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#180)
 - Bump benc-uk/workflow-dispatch from 1.2.4 to 1.3.1 (#154)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#164)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#165)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#163)
 - Bump flowfuse/github-actions-workflows from 0.49.0 to 0.51.0 (#162)
 - Bump hono from 4.12.7 to 4.12.12 (#250) @app/dependabot
 - Bump @hono/node-server from 1.19.10 to 1.19.13 (#249) @app/dependabot
 - [7000] Emit active tab info on workspace change (#231) @n-lark
 - Bump path-to-regexp from 8.3.0 to 8.4.0 (#225) @app/dependabot
 - Bump flatted from 3.3.1 to 3.4.2 (#195) @app/dependabot
 - ci: Use NodeJS v24 to build package (#220) @ppawlowski
 - ci: Use NodeJS v24 as a default GitHub Actions runtime (#219) @ppawlowski
 - Support add flow action (#192) @Steve-Mcl
 - ci: replace `tibdex/github-app-token` with `actions/create-github-app-token` (#187) @ppawlowski
 - Add search action support (#186) @Steve-Mcl
 - Add edit node action (#185) @Steve-Mcl
 - ci: add concurrency to publish workflow (#183) @ppawlowski
 - Add select nodes action (#184) @Steve-Mcl
 - Bump hono from 4.12.5 to 4.12.7 (#182) @app/dependabot
 - Bump express-rate-limit from 8.2.1 to 8.3.0 (#176) @app/dependabot
 - Bump @hono/node-server from 1.19.9 to 1.19.10 (#167) @app/dependabot
 - Bump hono from 4.12.3 to 4.12.5 (#166) @app/dependabot
 - Bump minimatch from 3.1.2 to 3.1.5 (#161) @app/dependabot

## 0.11.0

 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#149)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#148)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#147)
 - Include available updates in the initial handshake with the expert (#156) @Steve-Mcl
 - Bump hono from 4.12.0 to 4.12.3 (#157) @app/dependabot
 - Bump ajv from 6.12.6 to 6.14.0 (#159) @app/dependabot
 - Add Debug context support (#151) @Steve-Mcl
 - Bump mcp sdk to latest (#158) @Steve-Mcl
 - Bump hono from 4.11.7 to 4.12.0 (#152) @app/dependabot
 - Bump qs from 6.14.1 to 6.14.2 (#146) @app/dependabot

## 0.10.2

 - Bump JS-DevTools/npm-publish from 4.1.4 to 4.1.5 (#136)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#141)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#142)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#143)
 - Bump @modelcontextprotocol/sdk from 1.25.3 to 1.26.0 (#138) @app/dependabot
 - Update public catalouge on release (#144) @hardillb

## 0.10.1

 - Bump hono from 4.11.5 to 4.11.7 (#129) @app/dependabot
 - Improve discoverability of supported features (#131) @Steve-Mcl
 - Replace hard coded event mapping with dynamic registrations (#132) @Steve-Mcl

## 0.10.0

 - Bump JS-DevTools/npm-publish from 4.1.3 to 4.1.4 (#110)
 - Bump actions/checkout from 6.0.1 to 6.0.2 (#124)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#123)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#122)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#121)
 - Add selection handling: `view:selection-changed` notifier and `get-selection` handler (#125) @cstns

## 0.9.0

 - Update dependencies (#119) @Steve-Mcl
 - Bump actions/setup-node from 6.1.0 to 6.2.0 (#113)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#112)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#111)
 - Expose installed packages to flowfuse expert (#114) @cstns
 - ci: Enable SAST (#109) @ppawlowski

## 0.8.0

- Bump JS-DevTools/npm-publish from 4.1.1 to 4.1.3 (#105)
- Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#96)
- Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#95)
- Bump hono from 4.11.3 to 4.11.4 (#107) @app/dependabot
- Bump @modelcontextprotocol/sdk from 1.24.2 to 1.25.2 (#102) @app/dependabot
- Add support expert actions (#106) @Steve-Mcl
- Bump qs from 6.14.0 to 6.14.1 (#100) @app/dependabot
- Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml from 0.44.0 to 0.45.0 (#98) @app/dependabot
- Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml from 0.44.0 to 0.45.0 (#97) @app/dependabot

## 0.7.0

 - Allow the assistant to be installed in standalone Node-RED instances (#89) @knolleary

 - Bump actions/checkout from 6.0.0 to 6.0.1 (#93)
 - Bump actions/setup-node from 6.0.0 to 6.1.0 (#92)
 - Bump actions/checkout from 5.0.0 to 6.0.0 (#87)
 - Bump flowfuse/github-actions-workflows from 0.42.0 to 0.43.0 (#84)
 - Bump actions/setup-node from 5.0.0 to 6.0.0 (#83)
 - Bump JS-DevTools/npm-publish from 4.0.1 to 4.1.1 (#82)
 - Bump JS-DevTools/npm-publish from 4.0.0 to 4.0.1 (#81)
 - Bump JS-DevTools/npm-publish from 3.1.1 to 4.0.0 (#80)
 - Bump actions/setup-node from 4.4.0 to 5.0.0 (#79)
 - Bump @modelcontextprotocol/sdk from 1.17.0 to 1.24.0 (#91) @app/dependabot
 - Bump express from 5.1.0 to 5.2.1 (#90) @app/dependabot
 - Bump body-parser from 2.2.0 to 2.2.1 (#88) @app/dependabot
 - Bump js-yaml from 4.1.0 to 4.1.1 (#86) @app/dependabot

## 0.6.0
 - Fix relative script source path (#77) @Steve-Mcl
 - Add inline completions feature (#75) @Steve-Mcl

## 0.5.0
 - Bump actions/checkout from 4.2.2 to 5.0.0 (#69)
 - Bump flowfuse/github-actions-workflows from 0.40.0 to 0.42.0 (#68)
 - Add tables codelens feature (#72) @Steve-Mcl

## 0.4.0
 - update package for 0.4.0 release
 - Bump flowfuse/github-actions-workflows from 0.39.0 to 0.40.0 (#60)
 - Update imports (#64) @Steve-Mcl
 - Implement node suggestions (#62) @Steve-Mcl
 - Add copy to clipboard and generate comment node to explain dialog (#61) @Steve-Mcl

## 0.3.0
 - Change assistant button to menu for exposing new Flows Explainer by @Steve-Mcl in #53
 - Add menu shortcuts for menu items by @Steve-Mcl in #54
 - Show flow explanation in dialog by @Steve-Mcl in #52
 - Add codelens for CSS and DB2 ui-template by @Steve-Mcl in #56

## 0.2.1
 - Improve README with visuals of what it does by @Steve-Mcl in #49
 - V0.2.1 by @Steve-Mcl in #50

## 0.2.0

 - Bump flowfuse/github-actions-workflows from 0.19.0 to 0.28.0 by @dependabot in #32
 - Bump flowfuse/github-actions-workflows from 0.28.0 to 0.29.0 by @dependabot in #33
 - Bump flowfuse/github-actions-workflows from 0.29.0 to 0.30.0 by @dependabot in #34
 - Bump flowfuse/github-actions-workflows from 0.30.0 to 0.34.0 by @dependabot in #35
 - Bump flowfuse/github-actions-workflows from 0.34.0 to 0.36.0 by @dependabot in #36
 - Bump flowfuse/github-actions-workflows from 0.36.0 to 0.38.0 by @dependabot in #38
 - Clarify usage restriction of the plugin by @knolleary in #39
 - chore: Pin external actions to commit hash by @ppawlowski in #40
 - chore: fix lint script by @ppawlowski in #41
 - Bump actions/setup-node from 4.3.0 to 4.4.0 by @dependabot in #42
 - Add initial MCP support by @Steve-Mcl in #44
 - V0.2.0 by @Steve-Mcl in #47

## 0.1.3

 - Fix icon on device agent by @Steve-Mcl in #29
 - bump for 0.1.3 by @Steve-Mcl in #30

## 0.1.2

 - Fix height of new icon on NR3.x by @Steve-Mcl in #26
 - bump for 0.1.2 by @Steve-Mcl in #27

## 0.1.1

 - ci: Add build and publish nightly package workflow by @ppawlowski in #7
 - Bump tibdex/github-app-token from 1 to 2 by @dependabot in #11
 - Add JSON editor code lens by @Steve-Mcl in #14
 - Correct handling of locked flows by @Steve-Mcl in #17
 - Update package.json for version bump release by @Steve-Mcl in #20
 - add custom icon to toolbar button by @Steve-Mcl in #21
 - Add comma to settings.js by @kazuhitoyokoi in #22
 - Improved messaging for error responses by @Steve-Mcl in #24

## 0.1.0

 - add automations by @Steve-Mcl in #1
 - Bump JS-DevTools/npm-publish from 2 to 3 by @dependabot in #5
 - Wording and layout improvements prior to first release by @Steve-Mcl in #8
