import { ExpertActionsInterface } from './expertActionsInterface.js'

// Actions supported by this module (namespace/action-name):
const SELECT_NODES = 'automation/select-nodes'
const GET_NODES = 'automation/get-nodes'
const EDIT_NODE = 'automation/open-node-edit'
const SEARCH = 'automation/search'
const ADD_FLOW_TAB = 'automation/add-flow-tab'
const UPDATE_NODE = 'automation/update-node'
const SHOW_WORKSPACE = 'automation/show-workspace'
const GET_FLOW = 'automation/get-workspace-nodes'
const LIST_WORKSPACES = 'automation/list-workspaces'
const CLOSE_SEARCH = 'automation/close-search'
const CLOSE_TYPE_SEARCH = 'automation/close-type-search'
const CLOSE_ACTION_LIST = 'automation/close-action-list'
const ADD_TAB = 'automation/add-tab'
const REMOVE_TAB = 'automation/remove-tab'
const ADD_NODES = 'automation/add-nodes'
const REMOVE_NODES = 'automation/remove-nodes'
const SET_WIRES = 'automation/set-wires'
const SET_LINKS = 'automation/set-links'
const IMPORT_FLOW = 'automation/import-flow'
const CLOSE_EDITOR_TRAY = 'automation/close-editor-tray'
const GET_NODE_TYPE = 'automation/get-node-type'
const LIST_NODE_PACKAGES = 'automation/list-node-packages'
const LIST_CONFIG_NODES = 'automation/list-config-nodes'

/**
 * @typedef {SELECT_NODES
 *   |GET_NODES
 *   |EDIT_NODE
 *   |SEARCH
 *   |ADD_FLOW_TAB
 *   |UPDATE_NODE
 *   |SHOW_WORKSPACE
 *   |GET_FLOW
 *   |LIST_WORKSPACES
 *   |CLOSE_SEARCH
 *   |CLOSE_TYPE_SEARCH
 *   |CLOSE_ACTION_LIST
 *   |ADD_TAB
 *   |REMOVE_TAB
 *   |ADD_NODES
 *   |REMOVE_NODES
 *   |SET_WIRES
 *   |SET_LINKS
 *   |IMPORT_FLOW
 *   |CLOSE_EDITOR_TRAY
 *   |GET_NODE_TYPE
 *   |LIST_NODE_PACKAGES
 *   |LIST_CONFIG_NODES} ExpertAutomationsActionsEnum
 */

