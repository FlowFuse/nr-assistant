import { ExpertActionsInterface } from './expertActionsInterface.js'

// Actions supported by this module (namespace/action-name):
const SELECT_NODES = 'automation/select-nodes'
const GET_NODES = 'automation/get-nodes'

/**
 * @typedef {SELECT_NODES|GET_NODES} ExpertAutomationsActionsEnum
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
    invokeAction (actionName, { event, params } = {}, result = {}) {
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
