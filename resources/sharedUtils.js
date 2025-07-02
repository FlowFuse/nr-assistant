/**
* FFA Assistant Utils
* Shared utility functions for the FlowFuse Assistant
* To import this in js backend code, use:
* const { cleanFlow } = require('flowfuse-nr-assistant/resources/sharedUtils.js')
* To import this in frontend code, use:
* <script src="/resources/@flowfuse/nr-assistant/sharedUtils.js"></script>
* To use this in the browser, you can access it via:
* FFAssistantUtils.cleanFlow(nodeArray)
*/

'use strict';

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js / CommonJS
        module.exports = factory()
    } else {
        // Browser
        root.FFAssistantUtils = root.FFAssistantUtils || {}
        Object.assign(root.FFAssistantUtils, factory())
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict'
    /**
     * Cleans a single or an array nodes by removing internal properties and circular references.
     * @param {Array<Object> | Object} flow - The node or array of nodes to clean
     * @returns {{nodes: Array, totalNodeCount: number}} - The cleaned nodes and the total node count
     */
    function cleanFlow (flow) {
        if (!flow) return { flow: [], nodeCount: 0 }
        const nodeArray = Array.isArray(flow) ? flow : [flow]
        const nodes = [...nodeArray] // make a shallow copy of the array
        let totalNodeCount = 0
        const MAX_DEPTH = 10 // maximum depth to recurse into groups
        const visited = new Set() // to avoid circular references
        // the input is an array of node. each node is an object.
        // if the .type is 'group' and it has a .nodes array, we need to clean those nodes as well (and any nested groups).
        const recursiveClean = (node, depth = 0) => {
            if (!node || typeof node !== 'object' || !node.id) {
                return null // if the node is not an object or doesn't have an id, return null
            }
            if (visited.has(node.id) || depth > MAX_DEPTH) {
                return null
            }
            totalNodeCount += 1
            visited.add(node.id)
            const cleaned = { ...node }
            delete cleaned._ // remove the internal _ property
            delete cleaned._def // remove the definition
            delete cleaned._config // remove the config
            delete cleaned.validationErrors // remove validation errors
            if (node.type === 'group') {
                delete cleaned._childGroups // this can cause circular references
                delete cleaned._parentGroup // this can cause circular references
                cleaned.nodes = []
                if (Array.isArray(node.nodes) && node.nodes.length > 0) {
                    cleaned.nodes = node.nodes.map(childNode => recursiveClean(childNode, depth + 1))
                        .filter(childNode => childNode !== null) // filter out any null nodes
                }
            }
            return cleaned
        }
        return {
            flow: nodes.map(node => recursiveClean(node)).filter(node => node !== null), // filter out any null nodes
            nodeCount: totalNodeCount
        }
    }
    return { cleanFlow }
}))