export class ExpertAutomations extends ExpertActionsInterface {
    actions = Object.freeze({
        [GET_NODES]: {
            params: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The ID of a single node to retrieve. Can be used with `include` property to also retrieve nodes upstream, downstream, or connected to the specified node.'
                    },
                    ids: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'The IDs of multiple nodes to retrieve (alternative to `id` property)'
                    },
                    include: {
                        type: 'string',
                        enum: ['upstream', 'downstream', 'connected'],
                        description: 'If `id` is provided, `include` can be used to specify whether to also retrieve nodes upstream, downstream, or connected to the specified node. Not applicable if `ids` property is used.'
                    }
                }
            }
        },
        [SELECT_NODES]: {
            params: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The ID of a single node to select'
                    },
                    ids: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'The IDs of multiple nodes to select (alternative to `id` property)'
                    },
                    include: {
                        type: 'string',
                        enum: ['upstream', 'downstream', 'connected'],
                        description: 'If `id` is provided, `include` can be used to specify whether to also select nodes upstream, downstream, or connected to the specified node. Not applicable if `ids` property is used.'
                    }
                }
            }
        },
        [EDIT_NODE]: {
            params: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The ID of the node to edit'
                    }
                }
            }
        },
        [SEARCH]: {
            params: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query string'
                    },
                    interactive: {
                        type: 'boolean',
                        description: 'Whether the search is interactive (e.g. show the search box UI)'
                    }
                }
            }
        },
        [ADD_FLOW_TAB]: {
            params: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'Optional title for the new flow tab'
                    }
                }
            }
        },
        [UPDATE_NODE]: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'ID of the node to update' },
                    properties: { type: 'object', description: 'Key-value pairs to merge into the node object' },
                    patches: {
                        type: 'array',
                        description: 'Line-based partial edits for string properties. All line numbers reference the original content before any patches are applied.',
                        items: {
                            type: 'object',
                            properties: {
                                property: { type: 'string', description: 'Dot-separated property path of the node to update. Use numeric segments to index arrays (e.g. "rules.0.to" for rules[0].to).' },
                                op: {
                                    type: 'string',
                                    enum: ['replace', 'insert', 'delete'],
                                    description: 'replace: replace lines start..end. insert: insert content before line start. delete: remove lines start..end.'
                                },
                                start: { type: 'number', description: 'Start line (1-indexed, inclusive)' },
                                end: { type: 'number', description: 'End line (1-indexed, inclusive). Required for replace and delete.' },
                                content: { type: 'string', description: 'Text to insert or replace with (\\n for multiple lines). Required for replace and insert.' }
                            },
                            required: ['property', 'op', 'start']
                        }
                    }
                },
                required: ['id']
            }
        },
        [SHOW_WORKSPACE]: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'ID of the flow tab or subflow to navigate to' }
                },
                required: ['id']
            }
        },
        [GET_FLOW]: {
            params: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        description: 'Optional parameter to filter by node type. Exclude this parameter to get all node types.'
                    },
                    tabId: {
                        type: 'string',
                        description: 'Optional parameter to only get nodes on a specific workspace. Exclude this parameter to get node from all workspaces.'
                    }
                }
            }
        },
        [LIST_WORKSPACES]: {
            params: null
        },
        [CLOSE_SEARCH]: { params: null },
        [CLOSE_TYPE_SEARCH]: { params: null },
        [CLOSE_ACTION_LIST]: { params: null },
        [ADD_TAB]: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Tab ID — auto-generated if omitted' },
                    label: { type: 'string', description: 'Tab label' },
                    disabled: { type: 'boolean', description: 'Create as disabled' },
                    info: { type: 'string', description: 'Tab notes' },
                    env: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'Environment variable name' },
                                value: { type: 'string', description: 'Environment variable value' },
                                type: {
                                    type: 'string',
                                    enum: ['str', 'num', 'bool', 'json', 'env', 'cred', 'jsonata'],
                                    description: 'Environment variable type'
                                }
                            },
                            required: ['name', 'value', 'type']
                        },
                        description: 'Environment variables'
                    }
                },
                required: ['label']
            }
        },
        [REMOVE_TAB]: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'ID of the tab to remove' }
                },
                required: ['id']
            }
        },
        [ADD_NODES]: {
            params: {
                type: 'object',
                properties: {
                    nodes: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: 'Unique node ID' },
                                type: { type: 'string', description: 'Node type identifier' },
                                x: { type: 'number', description: 'Canvas x position' },
                                y: { type: 'number', description: 'Canvas y position' },
                                z: { type: 'string', description: 'Tab (workspace) ID — required for non-config nodes, omit for config nodes' }
                            },
                            additionalProperties: true,
                            required: ['id', 'type']
                        },
                        description: 'Array of node objects to add to the canvas'
                    },
                    generateIds: { type: 'boolean', description: 'Regenerate node IDs during import (use if IDs may conflict). Default: false', default: false }
                },
                required: ['nodes']
            }
        },
        [REMOVE_NODES]: {
            params: {
                type: 'object',
                properties: {
                    ids: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'IDs of nodes to remove from the canvas'
                    }
                },
                required: ['ids']
            }
        },
        [SET_WIRES]: {
            params: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['add', 'remove'], description: 'Whether to add or remove a wire' },
                    source: { type: 'string', description: 'Source node ID' },
                    output: { type: 'number', description: 'Source output port index (0-based)' },
                    target: { type: 'string', description: 'Target node ID' }
                },
                required: ['mode', 'source', 'target']
            }
        },
        [SET_LINKS]: {
            params: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['add', 'remove'], description: 'Whether to add or remove a virtual link between link nodes' },
                    source: { type: 'string', description: 'Source link node ID (link out or link call)' },
                    target: { type: 'string', description: 'Target link node ID (link in)' }
                },
                required: ['mode', 'source', 'target']
            }
        },
        [IMPORT_FLOW]: {
            params: {
                type: 'object',
                properties: {
                    flow: {
                        type: ['string', 'array'],
                        description: 'Flow JSON string or array to import onto the canvas'
                    },
                    addFlowTab: {
                        type: 'boolean',
                        description: 'Whether to create a new tab for the imported nodes (true) or import into the current tab (false). Default: false'
                    },
                    generateIds: {
                        type: 'boolean',
                        description: 'Whether to regenerate node IDs during import. Default: true.',
                        default: true
                    }
                },
                required: ['flow']
            }
        },
        [CLOSE_EDITOR_TRAY]: {
            params: null
        },
        [GET_NODE_TYPE]: {
            params: {
                type: 'object',
                required: ['type'],
                properties: {
                    type: {
                        type: 'string',
                        description: 'Node type identifier to look up (e.g. "inject", "function", "worldmap")'
                    }
                }
            }
        },
        [LIST_NODE_PACKAGES]: {
            params: {
                type: 'object',
                properties: {
                    typedModules: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Module names that have pre-built schemas, used to set hasSchema flag on each package'
                    }
                }
            }
        },
        [LIST_CONFIG_NODES]: {
            params: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        description: 'Optional filter by config node type (e.g. "ui-base", "mqtt-broker")'
                    }
                }
            }
        }
    })

    /**
     * Get node or nodes by id
     * @param {string|string[]} nodeId - the id or ids of the nodes to retrieve
     * @param {'upstream'|'downstream'|'connected'|null} include - if provided, should be one of 'upstream', 'downstream', or 'connected', and will select nodes. Only valid if a single node is being requested.
     * @returns the nodes that were retrieved
     */
    getNodes (nodeId, include) {
        if (typeof nodeId === 'string') {
            // user is requesting a single node. This mode supports getting connected nodes in a certain direction if include is provided
            const node = this.RED.nodes.node(nodeId)
            if (!node) {
                return null
            }
            switch (include) {
            case 'upstream':
                return this.RED.nodes.getAllFlowNodes(node, 'up')
            case 'downstream':
                return this.RED.nodes.getAllFlowNodes(node, 'down')
            case 'connected':
                return this.RED.nodes.getAllFlowNodes(node)
            }
            return [node] // if include is not provided or is unrecognized, just return the single node in an array
        } else if (Array.isArray(nodeId)) {
            // user is requesting multiple specific nodes by id, include parameter is not applicable in this case
            const nodes = nodeId.map(id => this.RED.nodes.node(id)).filter(n => n)
            return nodes
        }
        return null
    }

    /**
     * Select node or nodes on the workspace
     * @param {string|string[]} nodeId - the id or ids of the nodes to select
     * @param {'upstream'|'downstream'|'connected'|null} include - if provided, should be one of 'upstream', 'downstream', or 'connected', and will select nodes in addition to the provided nodeIds. Only valid if a single nodeId is provided.
     * @returns the nodes that were selected
     */
    selectNodes (nodeId, include) {
        const nodes = this.getNodes(nodeId, include)
        if (nodes && nodes.length > 0) {
            let id = nodeId
            if (Array.isArray(nodeId)) id = nodeId[0]
            // call reveal to bring the selected nodes into view (or at least the first one)
            this.RED.view.reveal(id, false) // no flash
            this.RED.view.select({ nodes })
        }
        return nodes
    }

    /**
     * Select and edit a single node on the workspace, or clear selection if no nodeId is provided
     * Also, support upstream, downstream, and connected
     * @param {string} nodeId - the id of the node to select and edit, or null/undefined to clear selection
     * @returns the node that was selected and edited
     * @throws if the node cannot be found or if the view is not in a state that allows selecting and editing nodes
     */
    editNode (nodeId) {
        if (this.RED.view.state() !== this.RED.state.DEFAULT) {
            // only allow selecting and editing nodes when in default state (not editing another node, not in the middle of adding a connection, etc.)
            throw new Error('Cannot select and edit node when not in default view state')
        }
        const selectedNodes = this.selectNodes([nodeId])
        if (!selectedNodes || selectedNodes.length < 1) {
            throw new Error(`Node with id ${nodeId} not found`)
        }
        this.RED.editor.edit(selectedNodes[0])
        return selectedNodes[0]
    }

    search (query, interactive) {
        if (interactive) {
            this.RED.search.show(query)
        } else {
            const results = this.RED.search.search(query)
            return results
        }
    }

    /// Function extracted from Node-RED source `editor-client/src/js/ui/clipboard.js`
    /**
     * Performs the import of nodes, handling any conflicts that may arise
     * @param {string|Object[]} nodesStr the nodes to import — either a JSON string or an array of node objects
     * @param {object} importOptions
     * @param {boolean} importOptions.addFlow whether to add the nodes to a new flow or to the current flow
     * @param {boolean} [importOptions.notify=true] whether to show notifications for import success/failure (default true)
     */
    importFlow (nodesStr, { addFlow = false, generateIds = true } = { addFlow: false, generateIds: true }) {
        let newNodes = nodesStr
        if (typeof nodesStr === 'string') {
            try {
                nodesStr = nodesStr.trim()
                if (nodesStr.length === 0) {
                    return
                }
                newNodes = this.redOps.validateFlowString(nodesStr)
            } catch (err) {
                const e = new Error(this.RED._('clipboard.invalidFlow', { message: err.message }))
                e.code = 'NODE_RED'
                throw e
            }
        } else if (Array.isArray(nodesStr)) {
            this.redOps.validateFlow(nodesStr)
        } else {
            throw new Error('importFlow expects a JSON string or an array of node objects')
        }
        // If importing onto the current tab (not creating a new one), check it's not locked
        if (!addFlow && this.RED.workspaces.isLocked()) {
            throw new Error('Cannot import into a locked workspace')
        }
        const imported = this.RED.view.importNodes(newNodes, { generateIds, addFlow, touchImport: true, applyNodeDefaults: true })
        this.RED.nodes.dirty(true)
        return imported
    }

    async addFlowTab (title) {
        const cmd = () => {
            if (!title) {
                // if no title is specified, we let the core action perform this (auto naming)
                // NOTE: core action does not support setting the flow name.
                this.redOps.invoke('core:add-flow')
            } else {
                // As a title is provided, we have take a different approach: import a new flow with the label prop set.
                const importOptions = { generateIds: true, addFlow: false, notify: false }
                this.importFlow([{ id: '', type: 'tab', label: title, disabled: false, info: '', env: [] }], importOptions)
            }
        }
        let newTab = await this.redOps.commandAndWait(cmd, 'flows:add')
        if (!newTab) {
            return null
        }
        if (Array.isArray(newTab)) {
            newTab = newTab[0]
        }
        if (newTab && newTab.type === 'tab') {
            // select the new tab
            RED.workspaces.show(newTab.id)
        }
        return newTab
    }

    /**
     * Update properties of an existing node in place.
     * Supports full property replacement via `properties` and/or line-based
     * partial edits via `patches`. At least one must be provided.
     * @param {string} id - node ID
     * @param {Object} [properties] - key-value pairs to merge into the node
     * @param {Array} [patches] - line-based partial edits: { property, op, start, end?, content? }
     */
    async updateNode (id, properties, patches, codeProperties) {
        const hasProperties = properties !== undefined && properties !== null
        const hasPatches = Array.isArray(patches) && patches.length > 0
        if (hasProperties && Object.keys(properties).length === 0) {
            throw new Error('"properties" must not be empty')
        }
        if (!hasProperties && !hasPatches) {
            throw new Error('At least one of "properties" or "patches" must be provided')
        }
        const node = this.RED.nodes.node(id)
        if (!node) throw new Error(`Node ${id} not found`)

        const changes = {}

        // Apply line-based patches first (before full property replacement)
        // so that patches reference the original line numbers
        if (hasPatches) {
            this._applyPatches(node, patches, changes)
        }

        // Apply full property replacement
        if (hasProperties) {
            for (const key in properties) {
                if (Object.prototype.hasOwnProperty.call(properties, key)) {
                    if (!(key in changes)) {
                        changes[key] = node[key]
                    }
                }
            }
            Object.assign(node, properties)
        }

        // Syntax-check changed properties that contain JavaScript code.
        // Auto-detects for built-in function nodes; callers can extend via codeProperties param.
        const codeErrors = {}
        const jsProps = new Set(Array.isArray(codeProperties) ? codeProperties : [])
        if (node.type === 'function') {
            jsProps.add('func')
            jsProps.add('initialize')
            jsProps.add('finalize')
        }
        for (const key of jsProps) {
            if (!changes[key]) continue
            const newVal = node[key]
            if (typeof newVal === 'string' && newVal.includes('\n')) {
                try {
                    // eslint-disable-next-line no-new-func, no-unused-vars
                    const _syntaxCheck = new Function(newVal)
                } catch (err) {
                    if (err instanceof SyntaxError) {
                        codeErrors[key] = err.message
                    }
                }
            }
        }

        const wasChanged = node.changed
        this.RED.history.push({ t: 'edit', node, changes, changed: wasChanged, dirty: this.RED.nodes.dirty() })
        node.changed = true
        node.dirty = true
        this.RED.nodes.dirty(true)
        if (this.RED.editor?.validateNode) {
            this.RED.editor.validateNode(node)
        }
        this.RED.view.redraw()
        this.RED.sidebar?.info?.refresh()

        if (this.RED.view.state() !== this.RED.state?.DEFAULT) {
            await this.closeEditorTray()
        }

        return Object.keys(codeErrors).length > 0 ? codeErrors : null
    }

    async closeEditorTray () {
        if (this.RED.view.state() === this.RED.state?.DEFAULT) return true
        const MAX = 10
        let count = 0
        while (count++ < MAX) {
            // eslint-disable-next-line no-undef
            $('.red-ui-tray-toolbar button#node-dialog-cancel').trigger('click')
            await new Promise(resolve => setTimeout(resolve, 300))
            if (this.RED.view.state() === this.RED.state?.DEFAULT) break
        }
        return this.RED.view.state() === this.RED.state?.DEFAULT
    }

    /**
     * Apply line-based patches to string properties of a node.
     * Supports dot-separated property paths (e.g. "rules.0.to" for rules[0].to).
     * @param {Object} node - the node object to patch
     * @param {Array} patches - array of { property, op, start, end?, content? }
     * @param {Object} changes - map to record original values (for history/undo)
     */
    _applyPatches (node, patches, changes) {
        const grouped = {}
        for (const patch of patches) {
            if (!grouped[patch.property]) {
                grouped[patch.property] = []
            }
            grouped[patch.property].push(patch)
        }

        for (const [property, targetPatches] of Object.entries(grouped)) {
            const segments = property.split('.')
            const topLevel = segments[0]
            const hasPath = segments.length > 1

            if (!(topLevel in changes)) {
                changes[topLevel] = hasPath ? JSON.parse(JSON.stringify(node[topLevel])) : node[topLevel]
            }

            let targetValue, setTarget
            if (hasPath) {
                const resolved = this._resolvePath(node[topLevel], segments.slice(1).join('.'))
                targetValue = resolved.parent[resolved.key]
                setTarget = (v) => { resolved.parent[resolved.key] = v }
            } else {
                targetValue = node[property]
                setTarget = (v) => { node[property] = v }
            }
            if (typeof targetValue !== 'string') {
                throw new Error(`Property "${property}" is not a string (got ${targetValue === null ? 'null' : typeof targetValue})`)
            }

            // Auto-detect line separator: some properties use \t (e.g. inject JSONata)
            const sep = targetValue.includes('\t') && !targetValue.includes('\n') ? '\t' : '\n'
            const lines = targetValue.split(sep)
            const lineCount = lines.length

            // Validate all patches before applying any
            for (const p of targetPatches) {
                if (!Number.isInteger(p.start) || p.start < 1) {
                    throw new Error(`Patch "start" must be a positive integer (got ${p.start})`)
                }
                switch (p.op) {
                case 'replace':
                    if (p.end == null) throw new Error('Patch op "replace" requires "end"')
                    if (!Number.isInteger(p.end) || p.end < 1) {
                        throw new Error(`Patch "end" must be a positive integer (got ${p.end})`)
                    }
                    if (p.start > p.end) throw new Error(`Invalid patch range: start ${p.start} > end ${p.end}`)
                    if (p.end > lineCount) {
                        throw new Error(`Patch "end" (${p.end}) exceeds line count (${lineCount}) for property "${property}"`)
                    }
                    if (p.content == null) throw new Error('Patch op "replace" requires "content"')
                    break
                case 'insert':
                    if (p.start > lineCount + 1) {
                        throw new Error(`Insert position "start" (${p.start}) exceeds line count + 1 (${lineCount + 1}) for property "${property}"`)
                    }
                    if (p.content == null) throw new Error('Patch op "insert" requires "content"')
                    break
                case 'delete':
                    if (p.end == null) throw new Error('Patch op "delete" requires "end"')
                    if (!Number.isInteger(p.end) || p.end < 1) {
                        throw new Error(`Patch "end" must be a positive integer (got ${p.end})`)
                    }
                    if (p.start > p.end) throw new Error(`Invalid patch range: start ${p.start} > end ${p.end}`)
                    if (p.end > lineCount) {
                        throw new Error(`Patch "end" (${p.end}) exceeds line count (${lineCount}) for property "${property}"`)
                    }
                    break
                default:
                    throw new Error(`Unknown patch op "${p.op}"`)
                }
            }

            // Check for overlapping ranges (replace/delete only; inserts don't consume lines)
            const rangeOps = targetPatches.filter(p => p.op !== 'insert').sort((a, b) => a.start - b.start)
            for (let i = 1; i < rangeOps.length; i++) {
                const prev = rangeOps[i - 1]
                const curr = rangeOps[i]
                if (curr.start <= prev.end) {
                    throw new Error(
                        `Overlapping patches on property "${property}": ` +
                        `lines ${prev.start}-${prev.end} and ${curr.start}-${curr.end}`
                    )
                }
            }

            // Sort for bottom-up application (highest line numbers first)
            // so that earlier line numbers remain stable as we splice.
            //
            // Secondary sort for same `start`: replace/delete before insert.
            // An insert at line N shifts everything below it, so if a replace/delete
            // also targets line N, it must run first — otherwise it
            // would hit the newly inserted content instead of the original line.
            const descending = [...targetPatches].sort((a, b) => {
                if (b.start !== a.start) return b.start - a.start
                const aIsInsert = a.op === 'insert' ? 1 : 0
                const bIsInsert = b.op === 'insert' ? 1 : 0
                return aIsInsert - bIsInsert
            })

            for (const p of descending) {
                switch (p.op) {
                case 'replace': {
                    const replacementLines = p.content.split('\n')
                    lines.splice(p.start - 1, p.end - p.start + 1, ...replacementLines)
                    break
                }
                case 'insert': {
                    const insertLines = p.content.split('\n')
                    lines.splice(p.start - 1, 0, ...insertLines)
                    break
                }
                case 'delete':
                    lines.splice(p.start - 1, p.end - p.start + 1)
                    break
                }
            }

            setTarget(lines.join(sep))
        }
    }

    /**
     * Resolve a dot-separated path within an object/array structure.
     * Numeric segments index into arrays.
     * @param {*} obj - root value to navigate from
     * @param {string} path - dot-separated path (e.g. "0.to", "rules.2.expression")
     * @returns {{ parent: *, key: string|number }} parent container and final key
     */
    _resolvePath (obj, path) {
        const segments = path.split('.')
        let current = obj
        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i]
            const idx = Number(seg)
            current = Array.isArray(current) && Number.isInteger(idx) ? current[idx] : current[seg]
            if (current == null) {
                throw new Error(`Path segment "${seg}" resolved to ${current}`)
            }
        }
        const lastSeg = segments[segments.length - 1]
        const lastIdx = Number(lastSeg)
        const key = Array.isArray(current) && Number.isInteger(lastIdx) ? lastIdx : lastSeg
        return { parent: current, key }
    }

    /**
     * Read the live canvas state (including undeployed edits) and return it.
     * Uses Node-RED's built-in export to get the complete node set.
     * @returns {Object[]} full flows array (tabs + nodes + config nodes)
     */
    getFlow () {
        return this.RED.nodes.createCompleteNodeSet({ credentials: false })
    }

    /**
     * Navigate to a workspace tab, validating it exists first.
     * @param {string} id - workspace ID to show
     */
    showWorkspace (id) {
        if (!this.hasWorkspace(id)) throw new Error(`Workspace ${id} not found`)
        this.RED.workspaces.show(id)
    }

    /**
     * Check if a workspace tab exists.
     * @param {string} id - workspace ID to check
     * @returns {boolean} true if the workspace exists, false otherwise
     */
    hasWorkspace (id) {
        const ws = this.RED.nodes.workspace(id)
        if (ws) return true
        return false
    }

    closeSearch () { this.RED.search.hide() }

    closeTypeSearch () {
        // RED.typeSearch.hide() alone does NOT invoke the cancelCallback set by
        // RED.view, which cleans up ghost nodes, drag lines, and resets mouse state.
        // Dispatching ESC on the type-search input triggers NR4's keyboard handler
        // (scope "red-ui-type-search") which calls both hide() and cancelCallback().
        try {
            const input = document.getElementById('red-ui-type-search-input')
            if (input) {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }))
                return
            }
        } catch (_) { /* Node.js test env or missing DOM */ }
        this.RED.typeSearch.hide()
    }

    closeActionList () { this.RED.actionList.hide() }

    /**
     * Add a new flow tab with an explicit ID and configuration.
     * @param {Object} tab - tab definition with id, label, disabled, info, env
     */
    addTab (tab) {
        if (tab.label == null) throw new Error('Tab label is required')
        if (tab.id && (this.RED.nodes.node(tab.id) || this.RED.nodes.workspace(tab.id) || this.RED.nodes.subflow(tab.id))) {
            throw new Error(`ID ${tab.id} already exists — provide a unique ID or omit to auto-generate`)
        }
        const ws = {
            type: 'tab',
            id: tab.id || this.RED.nodes.id(),
            label: tab.label,
            disabled: tab.disabled || false,
            info: tab.info || '',
            env: tab.env || []
        }
        this.RED.nodes.addWorkspace(ws)
        this.RED.workspaces.add(ws)
        this.RED.history.push({ t: 'add', workspaces: [ws], dirty: this.RED.nodes.dirty() })
        this.RED.nodes.dirty(true)
        this.showWorkspace(ws.id)
        return this.RED.nodes.workspace(ws.id)
    }

    /**
     * Remove an existing flow tab from the NR4 editor.
     * @param {string} id - tab ID to remove
     */
    removeTab (id) {
        const ws = this.RED.nodes.workspace(id)
        if (!ws) {
            throw new Error(`Tab with id ${id} not found`)
        }
        if (ws.locked) {
            throw new Error(`Tab ${id} is locked and cannot be removed`)
        }
        this.RED.workspaces.delete(ws)
    }

    /**
     * Add one or more nodes to the live NR4 canvas.
     * Delegates to RED.view.importNodes which handles node initialisation,
     * history (undo/redo) and view updates internally.
     * @param {Object[]} nodes - array of raw node objects (must include id, type; z required for non-config nodes)
     * @param {Object} [options]
     * @param {boolean} [options.generateIds=false] - regenerate node IDs during import
     */
    addNodes (nodes, { generateIds = false } = {}) {
        if (!nodes.length) throw new Error('nodes array must not be empty')
        // Validate required fields and types
        const prepared = nodes.map(rawNode => {
            if (!rawNode.id) throw new Error('Node is missing required property: id')
            if (!rawNode.type) throw new Error('Node is missing required property: type')
            const def = this.RED.nodes.getType(rawNode.type)
            if (!def) throw new Error(`Unknown node type: ${rawNode.type}`)
            const isConfigNode = def.category === 'config'
            if (!isConfigNode && !rawNode.z) throw new Error('Node is missing required property: z')
            return { ...rawNode }
        })
        // Validate all target tabs exist and are not locked
        const uniqueZs = [...new Set(prepared.map(n => n.z).filter(Boolean))]
        for (const z of uniqueZs) {
            if (!this.hasWorkspace(z)) throw new Error(`Workspace tab ${z} not found`)
            const ws = this.RED.nodes.workspace(z)
            if (ws.locked) throw new Error(`Workspace tab ${z} is locked`)
        }
        // Pre-import: reject if any node ID already exists on the canvas
        if (!generateIds) {
            const existing = prepared.filter(n => this.RED.nodes.node(n.id))
            if (existing.length > 0) {
                throw new Error(`Node ID(s) already exist: ${existing.map(n => n.id).join(', ')} — use generateIds: true to auto-assign new IDs`)
            }
        }
        this.RED.view.importNodes(prepared, { generateIds, addFlow: false, notify: false, touchImport: true, applyNodeDefaults: true })
        this.RED.nodes.dirty(true)
    }

    /**
     * Remove one or more nodes from the live NR4 canvas by ID.
     * @param {string[]} ids - node IDs to remove
     */
    removeNodes (ids) {
        // Resolve all nodes once and check for missing
        const nodes = ids.map(id => {
            const node = this.RED.nodes.node(id)
            if (!node) throw new Error(`Node ${id} not found`)
            return node
        })
        // Check if any node's workspace is locked
        for (const node of nodes) {
            if (node.z && this.RED.workspaces.isLocked(node.z)) {
                throw new Error(`Cannot remove node ${node.id} — workspace ${node.z} is locked`)
            }
        }
        const allRemovedLinks = []
        for (const node of nodes) {
            const removed = this.RED.nodes.remove(node.id)
            allRemovedLinks.push(...(removed.links || []))
        }
        this.RED.history.push({ t: 'delete', nodes, links: allRemovedLinks, dirty: this.RED.nodes.dirty() })
        this.RED.nodes.dirty(true)
        this.RED.view.updateActive()
        this.RED.view.redraw()
    }

    /**
     * Add or remove a single wire between two nodes.
     * @param {object} params
     * @param {'add'|'remove'} params.mode
     * @param {string} params.source - Source node ID
     * @param {number} [params.output] - Source output port index (0-based, defaults to 0)
     * @param {string} params.target - Target node ID
     */
    setWires ({ mode, source, output, target }) {
        if (source === target) throw new Error('Cannot wire a node to itself')
        const sourceNode = this.RED.nodes.node(source)
        if (!sourceNode) throw new Error(`Source node ${source} not found`)
        const targetNode = this.RED.nodes.node(target)
        if (!targetNode) throw new Error(`Target node ${target} not found`)
        // Source and target must be on the same tab
        if (sourceNode.z !== targetNode.z) {
            throw new Error('Source and target nodes must be on the same tab')
        }
        // Check workspace is not locked
        if (sourceNode.z && this.RED.workspaces.isLocked(sourceNode.z)) {
            throw new Error(`Cannot modify wires — workspace ${sourceNode.z} is locked`)
        }
        // Validate output port exists on source
        const port = output ?? 0
        if (port >= (sourceNode.outputs || 0)) {
            throw new Error(`Source node ${source} does not have output port ${port}`)
        }
        // Validate target accepts inputs
        const targetDef = this.RED.nodes.getType(targetNode.type)
        if (targetDef && targetDef.inputs === 0) {
            throw new Error(`Target node ${target} (${targetNode.type}) does not accept inputs`)
        }
        const existingLinks = this.RED.nodes.getNodeLinks(source)
        const wasDirty = this.RED.nodes.dirty()
        if (mode === 'add') {
            // Check wire doesn't already exist
            const duplicate = existingLinks.find(l =>
                l.source?.id === source && l.sourcePort === port && l.target?.id === target
            )
            if (duplicate) throw new Error(`Wire already exists from ${source} port ${port} to ${target}`)
            const link = { source: sourceNode, sourcePort: port, target: targetNode }
            this.RED.nodes.addLink(link)
            this.RED.history.push({ t: 'add', links: [link], dirty: wasDirty })
        } else {
            const link = existingLinks.find(l =>
                l.source?.id === source && l.sourcePort === port && l.target?.id === target
            )
            if (!link) {
                throw new Error(`Wire not found from ${source} port ${port} to ${target}`)
            }
            this.RED.nodes.removeLink(link)
            this.RED.history.push({ t: 'delete', links: [link], dirty: wasDirty })
        }
        sourceNode.dirty = true
        this.RED.nodes.dirty(true)
        this.RED.view.updateActive()
        this.RED.view.redraw()
    }

    /**
     * Add or remove a virtual link between link nodes (link out → link in, link call → link in).
     * For link out ↔ link in, the connection is bidirectional (both nodes' `links` arrays are updated).
     * For link call → link in, only the link call node's `links` array is updated.
     * @param {object} params
     * @param {'add'|'remove'} params.mode
     * @param {string} params.source - Source link node ID (link out or link call)
     * @param {string} params.target - Target link node ID (link in)
     */
    setLinks ({ mode, source, target }) {
        if (source === target) throw new Error('Cannot link a node to itself')
        const sourceNode = this.RED.nodes.node(source)
        if (!sourceNode) throw new Error(`Source node ${source} not found`)
        const targetNode = this.RED.nodes.node(target)
        if (!targetNode) throw new Error(`Target node ${target} not found`)
        // Validate types: source must be link out or link call, target must be link in
        if (sourceNode.type !== 'link out' && sourceNode.type !== 'link call') {
            throw new Error(`Source node ${source} must be a link out or link call node (got ${sourceNode.type})`)
        }
        if (targetNode.type !== 'link in') {
            throw new Error(`Target node ${target} must be a link in node (got ${targetNode.type})`)
        }
        // link out in "return" mode cannot have outbound links
        if (sourceNode.type === 'link out' && sourceNode.mode === 'return') {
            throw new Error(`Source node ${source} is a link out in return mode and cannot have outbound links`)
        }
        // link call in "dynamic" mode cannot have static links
        if (sourceNode.type === 'link call' && sourceNode.linkType === 'dynamic') {
            throw new Error(`Source node ${source} is a link call in dynamic mode and cannot have static links`)
        }
        // Check workspace locks for both nodes
        if (sourceNode.z && this.RED.workspaces.isLocked(sourceNode.z)) {
            throw new Error(`Cannot modify links — workspace ${sourceNode.z} is locked`)
        }
        if (targetNode.z && targetNode.z !== sourceNode.z && this.RED.workspaces.isLocked(targetNode.z)) {
            throw new Error(`Cannot modify links — workspace ${targetNode.z} is locked`)
        }
        const isBidirectional = sourceNode.type === 'link out'
        const sourceLinks = sourceNode.links || []
        const targetLinks = targetNode.links || []
        const wasDirty = this.RED.nodes.dirty()
        const wasSourceChanged = sourceNode.changed
        const wasTargetChanged = targetNode.changed
        const editHistories = []
        if (mode === 'add') {
            if (sourceLinks.includes(target)) {
                throw new Error(`Link already exists from ${source} to ${target}`)
            }
            // Record history before mutating
            editHistories.push({ t: 'edit', node: sourceNode, changes: { links: [...sourceLinks] }, changed: wasSourceChanged })
            // link call can only have one target — replace instead of append
            sourceNode.links = sourceNode.type === 'link call' ? [target] : [...sourceLinks, target]
            if (isBidirectional) {
                editHistories.push({ t: 'edit', node: targetNode, changes: { links: [...targetLinks] }, changed: wasTargetChanged })
                targetNode.links = [...targetLinks, source]
            }
        } else {
            if (!sourceLinks.includes(target)) {
                throw new Error(`Link not found from ${source} to ${target}`)
            }
            editHistories.push({ t: 'edit', node: sourceNode, changes: { links: [...sourceLinks] }, changed: wasSourceChanged })
            sourceNode.links = sourceLinks.filter(id => id !== target)
            if (isBidirectional) {
                editHistories.push({ t: 'edit', node: targetNode, changes: { links: [...targetLinks] }, changed: wasTargetChanged })
                targetNode.links = targetLinks.filter(id => id !== source)
            }
        }
        sourceNode.changed = true
        sourceNode.dirty = true
        if (isBidirectional) {
            targetNode.changed = true
            targetNode.dirty = true
        }
        this.RED.history.push({ t: 'multi', events: editHistories, dirty: wasDirty })
        this.RED.nodes.dirty(true)
        if (this.RED.editor?.validateNode) {
            this.RED.editor.validateNode(sourceNode)
            this.RED.editor.validateNode(targetNode)
        }
        // Refresh selection to update virtual link wires on the canvas
        const selection = this.RED.view.selection()
        if (selection?.nodes) {
            this.RED.view.select({ nodes: selection.nodes })
        }
        this.RED.view.redraw()
    }

    get supportedActions () {
        return this.actions
    }

    hasAction (actionName) {
        return !!this.supportedActions[actionName]
    }

    /**
     * Invoke an action by name with the provided parameters, and mutate the provided result object with the outcome of the action execution
     * @param {ExpertAutomationsActionsEnum} actionName
     * @param {Object} data
     * @param {Object} data.event - the original event object received from the assistant interface, used for replying to the correct message thread
     * @param {Object} data.params - the parameters to execute the action with (see supportedActions for details on expected parameters for each action)
     * @param {{[key:string]: any, success:boolean, handled:boolean}} result - an optional object that, if provided, will be mutated to include the result of the action execution
     * @returns {void}
     */
    async invokeAction (actionName, { event, params } = {}, result = {}) {
        if (!this.hasAction(actionName)) {
            throw new Error(`Action ${actionName} not found`)
        }
        result.handled = true // default to handled=true (set to false in default case below if action is not implemented)
        switch (actionName) {
        case SELECT_NODES: {
            const _nodes = this.selectNodes(params.id || params.ids, params.include)
            if (!_nodes || _nodes.length === 0) {
                result.success = false
                result.error = new Error('No nodes found to select with the provided parameters')
                return
            }
            result.nodes = this._formatNodes(_nodes, params.options?.includeModuleConfig)
            result.success = true
        }
            break
        case GET_NODES: {
            const _nodes = this.getNodes(params.id || params.ids, params.include)
            if (!_nodes || _nodes.length === 0) {
                result.success = false
                result.error = new Error('No nodes found with the provided parameters')
                return
            }
            result.nodes = this._formatNodes(_nodes, params.options?.includeModuleConfig)
            result.success = true
        }
            break
        case EDIT_NODE: {
            const selectedNode = this.editNode(params.id || '')
            result.node = this._formatNodes([selectedNode], params.options?.includeModuleConfig)[0] || null
            result.success = true
        }
            break
        case SEARCH: {
            const searchResults = this.search(params.query, params.interactive)
            if (!params.interactive) {
                result.results = []
                for (let index = 0; index < searchResults.length; index++) {
                    const searchResult = searchResults[index]
                    searchResult.node = this._formatNodes([searchResult.node], params.options?.includeModuleConfig)[0] || null
                    result.results.push(searchResult)
                }
            }
            result.success = true
        }
            break
        case ADD_FLOW_TAB: {
            const newFlowTab = await this.addFlowTab(params?.title || undefined)
            result.tab = this._formatNodes([newFlowTab], params.options?.includeModuleConfig)[0] || null
            result.success = true
        }
            break

        case UPDATE_NODE: {
            // Capture pre-patch line counts so the agent can see what it was working with
            const preUpdateLineCounts = {}
            if (Array.isArray(params.patches) && params.patches.length > 0) {
                const currentNode = this.RED.nodes.node(params.id)
                if (currentNode) {
                    const patchedTopLevel = [...new Set(params.patches.map(p => p.property.split('.')[0]))]
                    for (const prop of patchedTopLevel) {
                        const val = currentNode[prop]
                        if (typeof val === 'string') {
                            preUpdateLineCounts[prop] = val.split('\n').length
                        }
                    }
                }
            }
            const codeErrors = await this.updateNode(params.id, params.properties, params.patches, params.codeProperties)
            const updatedNode = this.RED.nodes.node(params.id)
            result.node = this._formatNodes([updatedNode], params.options?.includeModuleConfig)[0] || null
            result.validation = this._getNodeValidation(updatedNode)
            if (codeErrors) {
                if (!result.validation) result.validation = {}
                result.validation.valid = false
                result.validation.codeErrors = codeErrors
            }
            if (Object.keys(preUpdateLineCounts).length > 0) {
                result.preUpdateLineCounts = preUpdateLineCounts
            }
            result.success = true
        }
            break

        case SHOW_WORKSPACE: {
            this.showWorkspace(params.id)
            const ws = this.RED.nodes.workspace(params.id)
            result.workspace = ws ? { id: ws.id, label: ws.label } : null
            result.success = true
        }
            break

        case GET_FLOW:
            result.flows = this.getFlow()
            if (result.flows && Array.isArray(result.flows) && result.flows.length > 0) {
                if (params.type) {
                    // filter by type if specified (e.g. "tab", "subflow", or any node type)
                    result.flows = result.flows.filter(f => f.type === params.type)
                }
                if (params.tabId) {
                    // filter by parent tab ID if specified (for nodes/config nodes)
                    result.flows = result.flows.filter(f => f.z === params.tabId)
                }
            }
            result.success = true
            break

        case LIST_WORKSPACES: {
            const workspaceIds = this.RED.nodes.getWorkspaceOrder()
            const tabs = workspaceIds.map(id => this.RED.nodes.workspace(id))
            const sanitized = tabs.map(t => ({ id: t.id, label: t.label, disabled: t.disabled, info: t.info, locked: t.locked, contentsChanged: t.contentsChanged }))
            const selectedWorkspaces = this.RED.workspaces.selection() || []
            sanitized.forEach(t => {
                t.hidden = this.RED.workspaces.isHidden(t.id)
                t.isActiveWorkspace = this.RED.workspaces.active() === t.id
                t.isSelected = t.isActiveWorkspace || selectedWorkspaces.includes(t.id)
            })
            result.workspaces = sanitized
            result.success = true
        }
            break

        case CLOSE_SEARCH:
            this.closeSearch()
            result.success = true
            break

        case CLOSE_TYPE_SEARCH:
            this.closeTypeSearch()
            result.success = true
            break

        case CLOSE_ACTION_LIST:
            this.closeActionList()
            result.success = true
            break

        case ADD_TAB: {
            const newTab = this.addTab(params)
            result.tab = this._formatNodes([newTab], params.options?.includeModuleConfig)[0] || null
            result.success = true
        }
            break

        case REMOVE_TAB: {
            const ws = this.RED.nodes.workspace(params.id)
            const tab = ws ? this._formatNodes([ws], params.options?.includeModuleConfig)[0] : null
            this.removeTab(params.id)
            result.tab = tab
            result.success = true
        }
            break

        case ADD_NODES: {
            this.addNodes(params.nodes, { generateIds: params.generateIds ?? false })
            const addedNodes = params.nodes.map(n => this.RED.nodes.node(n.id)).filter(Boolean)
            if (this.RED.editor?.validateNode) {
                addedNodes.forEach(n => this.RED.editor.validateNode(n))
            }
            result.nodes = this._formatNodes(addedNodes, params.options?.includeModuleConfig)
            result.validation = addedNodes.map(n => ({ id: n.id, ...this._getNodeValidation(n) })).filter(v => v.valid === false)
            result.success = true
        }
            break

        case REMOVE_NODES: {
            const nodesToRemove = params.ids.map(id => this.RED.nodes.node(id)).filter(Boolean)
            const nodes = this._formatNodes(nodesToRemove, params.options?.includeModuleConfig)
            this.removeNodes(params.ids)
            result.nodes = nodes
            result.success = true
        }
            break

        case SET_WIRES:
            this.setWires(params)
            result.wires = { mode: params.mode, source: params.source, output: params.output, target: params.target }
            result.success = true
            break

        case SET_LINKS:
            this.setLinks(params)
            result.links = { mode: params.mode, source: params.source, target: params.target }
            result.success = true
            break

        case IMPORT_FLOW: {
            const imported = this.importFlow(params.flow, { addFlow: params.addFlowTab, generateIds: params.generateIds ?? true })
            const importedNodes = Array.isArray(imported) ? imported : []
            if (this.RED.editor?.validateNode) {
                importedNodes.forEach(n => this.RED.editor.validateNode(n))
            }
            result.nodes = importedNodes.length > 0 ? this._formatNodes(importedNodes, params.options?.includeModuleConfig) : []
            result.validation = importedNodes.map(n => ({ id: n.id, ...this._getNodeValidation(n) })).filter(v => v.valid === false)
            result.success = true
        }
            break

        case CLOSE_EDITOR_TRAY:
            result.closed = await this.closeEditorTray()
            result.success = true
            break
        case GET_NODE_TYPE: {
            const def = this.RED.nodes.getType(params.type)
            if (!def) {
                result.success = false
                result.error = `Node type "${params.type}" is not installed in this Node-RED instance`
                return
            }
            const rawDefaults = def.defaults || {}
            result.nodeType = params.type
            result.defaults = JSON.parse(JSON.stringify(rawDefaults, (key, value) =>
                typeof value === 'function' ? value.toString() : value
            ))
            result.label = typeof def.label === 'function' ? def.label.toString() : (def.label || params.type)
            result.category = def.category || null
            result.color = def.color || null
            result.inputs = def.inputs ?? 0
            result.outputs = def.outputs ?? 0
            result.success = true
        }
            break
        case LIST_NODE_PACKAGES: {
            const typedSet = new Set(Array.isArray(params?.typedModules) ? params.typedModules : [])
            const nodeList = this.RED.nodes.registry.getNodeList()
            const packages = {}
            for (const ns of nodeList) {
                if (!packages[ns.module]) {
                    packages[ns.module] = { version: ns.version, enabled: ns.enabled !== false, module: ns.module, hasSchema: typedSet.has(ns.module), nodeCount: 0 }
                }
                if (ns.enabled === false) packages[ns.module].enabled = false
                packages[ns.module].nodeCount += (Array.isArray(ns.types) ? ns.types.length : 0)
            }
            result.packages = Object.values(packages)
            result.success = true
        }
            break
        case LIST_CONFIG_NODES: {
            const configNodes = []
            this.RED.nodes.eachConfig(configNode => {
                if (params?.type && configNode.type !== params.type) return
                configNodes.push(configNode)
            })
            result.configNodes = this._formatNodes(configNodes, false)
            result.success = true
        }
            break
        default:
            result.handled = false
            result.success = false
            throw new Error(`Action ${actionName} not implemented`)
        }
    }

    _formatNodes (nodes, includeModuleConfig = true) {
        return this.RED.nodes.createExportableNodeSet(nodes, { includeModuleConfig })
    }

    /**
     * RED.editor.validateNode(node) is a side-effect function that sets:
     *   - node.valid (boolean)
     *   - node.validationErrors (string[] — property names or custom error messages)
     * It checks each property against node._def.defaults validators: required fields,
     * custom validators, config node refs, and credentials. For subflow instances it
     * cascades into the subflow definition and all internal nodes.
     */
    _getNodeValidation (node) {
        if (!node || typeof node.valid === 'undefined') return null
        const result = { valid: node.valid }
        if (Array.isArray(node.validationErrors) && node.validationErrors.length > 0) {
            result.validationErrors = node.validationErrors
        }
        return result
    }
}
