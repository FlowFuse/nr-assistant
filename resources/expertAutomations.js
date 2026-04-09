import { ExpertActionsInterface } from './expertActionsInterface.js'

// Actions supported by this module (namespace/action-name):
const SELECT_NODES = 'automation/select-nodes'
const GET_NODES = 'automation/get-nodes'
const EDIT_NODE = 'automation/open-node-edit'
const SEARCH = 'automation/search'
const ADD_FLOW_TAB = 'automation/add-flow-tab'
const SET_WIRES = 'automation/set-wires'

/**
 * @typedef {SELECT_NODES|GET_NODES|EDIT_NODE|SEARCH|ADD_FLOW_TAB|SET_WIRES} ExpertAutomationsActionsEnum
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
        }
,
        [SET_WIRES]: {
            params: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['add', 'remove'], description: 'Whether to add or remove a wire' },
                    from: { type: 'string', description: 'Source node ID' },
                    output: { type: 'number', description: 'Source output port index (0-based)' },
                    to: { type: 'string', description: 'Target node ID' }
                },
                required: ['mode', 'from', 'to']
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
     * Add or remove a single wire between two nodes.
     * @param {object} params
     * @param {'add'|'remove'} params.mode
     * @param {string} params.from - Source node ID
     * @param {number} [params.output] - Source output port index (0-based, defaults to 0)
     * @param {string} params.to - Target node ID
     */
    setWires ({ mode, from, output, to }) {
        const sourceNode = this.RED.nodes.node(from)
        if (!sourceNode) throw new Error(`Source node ${from} not found`)
        const port = output ?? 0
        const wasChanged = sourceNode.changed
        const wasDirty = this.RED.nodes.dirty()
        let linkEvent
        if (mode === 'add') {
            const targetNode = this.RED.nodes.node(to)
            if (!targetNode) throw new Error(`Target node ${to} not found`)
            const link = { source: sourceNode, sourcePort: port, target: targetNode }
            this.RED.nodes.addLink(link)
            linkEvent = { t: 'add', links: [link] }
        } else {
            const existingLinks = this.RED.nodes.getNodeLinks(from)
            const link = existingLinks.find(l =>
                l.source?.id === from && l.sourcePort === port && l.target?.id === to
            )
            if (!link) {
                throw new Error(`Wire not found from ${from} port ${port} to ${to}`)
            }
            this.RED.nodes.removeLink(link)
            linkEvent = { t: 'delete', links: [link] }
        }
        sourceNode.changed = true
        sourceNode.dirty = true
        this.RED.nodes.dirty(true)
        // Use a multi event so undo restores both the link and the node's changed state
        this.RED.history.push({
            t: 'multi',
            events: [
                linkEvent,
                { t: 'edit', node: sourceNode, changes: {}, changed: wasChanged }
            ],
            dirty: wasDirty
        })
        this.RED.view.updateActive()
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

        case SET_WIRES:
            this.setWires(params)
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
