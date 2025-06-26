/// <reference types="should" />
'use strict'
// eslint-disable-next-line no-unused-vars
const should = require('should')
const { getLongestUpstreamPath } = require('../../../lib/flowGraph')

describe('flowGraph', () => {
    describe('getLongestUpstreamPath()', () => {
        it('should return the longest upstream path for a flow', () => {
            // ────a────┬────b────c────┐
            //          └──────────────┘───d
            const tree = [
                { id: 'a', type: 'X', wires: [['b', 'd']] },
                { id: 'b', type: 'X', wires: [['c']] },
                { id: 'c', type: 'X', wires: [['d']] },
                { id: 'd', type: 'X', wires: [[]] }
            ]

            const result = getLongestUpstreamPath(tree, 'd')
            const ids = result.map(n => n.id)
            ids.should.eql(['a', 'b', 'c']) // Longest path is a -> b -> c -> d
        })

        it('should return an empty array if there are no upstream connections', () => {
            const tree = [
                { id: 'x', type: 'Y', wires: [[]] }
            ]

            const result = getLongestUpstreamPath(tree, 'x')
            result.should.have.length(0)
        })

        it('should handle multiple branches and pick the longest path', () => {
            const tree = [
                { id: 'root1', type: 'A', wires: [['x']] },
                { id: 'root2', type: 'A', wires: [['y']] },
                { id: 'x', type: 'B', wires: [['z']] },
                { id: 'y', type: 'B', wires: [['z']] },
                { id: 'z', type: 'C', wires: [[]] }
            ]

            const result = getLongestUpstreamPath(tree, 'z')
            const ids = result.map(n => n.id)

            // Can be either ["root1", "x"] or ["root2", "y"]
            // but must be length 2
            ids.length.should.equal(2)
            // ids[1] should be one x or y
            ids[1].should.be.oneOf(['x', 'y'])
        })

        it('should throw an error on circular reference', () => {
            // ┌────a────b────c────┐
            // └───────────────────┘
            const tree = [
                { id: 'a', type: 'Loop', wires: [['b']] },
                { id: 'b', type: 'Loop', wires: [['c']] },
                { id: 'c', type: 'Loop', wires: [['a']] }
            ];

            (() => getLongestUpstreamPath(tree, 'c')).should.throw(/circular/i)
        })

        it('should throw an error on circular reference to self', () => {
            // ┌────a────┬────b────c
            // └─────────┘
            const tree = [
                { id: 'a', type: 'X', wires: [['a', 'b']] },
                { id: 'b', type: 'X', wires: [['c']] },
                { id: 'c', type: 'X', wires: [[]] }
            ];

            (() => getLongestUpstreamPath(tree, 'c')).should.throw(/circular/i)
        })

        it('should return empty array if node does not exist', () => {
            const tree = [
                { id: 'x', type: 'X', wires: [['y']] },
                { id: 'y', type: 'Y', wires: [[]] }
            ]

            const result = getLongestUpstreamPath(tree, 'nonexistent')
            result.should.eql([]) // Node does not exist, so no upstream path
        })

        it('should handle disconnected nodes', () => {
            const tree = [
                { id: 'a', type: 'X', wires: [[]] },
                { id: 'b', type: 'X', wires: [[]] },
                { id: 'c', type: 'X', wires: [[]] }
            ]

            const result = getLongestUpstreamPath(tree, 'c')
            result.should.eql([]) // No upstream nodes
        })
    })
})
