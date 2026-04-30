### 0.12.0

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

## [0.13.0](https://github.com/FlowFuse/nr-assistant/compare/v0.12.0...v0.13.0) (2026-04-30)


### Features

* add automation/add-nodes action ([d127aec](https://github.com/FlowFuse/nr-assistant/commit/d127aecf035d9160d24dbc4ac302a80b27c563a8))
* add automation/add-tab action ([02279c3](https://github.com/FlowFuse/nr-assistant/commit/02279c3d1960210ba94bfa9479730b79849d7e9c))
* add automation/get-workspace-nodes action ([2f8cedb](https://github.com/FlowFuse/nr-assistant/commit/2f8cedbf3e5d516b1ecc77eefe8747e558403d10))
* add automation/import-flow action ([3f594d6](https://github.com/FlowFuse/nr-assistant/commit/3f594d66ba7b2c731a8d6ab8e36d51ff4b28e373))
* add automation/remove-nodes action ([66907dd](https://github.com/FlowFuse/nr-assistant/commit/66907ddf6102113b03ca724fd430046177e32fbf))
* add automation/remove-tab action ([bbb1a66](https://github.com/FlowFuse/nr-assistant/commit/bbb1a667ed3e7ee2f668bbba4da18b4c80492f73))
* add automation/set-wires action ([b248627](https://github.com/FlowFuse/nr-assistant/commit/b2486279fc6f0d9d0e870a749eae1ac121fa6ed0))
* add automation/show-workspace action ([db0ca35](https://github.com/FlowFuse/nr-assistant/commit/db0ca356ec621fd37ed64b10b95ea0ae4752d4a0))
* add automation/update-node action ([7de61dd](https://github.com/FlowFuse/nr-assistant/commit/7de61dd247acf729be4626c5391d18450fb70674))
* add close UI panel actions ([4ca0a2a](https://github.com/FlowFuse/nr-assistant/commit/4ca0a2aeb70c074e2c21ab654ba2d4b66b633f21))
* **set-links:** add automation/set-links action for link nodes ([02e7156](https://github.com/FlowFuse/nr-assistant/commit/02e715668228eb8b7490afc3187ba586096d1d25))
* **set-links:** add automation/set-links action for link nodes ([c7fcc8a](https://github.com/FlowFuse/nr-assistant/commit/c7fcc8a9dac8cd80acd0950ad4b79251fb42e30e)), closes [#261](https://github.com/FlowFuse/nr-assistant/issues/261)


### Bug Fixes

* **add-nodes:** reject empty nodes array and pre-check duplicate IDs ([8df0dc2](https://github.com/FlowFuse/nr-assistant/commit/8df0dc2fcbdbf95ddb9a723d6ca3086588c782ec))
* **add-nodes:** reject empty nodes array and pre-check duplicate IDs ([ef1edff](https://github.com/FlowFuse/nr-assistant/commit/ef1edff3b6090f041298f0fbec3c5c17f1c9b7e6))
* **add-nodes:** validate all target tabs via showWorkspace, check locked ([16a22d0](https://github.com/FlowFuse/nr-assistant/commit/16a22d014964bd669836cbb1a1c9c4e1da324dd9))
* **add-nodes:** validate target tab, verify import, expose generateIds option ([542dd62](https://github.com/FlowFuse/nr-assistant/commit/542dd626107c282dcef1107477b46e593421b9b4))
* **add-tab:** validate that label is provided before creating tab ([43284f7](https://github.com/FlowFuse/nr-assistant/commit/43284f781696f608b374a4590200227d654d6935))
* apply node defaults during import to avoid validation warnings ([07cb040](https://github.com/FlowFuse/nr-assistant/commit/07cb040af4c461f248ad54137e7f7c58a70b3290))
* check if workspace is locked before removing tab ([67e9f86](https://github.com/FlowFuse/nr-assistant/commit/67e9f8666b08233286bbb2546aaff4828c87bb75))
* correct lint errors in expertAutomations and test file ([9407e2b](https://github.com/FlowFuse/nr-assistant/commit/9407e2b0c744a58c1d7625595c45948411b6d2ed))
* correct lint errors in expertAutomations and test file ([2a90ff8](https://github.com/FlowFuse/nr-assistant/commit/2a90ff881dafcf6ab42d1ecb5d2d26e1c9978ef3))
* correct lint errors in expertAutomations and test file ([a56cb66](https://github.com/FlowFuse/nr-assistant/commit/a56cb6627f20cf8968718a62806afe1b129fab32))
* correct lint errors in expertAutomations and test file ([c4c81ee](https://github.com/FlowFuse/nr-assistant/commit/c4c81ee068157afca5cd6f0c62a767a0990837db))
* correct lint errors in expertAutomations and test file ([0823a84](https://github.com/FlowFuse/nr-assistant/commit/0823a845213527b1ba04b6bf4fd7cc1658929b42))
* correct lint errors in expertAutomations and test file ([72db664](https://github.com/FlowFuse/nr-assistant/commit/72db66466ff23a36925e4f1a3cfeaac78be8f506))
* correct lint errors in expertAutomations and test file ([03dfcc8](https://github.com/FlowFuse/nr-assistant/commit/03dfcc83b47922c073a188af5871ec2c74597d90))
* correct lint errors in expertAutomations and test file ([e0b6f4e](https://github.com/FlowFuse/nr-assistant/commit/e0b6f4e7cad0813c850ea88e497038660973cc1d))
* correct lint errors in expertAutomations and test file ([b4167ee](https://github.com/FlowFuse/nr-assistant/commit/b4167ee82d1d7a594190394e64f090890b4884a4))
* correct lint errors in expertAutomations and test file ([21d45fc](https://github.com/FlowFuse/nr-assistant/commit/21d45fc732f1f52489b77a49d9947dae0e1dec7a))
* delegate node defaults to importNodes instead of manual filling ([1bf6dbe](https://github.com/FlowFuse/nr-assistant/commit/1bf6dbea60da48ed2bf830c70a9e2466ffa392af))
* dispatch ESC to close type search instead of calling hide() directly ([ac6b7f1](https://github.com/FlowFuse/nr-assistant/commit/ac6b7f1217ece60f683fcfac3794d2971155fef0))
* extract validateFlow, add locked workspace check in importFlow ([dc29bef](https://github.com/FlowFuse/nr-assistant/commit/dc29beffc8c32641524675f7408a9a0cea05b9f3))
* make importFlow explicitly handle both string and array input ([0e04762](https://github.com/FlowFuse/nr-assistant/commit/0e04762e4aba304733ffefd13b391dada745a94b))
* merge feat/197-remove-nodes — resolve conflicts for set-wires branch ([51d6390](https://github.com/FlowFuse/nr-assistant/commit/51d6390a4b47c9d1297593e694e68584d40c2a32))
* merge feat/199-set-wires — resolve conflicts for import-flow branch ([738ea6b](https://github.com/FlowFuse/nr-assistant/commit/738ea6b98299b95ccf989fdfe07f4372136cb6f7))
* reject duplicate tab ID in addTab ([9aeb0e2](https://github.com/FlowFuse/nr-assistant/commit/9aeb0e29acab6e6e29ee5d44b4b7cc81bbe15861))
* **remove-nodes:** validate all node IDs exist before removing ([e0a9142](https://github.com/FlowFuse/nr-assistant/commit/e0a914292f8f499c15969bc6df6aa89ffd4d160c))
* resolve nodes once and check workspace lock in removeNodes ([c27fe9c](https://github.com/FlowFuse/nr-assistant/commit/c27fe9c60accee54bffde288055cf2222fb2a0b1))
* Revert jsonschema dependency and return to hand-rolled parameter validation ([eab8dae](https://github.com/FlowFuse/nr-assistant/commit/eab8dae7b4d9a49a9efaa7592c5f8c044791c617))
* **schema:** add additionalProperties to add-nodes item schema ([e737cf2](https://github.com/FlowFuse/nr-assistant/commit/e737cf2df3f6ca1194d09282a38139738ae21bc4))
* set dirty flag after importFlow ([cf34475](https://github.com/FlowFuse/nr-assistant/commit/cf344750f4f8312cf68237b155d27206be83e26d))
* **set-links:** handle link call single-target, dynamic mode, and virtual wire refresh ([a227c07](https://github.com/FlowFuse/nr-assistant/commit/a227c0736cda7df3ff2f42592b18d7e396f64b6d))
* **set-links:** trigger node revalidation after modifying links ([96b875c](https://github.com/FlowFuse/nr-assistant/commit/96b875cbb9b721fe9daea1b1fa2e13ea1ee35a70))
* **set-wires:** add comprehensive validation before modifying wires ([86fe595](https://github.com/FlowFuse/nr-assistant/commit/86fe595494718b70d5d146f6b357edfc9def9879))
* **set-wires:** do not set node.changed on wire add/remove ([7de53b1](https://github.com/FlowFuse/nr-assistant/commit/7de53b1d59e77d6126af655dfd7b6acb59a48f34))
* **set-wires:** restore node.changed on undo via multi history event ([43e225a](https://github.com/FlowFuse/nr-assistant/commit/43e225a5417649ff61ccb9db2fbdd008f75953c3))
* **set-wires:** throw when removing a wire that does not exist ([ba7cd02](https://github.com/FlowFuse/nr-assistant/commit/ba7cd028db48bb570f619ac0fd436fd3153e675f))
* **show-workspace:** validate workspace exists before switching tab ([d0884b9](https://github.com/FlowFuse/nr-assistant/commit/d0884b9c29e3ac2177222f729119e8d9269b5ceb))
* Support nested properties in validation ([de0a81b](https://github.com/FlowFuse/nr-assistant/commit/de0a81bd851260112bc61e10c847b9310b4af039))
* Update debug log selectors to be compatible with NR5 ([#302](https://github.com/FlowFuse/nr-assistant/issues/302)) ([5010176](https://github.com/FlowFuse/nr-assistant/commit/50101766b7ec3dafbeb4d11284267c0e03f8ab2e))
* use RED.nodes.createCompleteNodeSet instead of manual traversal ([cfad1f1](https://github.com/FlowFuse/nr-assistant/commit/cfad1f198a096136a849b3107ca3082a9485385f))
* **validateSchema:** support array type definitions in param validation ([15adcab](https://github.com/FlowFuse/nr-assistant/commit/15adcab0d84a3ed5cac85f9764b44eb30c7aae3e))
* **validation:** throw if tab id not found in removeTab ([ce081f2](https://github.com/FlowFuse/nr-assistant/commit/ce081f281e8dfac0ad7547fbf9c1e3a1beabf07f))

### 0.11.0

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

### 0.10.2

 - Bump JS-DevTools/npm-publish from 4.1.4 to 4.1.5 (#136)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#141)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#142)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#143)
 - Bump @modelcontextprotocol/sdk from 1.25.3 to 1.26.0 (#138) @app/dependabot
 - Update public catalouge on release (#144) @hardillb

### 0.10.1

 - Bump hono from 4.11.5 to 4.11.7 (#129) @app/dependabot
 - Improve discoverability of supported features (#131) @Steve-Mcl
 - Replace hard coded event mapping with dynamic registrations (#132) @Steve-Mcl

### 0.10.0

 - Bump JS-DevTools/npm-publish from 4.1.3 to 4.1.4 (#110)
 - Bump actions/checkout from 6.0.1 to 6.0.2 (#124)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#123)
 - Bump flowfuse/github-actions-workflows/.github/workflows/sast_scan.yaml (#122)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#121)
 - Add selection handling: `view:selection-changed` notifier and `get-selection` handler (#125) @cstns

### 0.9.0

 - Update dependencies (#119) @Steve-Mcl
 - Bump actions/setup-node from 6.1.0 to 6.2.0 (#113)
 - Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#112)
 - Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#111)
 - Expose installed packages to flowfuse expert (#114) @cstns
 - ci: Enable SAST (#109) @ppawlowski

### 0.8.0

- Bump JS-DevTools/npm-publish from 4.1.1 to 4.1.3 (#105)
- Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml (#96)
- Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml (#95)
- Bump hono from 4.11.3 to 4.11.4 (#107) @app/dependabot
- Bump @modelcontextprotocol/sdk from 1.24.2 to 1.25.2 (#102) @app/dependabot
- Add support expert actions (#106) @Steve-Mcl
- Bump qs from 6.14.0 to 6.14.1 (#100) @app/dependabot
- Bump flowfuse/github-actions-workflows/.github/workflows/publish_node_package.yml from 0.44.0 to 0.45.0 (#98) @app/dependabot
- Bump flowfuse/github-actions-workflows/.github/workflows/build_node_package.yml from 0.44.0 to 0.45.0 (#97) @app/dependabot

### 0.7.0

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

### 0.6.0
 - Fix relative script source path (#77) @Steve-Mcl
 - Add inline completions feature (#75) @Steve-Mcl

### 0.5.0
 - Bump actions/checkout from 4.2.2 to 5.0.0 (#69)
 - Bump flowfuse/github-actions-workflows from 0.40.0 to 0.42.0 (#68)
 - Add tables codelens feature (#72) @Steve-Mcl

### 0.4.0
 - update package for 0.4.0 release
 - Bump flowfuse/github-actions-workflows from 0.39.0 to 0.40.0 (#60)
 - Update imports (#64) @Steve-Mcl
 - Implement node suggestions (#62) @Steve-Mcl
 - Add copy to clipboard and generate comment node to explain dialog (#61) @Steve-Mcl

### 0.3.0
 - Change assistant button to menu for exposing new Flows Explainer by @Steve-Mcl in #53
 - Add menu shortcuts for menu items by @Steve-Mcl in #54
 - Show flow explanation in dialog by @Steve-Mcl in #52
 - Add codelens for CSS and DB2 ui-template by @Steve-Mcl in #56

### 0.2.1
 - Improve README with visuals of what it does by @Steve-Mcl in #49
 - V0.2.1 by @Steve-Mcl in #50

### 0.2.0

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

### 0.1.3

 - Fix icon on device agent by @Steve-Mcl in #29
 - bump for 0.1.3 by @Steve-Mcl in #30

### 0.1.2

 - Fix height of new icon on NR3.x by @Steve-Mcl in #26
 - bump for 0.1.2 by @Steve-Mcl in #27

### 0.1.1

 - ci: Add build and publish nightly package workflow by @ppawlowski in #7
 - Bump tibdex/github-app-token from 1 to 2 by @dependabot in #11
 - Add JSON editor code lens by @Steve-Mcl in #14
 - Correct handling of locked flows by @Steve-Mcl in #17
 - Update package.json for version bump release by @Steve-Mcl in #20
 - add custom icon to toolbar button by @Steve-Mcl in #21
 - Add comma to settings.js by @kazuhitoyokoi in #22
 - Improved messaging for error responses by @Steve-Mcl in #24

### 0.1.0

 - add automations by @Steve-Mcl in #1
 - Bump JS-DevTools/npm-publish from 2 to 3 by @dependabot in #5
 - Wording and layout improvements prior to first release by @Steve-Mcl in #8
