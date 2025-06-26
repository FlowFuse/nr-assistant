const should = require('should')
const { cleanNodes } = require('../../../resources/sharedUtils.js')

// filepath: c:\Users\sdmcl\repos\github\flowfuse\dev-env\packages\nr-assistant\test\unit\resources\sharedUtils.test.js

// ...existing code...

describe('sharedUtils', () => {
    describe('cleanNode', function () {
        const { cleanNode } = require('../../../resources/sharedUtils.js')

        it('should clean a single node and remove internal properties', function () {
            const node = { id: '1', type: 'inject', _: 'internal', _def: {}, _config: {}, validationErrors: ['err'] }
            const result = cleanNode(node)
            should(result).be.an.Object()
            should(result).not.have.property('_')
            should(result).not.have.property('_def')
            should(result).not.have.property('_config')
            should(result).not.have.property('validationErrors')
            result.should.have.property('id', '1')
            result.should.have.property('type', 'inject')
        })

        it('should clean a group node recursively', function () {
            const node = {
                id: 'g1',
                type: 'group',
                nodes: [
                    { id: '2', type: 'inject', _: 'internal' },
                    {
                        id: 'g2',
                        type: 'group',
                        nodes: [
                            { id: '3', type: 'debug', _def: {} }
                        ],
                        _childGroups: {},
                        _parentGroup: {}
                    }
                ],
                _childGroups: {},
                _parentGroup: {}
            }
            const result = cleanNode(node)
            should(result).be.an.Object()
            should(result).not.have.property('_childGroups')
            should(result).not.have.property('_parentGroup')
            result.should.have.property('nodes').which.is.an.Array().and.have.length(2)
            result.nodes[0].should.have.property('id', '2')
            result.nodes[1].should.have.property('id', 'g2')
            should(result.nodes[1]).not.have.property('_childGroups')
            should(result.nodes[1]).not.have.property('_parentGroup')
            result.nodes[1].nodes.should.have.length(1)
            result.nodes[1].nodes[0].should.have.property('id', '3')
        })

        it('should return null for null or invalid input', function () {
            should(cleanNode(null)).be.null()
            should(cleanNode(undefined)).be.null()
            should(cleanNode({})).be.null()
            should(cleanNode({ foo: 'bar' })).be.null()
        })

        it('should return null if node is not cleaned (no id)', function () {
            should(cleanNode({ type: 'inject' })).be.null()
        })

        it('should avoid circular references in group nodes', function () {
            const nodeA = { id: 'a', type: 'group', nodes: [] }
            const nodeB = { id: 'b', type: 'group', nodes: [] }
            nodeA.nodes.push(nodeB)
            nodeB.nodes.push(nodeA)
            const result = cleanNode(nodeA)
            should(result).be.an.Object()
            result.should.have.property('id', 'a')
            result.should.have.property('nodes').which.is.an.Array().and.have.length(1)
            result.nodes[0].should.have.property('id', 'b')
            result.nodes[0].nodes.should.be.an.Array().and.have.length(0)
        })
    })

    describe('cleanNodes', function () {
        it('should remove internal properties from nodes', function () {
            const nodes = [
                { id: '1', type: 'inject', _: 'internal', _def: {}, _config: {}, validationErrors: ['err'] },
                { id: '2', type: 'debug', _: 'internal2', _def: {}, _config: {}, validationErrors: ['err2'] }
            ]
            const result = cleanNodes(nodes)
            result.nodes.should.have.length(2)
            result.totalNodeCount.should.equal(2)
            result.nodes.forEach(node => {
                should(node).not.have.property('_')
                should(node).not.have.property('_def')
                should(node).not.have.property('_config')
                should(node).not.have.property('validationErrors')
            })
        })

        it('should clean nested group nodes recursively', function () {
            const nodes = [
                {
                    id: 'g1',
                    type: 'group',
                    nodes: [
                        { id: '3', type: 'inject', _: 'internal' },
                        {
                            id: 'g2',
                            type: 'group',
                            nodes: [
                                { id: '4', type: 'debug', _def: {} }
                            ],
                            _childGroups: {},
                            _parentGroup: {}
                        }
                    ],
                    _childGroups: {},
                    _parentGroup: {}
                }
            ]
            const result = cleanNodes(nodes)
            result.totalNodeCount.should.equal(4)
            result.nodes.should.have.length(1)
            const group = result.nodes[0]
            should(group).not.have.property('_childGroups')
            should(group).not.have.property('_parentGroup')
            group.nodes.should.have.length(2)
            group.nodes[0].should.have.property('id', '3')
            group.nodes[1].should.have.property('id', 'g2')
            should(group.nodes[1]).not.have.property('_childGroups')
            should(group.nodes[1]).not.have.property('_parentGroup')
            group.nodes[1].nodes.should.have.length(1)
            group.nodes[1].nodes[0].should.have.property('id', '4')
        })

        it('should avoid circular references using visited set', function () {
            const nodeA = { id: 'a', type: 'group', nodes: [] }
            const nodeB = { id: 'b', type: 'group', nodes: [] }
            // create circular reference
            nodeA.nodes.push(nodeB)
            nodeB.nodes.push(nodeA)
            const result = cleanNodes([nodeA])
            result.totalNodeCount.should.equal(2)
            result.nodes.should.have.length(1)
            result.nodes[0].nodes.should.have.length(1)
            // The circular reference should be replaced with null and filtered out
            result.nodes[0].nodes[0].nodes.should.be.an.Array()
            result.nodes[0].nodes[0].nodes.should.have.length(0)
        })

        it('should not exceed MAX_DEPTH', function () {
        // Create a deep nested group structure
            const current = { id: 'root', type: 'group', nodes: [] }
            let node = current
            for (let i = 1; i <= 12; i++) {
                const child = { id: 'g' + i, type: 'group', nodes: [] }
                node.nodes.push(child)
                node = child
            }
            const result = cleanNodes([current])
            // Only up to MAX_DEPTH (10) should be counted, so totalNodeCount = 11 (root + 10)
            result.totalNodeCount.should.equal(11)
            // The last node's nodes array should be empty (as deeper nodes are skipped)
            let n = result.nodes[0]
            for (let i = 0; i < 10; i++) {
                n = n.nodes[0]
            }
            n.nodes.should.be.an.Array()
            n.nodes.should.have.length(0)
        })

        it('should handle empty input array', function () {
            const result = cleanNodes([])
            result.nodes.should.be.an.Array().and.have.length(0)
            result.totalNodeCount.should.equal(0)
        })

        it('should filter out null nodes', function () {
            const nodes = [
                { id: '1', type: 'inject' },
                null,
                { id: '2', type: 'debug' }
            ]
            const result = cleanNodes(nodes)
            result.nodes.should.have.length(2)
            result.nodes[0].should.have.property('id', '1')
            result.nodes[1].should.have.property('id', '2')
            result.totalNodeCount.should.equal(2)
        })
    })
})
