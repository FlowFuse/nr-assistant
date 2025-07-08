function buildReverseGraph (flow) {
    const reverseGraph = new Map()
    for (const node of flow) {
        const outputs = (node && node.wires && node.wires.flat()) || []
        for (const output of outputs) {
            if (!reverseGraph.has(output)) {
                reverseGraph.set(output, [])
            }
            reverseGraph.get(output).push(node.id) // output is downstream, node.id is upstream
        }
    }
    return reverseGraph
}

/**
 * Find the longest upstream path in a flow graph.
 *
 * Interesting parts:
 * - Uses DFS (depth-first search) to find the longest upstream path
 * - Handles circular references by using a Set to track visited nodes
 * @param {Array} graph - The reverse graph where keys are node IDs and values are arrays of upstream node IDs.
 * @param {string} startId - The ID of the node from which to start the search.
 * @returns {Array} - An array of node IDs representing the longest upstream path.
 * @throws {Error} - Throws an error if a circular reference is detected.
 */
function findLongestUpstreamPath (graph, startId) {
    const visited = new Set()
    function dfs (current, path) {
        if (visited.has(current)) {
            throw new Error(`Circular reference detected at node ${current}`)
        }
        visited.add(current)
        let maxSubPath = []
        for (const parent of graph.get(current) || []) {
            const subPath = dfs(parent, path)
            if (subPath.length > maxSubPath.length) {
                maxSubPath = subPath
            }
        }
        visited.delete(current)

        return [...maxSubPath, current]
    }
    return dfs(startId, [])
}

/**
 * Get the longest upstream path in a flow graph.
 * @param {Array<{id: string, type: string, wires: Array<Array<string>>, [key: string]: any}>} flow - The flow graph.
 * @param {string} finalNodeId - The ID of the final node.
 * @returns {Array} - An array of nodes representing the longest upstream path.
 */
function getLongestUpstreamPath (flow, finalNodeId) {
    const reverseGraph = buildReverseGraph(flow)
    const idToNodeLookup = Object.fromEntries(flow.map(node => [node.id, node]))
    const pathIds = findLongestUpstreamPath(reverseGraph, finalNodeId)
    const result = pathIds.map(id => idToNodeLookup[id])
    return result.filter(node => node !== undefined && node.id !== finalNodeId)
}

module.exports = {
    getLongestUpstreamPath,
    buildReverseGraph,
    findLongestUpstreamPath
}
