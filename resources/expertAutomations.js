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
const CLOSE_SEARCH = 'automation/close-search'
const CLOSE_TYPE_SEARCH = 'automation/close-type-search'
const CLOSE_ACTION_LIST = 'automation/close-action-list'
const ADD_TAB = 'automation/add-tab'
const REMOVE_TAB = 'automation/remove-tab'
const ADD_NODES = 'automation/add-nodes'

/**
 * @typedef {SELECT_NODES|GET_NODES|EDIT_NODE|SEARCH|ADD_FLOW_TAB|UPDATE_NODE|SHOW_WORKSPACE|GET_FLOW|CLOSE_SEARCH|CLOSE_TYPE_SEARCH|CLOSE_ACTION_LIST|ADD_TAB|REMOVE_TAB|ADD_NODES} ExpertAutomationsActionsEnum
 */

export class ExpertAutomations extends ExpertActionsInterface {
    actions = Object.freeze({
        [GET_NODES]: {
            params: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The ID of a single node to retrieve'
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
                        enum: ['upstream', 'downstream', 'connected', null],
                        default: null, // single node
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
                        enum: ['upstream', 'downstream', 'connected', null],
                        default: null, // single node
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
                    properties: { type: 'object', description: 'Key-value pairs to merge into the node object' }
                },
                required: ['id', 'properties']
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
                                name: { type: 'string' },
                                value: { type: 'string' },
                                type: { type: 'string' }
                            }
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
                                z: { type: 'string', description: 'Tab (workspace) ID' }
                            },
                            additionalProperties: true,
                            required: ['id', 'type', 'z']
                        },
                        description: 'Array of node objects to add to the canvas'
                    },
                    generateIds: { type: 'boolean', description: 'Regenerate node IDs during import (use if IDs may conflict). Default: false', default: false }
                },
                required: ['nodes']
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
     * @param {string} nodesStr the nodes to import as a string
     * @param {object} importOptions
     * @param {boolean} importOptions.addFlow whether to add the nodes to a new flow or to the current flow
     * @param {boolean} [importOptions.notify=true] whether to show notifications for import success/failure (default true)
     */
    importFlow (nodesStr, { addFlow = false, generateIds = true, notify = true } = { addFlow: false, generateIds: true, notify: true }) {
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
        }
        this.RED.view.importNodes(newNodes, { generateIds, addFlow, notify })
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
     * @param {string} id - node ID
     * @param {Object} properties - key-value pairs to merge into the node
     */
    updateNode (id, properties) {
        const node = this.RED.nodes.node(id)
        if (!node) throw new Error(`Node ${id} not found`)
        const changes = {}
        for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                changes[key] = node[key]
            }
        }
        const wasChanged = node.changed
        Object.assign(node, properties)
        this.RED.history.push({ t: 'edit', node, changes, changed: wasChanged, dirty: this.RED.nodes.dirty() })
        node.changed = true
        node.dirty = true
        this.RED.nodes.dirty(true)
        if (this.RED.editor?.validateNode) {
            this.RED.editor.validateNode(node)
        }
        this.RED.view.redraw()
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
        const ws = this.RED.nodes.workspace(id)
        if (!ws) throw new Error(`Workspace ${id} not found`)
        this.RED.workspaces.show(id)
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
     * @param {Object[]} nodes - array of raw node objects (must include id, type, z)
     * @param {Object} [options]
     * @param {boolean} [options.generateIds=false] - regenerate node IDs during import
     */
    addNodes (nodes, { generateIds = false } = {}) {
        // Validate required fields and types
        const prepared = nodes.map(rawNode => {
            if (!rawNode.id) throw new Error('Node is missing required property: id')
            if (!rawNode.type) throw new Error('Node is missing required property: type')
            if (!rawNode.z) throw new Error('Node is missing required property: z')
            const def = this.RED.nodes.getType(rawNode.type)
            if (!def) throw new Error(`Unknown node type: ${rawNode.type}`)
            return { ...rawNode }
        })
        // Validate target tab exists before switching
        const targetZ = prepared[0]?.z
        if (targetZ) {
            const targetWs = this.RED.nodes.workspace(targetZ)
            if (!targetWs) throw new Error(`Target tab ${targetZ} not found`)
        }
        // importNodes places nodes on the active workspace when addFlow=false,
        // so switch to the target tab first if nodes target a different one
        const activeZ = this.RED.workspaces.active()
        if (targetZ && targetZ !== activeZ) {
            this.showWorkspace(targetZ)
        }
        this.RED.view.importNodes(prepared, { generateIds, addFlow: false, notify: false, touchImport: true, applyNodeDefaults: true })
        // Validate import actually succeeded (only when IDs are known)
        if (!generateIds) {
            const missing = prepared.filter(n => !this.RED.nodes.node(n.id))
            if (missing.length > 0) {
                throw new Error(`Failed to add node(s): ${missing.map(n => n.id).join(', ')} — IDs may already exist. Retry with generateIds: true`)
            }
        }
        this.RED.nodes.dirty(true)
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
            result.node = this._formatNodes([selectedNode], false)[0] || null
            result.success = true
        }
            break
        case SEARCH: {
            const searchResults = this.search(params.query, params.interactive)
            if (!params.interactive) {
                result.results = []
                for (let index = 0; index < searchResults.length; index++) {
                    const searchResult = searchResults[index]
                    searchResult.node = this._formatNodes([searchResult.node], false)[0] || null
                    result.results.push(searchResult)
                }
            }
            result.success = true
        }
            break
        case ADD_FLOW_TAB: {
            const newFlowTab = await this.addFlowTab(params?.title || undefined)
            result.tab = this._formatNodes([newFlowTab], false)[0] || null
            result.success = true
        }
            break

        case UPDATE_NODE:
            this.updateNode(params.id, params.properties)
            result.success = true
            break

        case SHOW_WORKSPACE:
            this.showWorkspace(params.id)
            result.success = true
            break

        case GET_FLOW:
            result.flows = this.getFlow()
            result.success = true
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

        case ADD_TAB:
            this.addTab(params)
            result.success = true
            break

        case REMOVE_TAB:
            this.removeTab(params.id)
            result.success = true
            break

        case ADD_NODES:
            this.addNodes(params.nodes, { generateIds: params.generateIds ?? false })
            result.success = true
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
}
