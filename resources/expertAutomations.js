import { ExpertActionsInterface } from './expertActionsInterface.js'

// Actions supported by this module (namespace/action-name):
const SELECT_NODES = 'automation/select-nodes'
const GET_NODES = 'automation/get-nodes'
const EDIT_NODE = 'automation/open-node-edit'
const SEARCH = 'automation/search'
const ADD_FLOW_TAB = 'automation/add-flow-tab'
const ADD_NODES = 'automation/add-nodes'
const REMOVE_NODES = 'automation/remove-nodes'
const UPDATE_NODE = 'automation/update-node'
const SET_WIRES = 'automation/set-wires'
const ADD_TAB = 'automation/add-tab'
const REMOVE_TAB = 'automation/remove-tab'
const GET_FLOW = 'automation/get-flow'

/**
 * @typedef {SELECT_NODES|GET_NODES|EDIT_NODE|SEARCH|ADD_FLOW_TAB|ADD_NODES|REMOVE_NODES|UPDATE_NODE|SET_WIRES|ADD_TAB|REMOVE_TAB|GET_FLOW} ExpertAutomationsActionsEnum
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
        // @deprecated — may be removed in favour of automation/add-tab, which accepts an
        // explicit id and generalises to both UI-initiated and MCP-driven tab creation.
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
                            required: ['id', 'type', 'z']
                        },
                        description: 'Array of node objects to add to the canvas'
                    }
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
        [UPDATE_NODE]: {
            params: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'ID of the node to update'
                    },
                    properties: {
                        type: 'object',
                        description: 'Key-value pairs to merge into the node object'
                    }
                },
                required: ['id', 'properties']
            }
        },
        [SET_WIRES]: {
            params: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'ID of the source node'
                    },
                    wires: {
                        type: 'array',
                        items: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        description: 'Wires indexed by output port — wires[portIndex] is an array of target node IDs'
                    }
                },
                required: ['id', 'wires']
            }
        },
        [ADD_TAB]: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Tab ID — auto-generated if omitted' },
                    label: { type: 'string', description: 'Tab label' },
                    disabled: { type: 'boolean', description: 'Create as disabled' },
                    info: { type: 'string', description: 'Tab notes' },
                    env: { type: 'array', description: 'Environment variables' }
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
        [GET_FLOW]: {
            params: null
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

    /**
     * Add a new flow tab via the NR core action system.
     * Uses core:add-flow (auto-named) or imports a tab node with the given title.
     * Returns the created tab node.
     *
     * @deprecated May be removed in favour of addTab(), which accepts an explicit id
     * and covers both UI-initiated and MCP-driven tab creation. addTab() now
     * auto-generates an id when one is not provided.
     * @param {string} [title] - optional tab label
     * @returns {Promise<Object|null>} the created tab node
     */
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
            this.RED.workspaces.show(newTab.id)
        }
        return newTab
    }

    /**
     * Add one or more nodes to the live NR4 canvas.
     *
     * Raw JSON from MCP tools is not directly usable with RED.nodes.add() — it skips
     * setting inputs/outputs, _config, and _def, which causes missing port handles and
     * the orange misconfigured triangle. This method mirrors what RED.nodes.importNodes()
     * does internally.
     * @param {Object[]} nodes - array of raw node objects (must include id, type, z)
     */
    addNodes (nodes) {
        for (const rawNode of nodes) {
            const def = this.RED.nodes.getType(rawNode.type)
            if (!def) throw new Error(`Unknown node type: ${rawNode.type}`)

            const node = {
                id: rawNode.id,
                type: rawNode.type,
                x: parseFloat(rawNode.x || 0),
                y: parseFloat(rawNode.y || 0),
                z: rawNode.z,
                name: rawNode.name || '',
                changed: true,
                wires: [], // links are set separately via automation/set-wires
                _config: {},
                _def: def,
                inputs: def.inputs || 0,
                outputs: def.outputs || 0
            }

            // Copy properties declared in _def.defaults and populate _config for
            // validation to pass (prevents the orange triangle)
            for (const d in def.defaults) {
                if (Object.prototype.hasOwnProperty.call(def.defaults, d) && d !== 'inputs' && d !== 'outputs') {
                    node[d] = rawNode[d]
                    node._config[d] = JSON.stringify(rawNode[d])
                }
            }
            node._config.x = node.x
            node._config.y = node.y

            // Handle nodes with dynamic inputs/outputs (e.g. function node)
            if (Object.prototype.hasOwnProperty.call(rawNode, 'outputs') && def.defaults && Object.prototype.hasOwnProperty.call(def.defaults, 'outputs')) {
                node.outputs = parseInt(rawNode.outputs, 10) || def.outputs || 0
                node._config.outputs = JSON.stringify(rawNode.outputs)
            }
            if (Object.prototype.hasOwnProperty.call(rawNode, 'inputs') && def.defaults && Object.prototype.hasOwnProperty.call(def.defaults, 'inputs')) {
                node.inputs = parseInt(rawNode.inputs, 10) || def.inputs || 0
                node._config.inputs = JSON.stringify(rawNode.inputs)
            }

            node._ = def._
            this.RED.nodes.add(node)
            // importNodes calls RED.editor.validateNode() after add — we must too,
            // otherwise node.valid stays undefined and NR renders the orange triangle
            if (this.RED.editor?.validateNode) {
                this.RED.editor.validateNode(node)
            }
        }

        this.RED.nodes.dirty(true)

        // Refresh the view — activeNodes is only rebuilt on workspace:change
        const targetTabId = nodes[0]?.z
        const currentTab = this.RED.workspaces.active()
        if (targetTabId && targetTabId !== currentTab) {
            // Switching tab fires workspace:change automatically
            this.RED.workspaces.show(targetTabId)
        } else {
            const tab = targetTabId || currentTab
            this.RED.events.emit('workspace:change', { old: tab, workspace: tab })
        }
    }

    /**
     * Remove one or more nodes from the live NR4 canvas by ID.
     * @param {string[]} ids - node IDs to remove
     */
    removeNodes (ids) {
        for (const id of ids) {
            const node = this.RED.nodes.node(id)
            if (node) {
                this.RED.nodes.remove(node)
            }
        }
        this.RED.nodes.dirty(true)
        const currentTab = this.RED.workspaces.active()
        this.RED.events.emit('workspace:change', { old: currentTab, workspace: currentTab })
    }

    /**
     * Update properties of an existing node in place.
     * @param {string} id - node ID
     * @param {Object} properties - key-value pairs to merge into the node
     */
    updateNode (id, properties) {
        const node = this.RED.nodes.node(id)
        if (!node) throw new Error(`Node ${id} not found`)
        Object.assign(node, properties)
        node.dirty = true
        this.RED.nodes.dirty(true)
        if (this.RED.editor?.validateNode) {
            this.RED.editor.validateNode(node)
        }
        this.RED.view.redraw()
    }

    /**
     * Replace all outbound wires from a node.
     *
     * NR4 stores wires as link objects {source, sourcePort, target}, not as node.wires
     * arrays. Setting node.wires directly has no effect on the canvas.
     * @param {string} id - source node ID
     * @param {string[][]} wires - wires[portIndex] = array of target node IDs
     */
    setWires (id, wires) {
        const node = this.RED.nodes.node(id)
        if (!node) throw new Error(`Node ${id} not found`)

        // Remove all existing outbound links then add new ones
        const existingLinks = this.RED.nodes.getNodeLinks(id)
        existingLinks.forEach(link => this.RED.nodes.removeLink(link))
        ;(wires || []).forEach((targets, outputPort) => {
            ;(targets || []).forEach(targetId => {
                const targetNode = this.RED.nodes.node(targetId)
                if (targetNode) {
                    this.RED.nodes.addLink({ source: node, sourcePort: outputPort, target: targetNode })
                }
            })
        })

        node.dirty = true
        this.RED.nodes.dirty(true)
        // activeLinks is refreshed by workspace:change — emit it to redraw wires
        const currentTab = this.RED.workspaces.active()
        this.RED.events.emit('workspace:change', { old: currentTab, workspace: currentTab })
    }

    /**
     * Add a new flow tab with an explicit ID and configuration.
     * For MCP-driven tab creation where the server specifies the exact tab ID
     * (so subsequent node placements can reference it via their z property).
     *
     * RED.workspaces.add() alone only adds to the tab bar UI and skips
     * RED.nodes.addWorkspace(), causing RED.nodes.workspace(id) to return null
     * on workspace:change and setting activeFlowLocked=true (wires broken).
     * @param {Object} tab - tab definition with id, label, disabled, info, env
     */
    addTab (tab) {
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
    }

    /**
     * Remove an existing flow tab from the NR4 editor.
     * @param {string} id - tab ID to remove
     */
    removeTab (id) {
        const ws = this.RED.nodes.workspace(id)
        if (ws) {
            this.RED.workspaces.delete(ws)
        }
    }

    /**
     * Read the live canvas state (including undeployed edits) and return it.
     *
     * NR4 does not maintain node.wires after registration — wires are stored as
     * link objects. This method reconstructs wires from RED.nodes.getNodeLinks().
     * @returns {Object[]} full flows array (tabs + nodes + config nodes)
     */
    getFlow () {
        const flows = []

        this.RED.nodes.eachWorkspace(ws => {
            flows.push({ id: ws.id, type: 'tab', label: ws.label, disabled: ws.disabled || false })
        })

        this.RED.nodes.eachNode(node => {
            const plain = { id: node.id, type: node.type, z: node.z, name: node.name }
            if (node.x !== undefined) plain.x = node.x
            if (node.y !== undefined) plain.y = node.y

            // Reconstruct wires from link objects — reading node.wires returns stale/empty data
            if (node.outputs > 0) {
                const wires = Array.from({ length: node.outputs }, () => [])
                this.RED.nodes.getNodeLinks(node.id).forEach(link => {
                    if (link.source?.id === node.id && wires[link.sourcePort]) {
                        wires[link.sourcePort].push(link.target.id)
                    }
                })
                plain.wires = wires
            } else {
                plain.wires = []
            }

            // Copy user-edited property values from _config
            if (node._config) {
                for (const k of Object.keys(node._config)) {
                    if (k !== 'x' && k !== 'y' && plain[k] === undefined) {
                        try { plain[k] = JSON.parse(node._config[k]) } catch { plain[k] = node._config[k] }
                    }
                }
            }

            flows.push(plain)
        })

        return flows
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
        case ADD_NODES:
            this.addNodes(params.nodes)
            result.success = true
            break
        case REMOVE_NODES:
            this.removeNodes(params.ids)
            result.success = true
            break
        case UPDATE_NODE:
            this.updateNode(params.id, params.properties)
            result.success = true
            break
        case SET_WIRES:
            this.setWires(params.id, params.wires)
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
        case GET_FLOW:
            result.flows = this.getFlow()
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
