const should = require('should')
const { cleanFlow } = require('../../../resources/sharedUtils.js')

describe('sharedUtils', () => {
    describe('cleanFlows', function () {
        describe('single node', function () {
            it('should clean a single node and remove internal properties', function () {
                const node = { id: '1', type: 'inject', _: 'internal', _def: {}, _config: {}, validationErrors: ['err'] }
                const { flow, nodeCount } = cleanFlow(node)
                nodeCount.should.equal(1)
                should(flow).be.an.Array()
                should(flow).have.length(1)
                should(flow[0]).be.an.Object()
                should(flow[0]).not.have.property('_')
                should(flow[0]).not.have.property('_def')
                should(flow[0]).not.have.property('_config')
                should(flow[0]).not.have.property('validationErrors')
                flow[0].should.have.property('id', '1')
                flow[0].should.have.property('type', 'inject')
            })

            it('should return null for null or invalid input', function () {
                cleanFlow(null).should.eql({ flow: [], nodeCount: 0 })
                cleanFlow(undefined).should.eql({ flow: [], nodeCount: 0 })
                cleanFlow({}).should.be.eql({ flow: [], nodeCount: 0 })
                cleanFlow({ foo: 'bar' }).should.be.eql({ flow: [], nodeCount: 0 })
            })

            it('should return null if node is not cleaned (no id)', function () {
                // cleanFlow depends on nodes having an ID to be able to check for circular references
                should(cleanFlow({ type: 'inject' })).be.eql({ flow: [], nodeCount: 0 })
            })
        })
        describe('flow array', function () {
            it('should remove internal properties from nodes', function () {
                const nodes = [
                    { id: '1', type: 'inject', _: 'internal', _def: {}, _config: {}, validationErrors: ['err'] },
                    { id: '2', type: 'debug', _: 'internal2', _def: {}, _config: {}, validationErrors: ['err2'] }
                ]
                const result = cleanFlow(nodes)
                result.flow.should.have.length(2)
                result.nodeCount.should.equal(2)
                result.flow.forEach(node => {
                    should(node).not.have.property('_')
                    should(node).not.have.property('_def')
                    should(node).not.have.property('_config')
                    should(node).not.have.property('validationErrors')
                })
            })

            it('should clean nested group nodes recursively and return the count all nodes', function () {
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
                const result = cleanFlow(nodes)
                result.nodeCount.should.equal(4)
                result.flow.should.have.length(1)
                const group = result.flow[0]
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
                const result = cleanFlow([nodeA])
                result.nodeCount.should.equal(2)
                result.flow.should.have.length(1)
                result.flow[0].nodes.should.have.length(1)
                // The circular reference should be replaced with null and filtered out
                result.flow[0].nodes[0].nodes.should.be.an.Array()
                result.flow[0].nodes[0].nodes.should.have.length(0)
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
                const result = cleanFlow([current])
                // Only up to MAX_DEPTH (10) should be counted, so nodeCount = 11 (root + 10)
                result.nodeCount.should.equal(11)
                // The last node's nodes array should be empty (as deeper nodes are skipped)
                let n = result.flow[0]
                for (let i = 0; i < 10; i++) {
                    n = n.nodes[0]
                }
                n.nodes.should.be.an.Array()
                n.nodes.should.have.length(0)
            })

            it('should handle empty input array', function () {
                const result = cleanFlow([])
                result.flow.should.be.an.Array().and.have.length(0)
                result.nodeCount.should.equal(0)
            })

            it('should filter out null nodes', function () {
                const nodes = [
                    { id: '1', type: 'inject' },
                    null,
                    { id: '2', type: 'debug' }
                ]
                const result = cleanFlow(nodes)
                result.flow.should.have.length(2)
                result.flow[0].should.have.property('id', '1')
                result.flow[1].should.have.property('id', '2')
                result.nodeCount.should.equal(2)
            })
        })
    })
})
