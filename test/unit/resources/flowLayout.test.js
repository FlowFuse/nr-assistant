/// <reference types="should" />
'use strict'
const should = require('should')

// Frontend ES module; see expertAutomations.test.js for why older node versions skip it.
const [major] = process.versions.node.split('.').map(Number)
const describeMain = major < 20 ? describe.skip : describe

describeMain('flowLayout', () => {
    let layoutNodes
    let findOverlaps

    before(async () => {
        ({ layoutNodes, findOverlaps } = await import('../../../resources/flowLayout.js'))
    })

    // Nodes without x and y have no position yet, like freshly imported ones
    const node = (id, props = {}) => ({ id, x: undefined, y: undefined, w: 100, h: 30, wires: [], ...props })
    const apply = (nodes, placed) => nodes.map(n => ({ ...n, ...(placed.get(n.id) || {}) }))

    describe('layoutNodes', () => {
        it('only returns positions for the movable nodes', () => {
            const nodes = [node('a', { x: 100, y: 100, wires: [['b']] }), node('b')]
            const placed = layoutNodes({ nodes, movableIds: ['b'] })
            ;[...placed.keys()].should.deepEqual(['b'])
        })

        it('lines a chain up to the right of its upstream node', () => {
            const nodes = [
                node('a', { x: 150, y: 100, wires: [['b']] }),
                node('b', { wires: [['c']] }),
                node('c')
            ]
            const placed = layoutNodes({ nodes, movableIds: ['b', 'c'] })
            placed.get('b').should.deepEqual({ x: 330, y: 100 })
            placed.get('c').should.deepEqual({ x: 510, y: 100 })
        })

        it('places a chain to the left of a downstream node when nothing feeds it', () => {
            const nodes = [
                node('a', { wires: [['b']] }),
                node('b', { x: 500, y: 200 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['a'] })
            // b's left edge is 450; a's right edge must be at least 80 before it, on the grid
            placed.get('a').should.deepEqual({ x: 310, y: 200 })
        })

        it('stacks the outputs of a fan-out without overlapping', () => {
            const nodes = [
                node('sw', { x: 150, y: 100, h: 45, wires: [['a'], ['b'], ['c']] }),
                node('a'),
                node('b'),
                node('c')
            ]
            const placed = layoutNodes({ nodes, movableIds: ['a', 'b', 'c'] })
            const ys = ['a', 'b', 'c'].map(id => placed.get(id).y)
            ys.should.deepEqual([...ys].sort((p, q) => p - q))
            new Set(['a', 'b', 'c'].map(id => placed.get(id).x)).size.should.equal(1)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps outputs in port order and the column after them uncrossed', () => {
            const nodes = [
                node('in', { wires: [['sw']] }),
                node('sw', { h: 60, wires: [['a'], ['b'], ['c']] }),
                node('a', { wires: [['join']] }),
                node('b', { wires: [['join']] }),
                node('c', { h: 45, wires: [['join'], ['mail']] }),
                node('mail'),
                node('join')
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const y = (id) => placed.get(id).y
            y('a').should.be.below(y('b'))
            y('b').should.be.below(y('c'))
            y('join').should.be.below(y('mail'))
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps nodes wired to the same output in the order they were in', () => {
            const nodes = [
                node('in', { x: 100, y: 200, wires: [['a', 'b', 'c']] }),
                node('a', { x: 300, y: 300 }),
                node('b', { x: 300, y: 100 }),
                node('c', { x: 300, y: 200 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const y = (id) => placed.get(id).y
            y('b').should.be.below(y('c'))
            y('c').should.be.below(y('a'))
        })

        it('centres the nodes on one output on the node feeding them', () => {
            const nodes = [
                node('in', { x: 100, y: 200, wires: [['a', 'b']] }),
                node('a', { x: 300, y: 100 }),
                node('b', { x: 300, y: 300 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const y = (id) => placed.get(id).y
            ;(y('a') + y('b')).should.equal(y('in') * 2)
        })

        it('keeps flows that join into one node in the order they were from the top', () => {
            const nodes = [
                node('err', { x: 100, y: 400, wires: [['out']] }),
                node('a1', { x: 100, y: 100, wires: [['a2']] }),
                node('a2', { x: 300, y: 100, wires: [['out']] }),
                node('b1', { x: 100, y: 200, wires: [['b2']] }),
                node('b2', { x: 300, y: 200, wires: [['out']] }),
                node('c1', { x: 100, y: 300, wires: [['c2']] }),
                node('c2', { x: 300, y: 300, wires: [['out']] }),
                node('out', { x: 500, y: 250 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const y = (id) => placed.get(id).y
            y('a1').should.be.below(y('b1'))
            y('b1').should.be.below(y('c1'))
            y('c1').should.be.below(y('err'))
        })

        it('puts new nodes wired to the same output in wire order', () => {
            const nodes = [node('in', { x: 100, y: 200, wires: [['a', 'b', 'c']] }), node('a'), node('b'), node('c')]
            const placed = layoutNodes({ nodes, movableIds: ['a', 'b', 'c'] })
            const y = (id) => placed.get(id).y
            y('a').should.be.below(y('b'))
            y('b').should.be.below(y('c'))
        })

        it('keeps room below the first output for an output that leaves the group', () => {
            const nodes = [
                node('in', { x: 100, y: 100, g: 'g1', wires: [['sw']] }),
                node('sw', { x: 300, y: 100, g: 'g1', wires: [['delay'], ['out']] }),
                node('delay', { x: 500, y: 100, g: 'g1' }),
                node('out', { x: 900, y: 300 })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['in', 'sw', 'delay'] })
            placed.get('delay').y.should.be.below(placed.get('sw').y)
        })

        it('lines a node up with a single feeder and puts a merge between its feeders', () => {
            const nodes = [
                node('sw', { wires: [['delay'], ['out']] }),
                node('delay', { wires: [['format']] }),
                node('format', { wires: [['out']] }),
                node('out')
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const y = (id) => placed.get(id).y
            y('format').should.equal(y('delay'))
            y('out').should.be.above(y('format'))
        })

        it('lets a wide node push only what is level with it', () => {
            const nodes = [
                node('sw', { wires: [['wide'], ['short']] }),
                node('wide', { w: 600, wires: [['after-wide']] }),
                node('short', { wires: [['after-short']] }),
                node('after-wide'),
                node('after-short')
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const left = (id) => placed.get(id).x - 50
            const right = (id) => placed.get(id).x + (id === 'wide' ? 300 : 50)
            ;(left('after-short') - right('short')).should.equal(80)
            left('after-wide').should.be.aboveOrEqual(right('wide') + 80)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('lays out wires between groups without crossing them', () => {
            // Two paths in their own groups feed a third group; its nodes follow the
            // order of the paths feeding them.
            const nodes = [
                node('a1', { x: 100, y: 300, g: 'a', wires: [['a2']] }),
                node('a2', { x: 300, y: 300, g: 'a', wires: [['fa']] }),
                node('b1', { x: 100, y: 100, g: 'b', wires: [['b2']] }),
                node('b2', { x: 300, y: 100, g: 'b', wires: [['fb']] }),
                node('fa', { x: 600, y: 100, g: 'f', wires: [['out']] }),
                node('fb', { x: 600, y: 300, g: 'f', wires: [['out']] }),
                node('out', { x: 800, y: 200, g: 'f' })
            ]
            const groups = [{ id: 'a' }, { id: 'b' }, { id: 'f' }]
            const placed = layoutNodes({ nodes, groups, movableIds: nodes.map(n => n.id) })
            const y = (id) => placed.get(id).y
            ;(y('a2') < y('b2')).should.equal(y('fa') < y('fb'))
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('uses each node width so a wide label pushes the next column right', () => {
            const nodes = [
                node('a', { w: 300, wires: [['b']] }),
                node('b')
            ]
            const placed = layoutNodes({ nodes, movableIds: ['a', 'b'] })
            const a = placed.get('a')
            const b = placed.get('b')
            ;(b.x - 50).should.be.aboveOrEqual(a.x + 150 + 80)
        })

        it('leaves room for buttons drawn outside the node', () => {
            // src's button takes its right edge to 270, so b starts at 360 rather than 340
            const nodes = [
                node('src', { x: 200, y: 100, button: 'right', wires: [['b']] }),
                node('b')
            ]
            const placed = layoutNodes({ nodes, movableIds: ['b'] })
            placed.get('b').x.should.equal(410)
        })

        it('keeps left edges and centres on the grid', () => {
            const nodes = [
                node('a', { x: 133, y: 107, w: 140, wires: [['b']] }),
                node('b', { w: 120 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['b'], gridSize: 20 })
            const b = placed.get('b')
            ;((b.x - 60) % 20).should.equal(0)
            ;(b.y % 20).should.equal(0)
        })

        it('moves a node already in the way so a new node lines up with its feeder', () => {
            const nodes = [
                node('a', { x: 150, y: 100, wires: [['b']] }),
                node('b'),
                node('blocker', { x: 330, y: 100 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['b'] })
            placed.get('b').should.deepEqual({ x: 330, y: 100 })
            placed.has('blocker').should.be.true()
            placed.has('a').should.be.false()
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('moves down past a node already in the way when not anchored', () => {
            const nodes = [
                node('a', { x: 150, y: 100, wires: [['b']] }),
                node('b'),
                node('blocker', { x: 330, y: 100 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['b'], anchor: false })
            placed.has('blocker').should.be.false()
            placed.get('b').x.should.equal(330)
            placed.get('b').y.should.be.above(100)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('puts unwired nodes below the existing nodes, aligned to their left edge', () => {
            const nodes = [
                node('a', { x: 150, y: 100 }),
                node('b', { x: 150, y: 300 }),
                node('new')
            ]
            const placed = layoutNodes({ nodes, movableIds: ['new'] })
            placed.get('new').x.should.equal(150)
            placed.get('new').y.should.be.above(315)
        })

        it('places nodes on an empty tab near the top left', () => {
            const placed = layoutNodes({ nodes: [node('a', { wires: [['b']] }), node('b')], movableIds: ['a', 'b'] })
            placed.get('a').should.deepEqual({ x: 130, y: 60 })
            placed.get('b').y.should.equal(60)
        })

        it('still lays out a loop', () => {
            const nodes = [
                node('a', { wires: [['b']] }),
                node('b', { wires: [['c']] }),
                node('c', { wires: [['a']] })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['a', 'b', 'c'] })
            placed.get('a').x.should.be.below(placed.get('b').x)
            placed.get('b').x.should.be.below(placed.get('c').x)
        })

        it('treats another group as a block, including the padding it will grow by, when not anchored', () => {
            // g1 holds a fixed node; the new node is outside any group and must clear
            // the whole group box, not just the node inside it
            const nodes = [
                node('src', { x: 150, y: 100, wires: [['new']] }),
                node('inside', { x: 330, y: 100, g: 'g1' }),
                node('new')
            ]
            const groups = [{ id: 'g1' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['new'], anchor: false })
            const p = placed.get('new')
            // g1 spans 254..406 x 59..141; with clearance the new node must start below it
            ;(p.y - 15).should.be.aboveOrEqual(141 + 20)
        })

        it('grows a group around a new node without covering another group, when not anchored', () => {
            const nodes = [
                node('member', { x: 150, y: 100, g: 'g1', wires: [['new']] }),
                node('other', { x: 330, y: 160, g: 'g2' }),
                node('new', { g: 'g1' })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['new'], anchor: false })
            const p = placed.get('new')
            const g1 = {
                left: Math.min(100, p.x - 50) - 26,
                right: Math.max(200, p.x + 50) + 26,
                top: Math.min(85, p.y - 15) - 26,
                bottom: Math.max(115, p.y + 15) + 26
            }
            const g2 = { left: 280 - 26, right: 380 + 26, top: 145 - 26, bottom: 175 + 26 }
            const apart = g1.right <= g2.left || g2.right <= g1.left || g1.bottom <= g2.top || g2.bottom <= g1.top
            apart.should.be.true()
        })

        it('places nodes inside a group next to each other without group padding', () => {
            const nodes = [
                node('member', { x: 150, y: 100, g: 'g1', wires: [['new']] }),
                node('new', { g: 'g1' })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['new'] })
            placed.get('new').should.deepEqual({ x: 330, y: 100 })
        })

        it('carries a long chain on in rows no wider than maxWidth', () => {
            const ids = Array.from({ length: 10 }, (_, i) => `n${i}`)
            const nodes = [
                node('src', { x: 150, y: 100, wires: [['n0']] }),
                ...ids.map((id, i) => node(id, { wires: i < ids.length - 1 ? [[ids[i + 1]]] : [] }))
            ]
            const placed = layoutNodes({ nodes, movableIds: ids, maxWidth: 800 })
            const rows = new Map()
            for (const id of ids) {
                const p = placed.get(id)
                if (!rows.has(p.y)) rows.set(p.y, [])
                rows.get(p.y).push(p.x)
            }
            rows.size.should.be.above(1)
            const lefts = [...rows.values()].map(xs => Math.min(...xs) - 50)
            for (const xs of rows.values()) (Math.max(...xs) + 50 - (Math.min(...xs) - 50)).should.be.belowOrEqual(800)
            new Set(lefts).size.should.equal(1)
            // each row carries on below the previous one, in wire order
            const ys = ids.map(id => placed.get(id).y)
            ys.should.deepEqual([...ys].sort((p, q) => p - q))
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('starts the next row below a tall node', () => {
            const ids = ['n0', 'tall', 'n2', 'n3', 'n4']
            const nodes = ids.map((id, i) => node(id, { h: id === 'tall' ? 210 : 30, wires: i < ids.length - 1 ? [[ids[i + 1]]] : [] }))
            const placed = layoutNodes({ nodes, movableIds: ids, maxWidth: 500 })
            const tall = placed.get('tall')
            const upperBottom = tall.y + 105
            const lowerTop = Math.min(...ids.filter(id => placed.get(id).y > upperBottom).map(id => placed.get(id).y - 15))
            // a node centred on the first grid line it fits on has 10px clear above and below
            const middle = Math.ceil((upperBottom + 10 + 15) / 20) * 20
            ;(lowerTop - (middle + 15)).should.be.aboveOrEqual(10)
            ;(lowerTop - (middle + 15)).should.be.below(30)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        // Clear space between the bottom of one wrapped row and the top of the next.
        const rowGap = (placed, ids) => {
            const ys = [...new Set(ids.map(id => placed.get(id).y))].sort((p, q) => p - q)
            return (ys[1] - 15) - (ys[0] + 15)
        }

        it('leaves room for a node halfway between wrapped rows on any grid', () => {
            const ids = Array.from({ length: 8 }, (_, i) => `n${i}`)
            const nodes = ids.map((id, i) => node(id, { wires: i < ids.length - 1 ? [[ids[i + 1]]] : [] }))
            // rows of 30px nodes, centre to centre: a node centred halfway has three cells of a
            // grid finer than 10px, otherwise a grid cell up to 10px, clear above and below it
            const apartBy = { 5: 90, 10: 80, 20: 80, 50: 100 }
            for (const [gridSize, distance] of Object.entries(apartBy).map(([g, d]) => [Number(g), d])) {
                const placed = layoutNodes({ nodes, movableIds: ids, maxWidth: 600, gridSize })
                const ys = [...new Set(ids.map(id => placed.get(id).y))].sort((p, q) => p - q)
                ;(ys[1] - ys[0]).should.equal(distance)
                rowGap(placed, ids).should.be.aboveOrEqual(30 + (gridSize < 10 ? gridSize * 3 : Math.min(gridSize, 10)) * 2)
            }
        })

        it('keeps nodes as far apart on the finest grid as on the default one', () => {
            // a fan out into three branches, each two nodes long
            const nodes = [
                node('src', { wires: [['a0'], ['b0'], ['c0']] }),
                ...['a', 'b', 'c'].flatMap(k => [node(`${k}0`, { wires: [[`${k}1`]] }), node(`${k}1`)])
            ]
            const placed = apply(nodes, layoutNodes({ nodes, movableIds: nodes.map(n => n.id), gridSize: 5 }))
            for (let i = 0; i < placed.length; i++) {
                for (let j = i + 1; j < placed.length; j++) {
                    const [p, q] = [placed[i], placed[j]]
                    const across = Math.max(q.x - q.w / 2 - (p.x + p.w / 2), p.x - p.w / 2 - (q.x + q.w / 2))
                    const down = Math.max(q.y - q.h / 2 - (p.y + p.h / 2), p.y - p.h / 2 - (q.y + q.h / 2))
                    Math.max(across, down).should.be.aboveOrEqual(20)
                }
            }
            for (const n of placed) (n.y % 5).should.equal(0)
        })

        it('breaks a long row outside a group when it can', () => {
            const ids = ['n0', 'n1', 'g1a', 'g1b', 'n4']
            const nodes = ids.map((id, i) => node(id, {
                g: id.startsWith('g1') ? 'g1' : undefined,
                wires: i < ids.length - 1 ? [[ids[i + 1]]] : []
            }))
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ids, maxWidth: 600 })
            placed.get('g1a').y.should.equal(placed.get('g1b').y)
            placed.get('g1a').y.should.be.above(placed.get('n1').y)
        })

        it('wraps a long chain inside a group that holds the whole flow', () => {
            const ids = Array.from({ length: 8 }, (_, i) => `n${i}`)
            const nodes = ids.map((id, i) => node(id, { g: 'g1', wires: i < ids.length - 1 ? [[ids[i + 1]]] : [] }))
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ids, maxWidth: 800 })
            new Set(ids.map(id => placed.get(id).y)).size.should.be.above(1)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        const boxOf = (nodes, placed, ids, pad = 0) => {
            const rs = apply(nodes, placed).filter(n => ids.includes(n.id))
            return {
                left: Math.min(...rs.map(n => n.x - n.w / 2)) - pad,
                right: Math.max(...rs.map(n => n.x + n.w / 2)) + pad,
                top: Math.min(...rs.map(n => n.y - n.h / 2)) - pad,
                bottom: Math.max(...rs.map(n => n.y + n.h / 2)) + pad
            }
        }
        const apart = (p, q) => p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top

        it('wraps a group inside itself when it holds only part of the flow', () => {
            const ids = ['g1a', 'g1b', 'g1c', 'g1d', 'g1e']
            const nodes = [
                ...ids.map((id, i) => node(id, { g: 'g1', wires: i < ids.length - 1 ? [[ids[i + 1]]] : [['after']] })),
                node('loose', { wires: [['g1a']] }),
                node('after')
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: nodes.map(n => n.id), maxWidth: 600 })
            new Set(ids.map(id => placed.get(id).y)).size.should.be.above(1)
            const g1 = boxOf(nodes, placed, ids, 26)
            ;(g1.right - g1.left - 52).should.be.belowOrEqual(600)
            for (const id of ['loose', 'after']) apart(g1, boxOf(nodes, placed, [id])).should.be.true()
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('wraps a long group nested in another before what follows it', () => {
            const chain = Array.from({ length: 11 }, (_, i) => `c${i}`)
            const nodes = [
                ...chain.map((id, i) => node(id, { g: 'inner', wires: [[i < chain.length - 1 ? chain[i + 1] : 'sw']] })),
                node('sw', { g: 'outer', wires: [['chg']] }),
                node('chg', { g: 'outer' })
            ]
            const groups = [{ id: 'outer' }, { id: 'inner', g: 'outer' }]
            const placed = layoutNodes({ nodes, groups, movableIds: nodes.map(n => n.id) })
            const inner = boxOf(nodes, placed, chain, 26)
            ;(inner.right - inner.left - 52).should.be.belowOrEqual(1600)
            new Set(chain.map(id => placed.get(id).y)).size.should.be.above(1)
            for (const id of ['sw', 'chg']) apart(inner, boxOf(nodes, placed, [id])).should.be.true()
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps nodes fed by a wrapped group on its row, in wire order', () => {
            // chain in `inner`, then sw and chg in `outer` only, then back into `deep` inside `inner`
            const chain = Array.from({ length: 11 }, (_, i) => `c${i}`)
            const deep = Array.from({ length: 4 }, (_, i) => `d${i}`)
            const nodes = [
                ...chain.map((id, i) => node(id, { g: 'inner', wires: [[i < chain.length - 1 ? chain[i + 1] : 'sw']] })),
                node('sw', { g: 'outer', wires: [['chg']] }),
                node('chg', { g: 'outer', wires: [['d0']] }),
                ...deep.map((id, i) => node(id, { g: 'deep', wires: i < deep.length - 1 ? [[deep[i + 1]]] : [] }))
            ]
            const groups = [{ id: 'outer' }, { id: 'inner', g: 'outer' }, { id: 'deep', g: 'inner' }]
            const placed = layoutNodes({ nodes, groups, movableIds: nodes.map(n => n.id) })
            const last = placed.get('c10')
            placed.get('sw').y.should.equal(last.y)
            placed.get('chg').y.should.equal(last.y)
            placed.get('sw').x.should.be.above(last.x)
            placed.get('chg').x.should.be.above(placed.get('sw').x)
            const inner = boxOf(nodes, placed, [...chain, ...deep], 26)
            apart(inner, boxOf(nodes, placed, ['sw'])).should.be.true()
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps nodes fed by a wrapped group nested two deep on its row', () => {
            // chain in `inner`, then sw and chg in `outer` only, then into `deep` inside `middle`
            // inside `inner`, then tail nodes in `middle` only
            const chain = Array.from({ length: 12 }, (_, i) => `c${i}`)
            const deep = Array.from({ length: 14 }, (_, i) => `d${i}`)
            const nodes = [
                ...chain.map((id, i) => node(id, { g: 'inner', wires: [[i < chain.length - 1 ? chain[i + 1] : 'sw']] })),
                node('sw', { g: 'outer', wires: [['chg']] }),
                node('chg', { g: 'outer', wires: [['d0']] }),
                ...deep.map((id, i) => node(id, { g: 'deep', wires: [[i < deep.length - 1 ? deep[i + 1] : 't0']] })),
                node('t0', { g: 'middle', wires: [['t1']] }),
                node('t1', { g: 'middle' })
            ]
            const groups = [{ id: 'outer' }, { id: 'inner', g: 'outer' }, { id: 'middle', g: 'inner' }, { id: 'deep', g: 'middle' }]
            const placed = layoutNodes({ nodes, groups, movableIds: nodes.map(n => n.id) })
            new Set(deep.map(id => placed.get(id).y)).size.should.be.above(1)
            const lastDeep = placed.get('d13')
            placed.get('t0').y.should.equal(lastDeep.y)
            placed.get('t1').y.should.equal(lastDeep.y)
            placed.get('t1').x.should.be.above(placed.get('t0').x)
            apart(boxOf(nodes, placed, deep, 26), boxOf(nodes, placed, ['t0'])).should.be.true()
            const lastChain = placed.get('c11')
            placed.get('sw').y.should.equal(lastChain.y)
            placed.get('chg').y.should.equal(lastChain.y)
            placed.get('chg').x.should.be.above(placed.get('sw').x)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        describe('canvas size', () => {
            const canvas = { width: 2000, height: 2000 }
            const chainOf = (count, props = () => ({})) => {
                const ids = Array.from({ length: count }, (_, i) => `n${i}`)
                return ids.map((id, i) => node(id, { wires: i < count - 1 ? [[ids[i + 1]]] : [], ...props(i) }))
            }
            const insideCanvas = (nodes, placed) => {
                for (const n of apply(nodes, placed)) {
                    (n.x + n.w / 2).should.be.belowOrEqual(canvas.width)
                    ;(n.y + n.h / 2).should.be.belowOrEqual(canvas.height)
                }
            }

            it('wraps a flow near the right edge into the room left, keeping its first node', () => {
                const nodes = chainOf(8, i => ({ x: 1510 + i * 180, y: 300 }))
                const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id), canvas })
                placed.get('n0').should.deepEqual({ x: 1510, y: 300 })
                new Set(nodes.map(n => placed.get(n.id).y)).size.should.be.above(1)
                insideCanvas(nodes, placed)
                findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
            })

            it('wraps a flow wider than the canvas when maxWidth is 0', () => {
                const nodes = chainOf(15)
                const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id), maxWidth: 0, canvas })
                new Set(nodes.map(n => placed.get(n.id).y)).size.should.be.above(1)
                insideCanvas(nodes, placed)
            })

            it('moves a flow that would be pushed past the bottom edge to free room', () => {
                const upper = chainOf(2, i => ({ x: 210 + i * 200, y: 1950 }))
                const lower = [
                    node('m0', { x: 310, y: 1960, wires: [['m1']] }),
                    node('m1', { x: 510, y: 1960 })
                ]
                const nodes = [...upper, ...lower]
                const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id), canvas })
                insideCanvas(nodes, placed)
                findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
            })

            it('wraps new nodes wired to a node near the right edge', () => {
                const fixed = node('f', { x: 1700, y: 300, wires: [['n0']] })
                const nodes = [fixed, ...chainOf(6)]
                const movable = nodes.slice(1).map(n => n.id)
                const placed = layoutNodes({ nodes, movableIds: movable, canvas })
                insideCanvas(nodes, placed)
                findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
            })

            it('pulls a flow back from the right edge when not anchored', () => {
                const nodes = chainOf(3, i => ({ x: 1850 + i * 40, y: 300 }))
                const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id), anchor: false, canvas })
                insideCanvas(nodes, placed)
            })
        })

        it('does not wrap when maxWidth is 0', () => {
            const ids = Array.from({ length: 20 }, (_, i) => `n${i}`)
            const nodes = ids.map((id, i) => node(id, { wires: i < ids.length - 1 ? [[ids[i + 1]]] : [] }))
            const placed = layoutNodes({ nodes, movableIds: ids, maxWidth: 0 })
            new Set(ids.map(id => placed.get(id).y)).size.should.equal(1)
        })

        it('wraps a chain whose last wire leaves the nodes being laid out', () => {
            const ids = ['n0', 'n1', 'n2', 'n3', 'n4']
            const nodes = [
                ...ids.map((id, i) => node(id, { wires: [[i < ids.length - 1 ? ids[i + 1] : 'fixed']] })),
                node('fixed', { x: 2000, y: 600 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ids, maxWidth: 500 })
            new Set(ids.map(id => placed.get(id).y)).size.should.be.above(1)
            for (const id of ids) Number.isFinite(placed.get(id).x).should.be.true()
        })

        it('ignores ids that are not on the tab and duplicates', () => {
            const placed = layoutNodes({ nodes: [node('a')], movableIds: ['a', 'a', 'missing'] })
            ;[...placed.keys()].should.deepEqual(['a'])
        })
    })

    describe('tidying existing nodes', () => {
        const rectOf = (nodes, ids, placed) => {
            const rs = apply(nodes, placed).filter(n => ids.includes(n.id)).map(n => ({
                left: n.x - n.w / 2, right: n.x + n.w / 2, top: n.y - n.h / 2, bottom: n.y + n.h / 2
            }))
            return {
                left: Math.min(...rs.map(r => r.left)),
                right: Math.max(...rs.map(r => r.right)),
                top: Math.min(...rs.map(r => r.top)),
                bottom: Math.max(...rs.map(r => r.bottom))
            }
        }

        it('keeps an unwired existing node where it is when nothing is in the way', () => {
            const nodes = [node('a', { x: 450, y: 300 })]
            const placed = layoutNodes({ nodes: [...nodes, node('other', { x: 100, y: 100 })], movableIds: ['a'] })
            placed.get('a').should.deepEqual({ x: 450, y: 300 })
        })

        it('tidies a whole group in place, left to right', () => {
            const nodes = [
                node('a', { x: 300, y: 260, g: 'g1', wires: [['b']] }),
                node('b', { x: 210, y: 380, g: 'g1', wires: [['c']] }),
                node('c', { x: 420, y: 300, g: 'g1' }),
                node('outside', { x: 900, y: 900 })
            ]
            const groups = [{ id: 'g1' }]
            const before = rectOf(nodes, ['a', 'b', 'c'], new Map())
            const placed = layoutNodes({ nodes, groups, movableIds: ['a', 'b', 'c'] })
            const a = placed.get('a')
            const b = placed.get('b')
            const c = placed.get('c')
            a.y.should.equal(b.y)
            b.y.should.equal(c.y)
            a.x.should.be.below(b.x)
            b.x.should.be.below(c.x)
            const after = rectOf(nodes, ['a', 'b', 'c'], placed)
            Math.abs(after.left - before.left).should.be.belowOrEqual(20)
            Math.abs(after.top - before.top).should.be.belowOrEqual(20)
            placed.has('outside').should.be.false()
        })

        it('rearranges a whole tab without groups overlapping each other or loose nodes', () => {
            const nodes = [
                node('a', { x: 500, y: 100, wires: [['b']] }),
                node('b', { x: 120, y: 140 }),
                node('g1a', { x: 200, y: 120, g: 'g1', wires: [['g1b']] }),
                node('g1b', { x: 260, y: 160, g: 'g1' }),
                node('g2a', { x: 240, y: 130, g: 'g2' }),
                node('g2b', { x: 280, y: 150, g: 'g2' })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: nodes.map(n => n.id) })
            placed.size.should.equal(6)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
            for (const p of placed.values()) {
                should((p.x - 50) % 20).equal(0)
                should(p.y % 20).equal(0)
            }
            const g1 = rectOf(nodes, ['g1a', 'g1b'], placed)
            const g2 = rectOf(nodes, ['g2a', 'g2b'], placed)
            const loose = rectOf(nodes, ['a', 'b'], placed)
            const pad = (r) => ({ left: r.left - 26, right: r.right + 26, top: r.top - 26, bottom: r.bottom + 26 })
            const apart = (p, q) => p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top
            apart(pad(g1), pad(g2)).should.be.true()
            apart(pad(g1), loose).should.be.true()
            apart(pad(g2), loose).should.be.true()
            // the tab keeps its top-left corner
            const all = rectOf(nodes, nodes.map(n => n.id), placed)
            all.top.should.be.aboveOrEqual(80)
        })

        it('keeps each flow of a rearranged tab where its first node was', () => {
            const nodes = [
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                node('a2', { x: 170, y: 220 }),
                node('b1', { x: 1210, y: 600, wires: [['b2']] }),
                node('b2', { x: 1100, y: 700 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            placed.get('a1').should.deepEqual({ x: 150, y: 100 })
            placed.get('a2').y.should.equal(100)
            placed.get('b1').should.deepEqual({ x: 1210, y: 600 })
            placed.get('b2').y.should.equal(600)
        })

        it('moves a flow down only when it would cover one placed before it', () => {
            const nodes = [
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                node('a2', { x: 150, y: 300 }),
                node('b1', { x: 310, y: 120, wires: [['b2']] }),
                node('b2', { x: 400, y: 160 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            placed.get('a1').should.deepEqual({ x: 150, y: 100 })
            placed.get('b1').x.should.equal(310)
            placed.get('b1').y.should.be.above(120)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('stacks the flows from the top-left corner when not anchored', () => {
            const nodes = [
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                node('a2', { x: 170, y: 220 }),
                node('b1', { x: 1210, y: 600, wires: [['b2']] }),
                node('b2', { x: 1100, y: 700 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id), anchor: false })
            placed.get('a1').should.deepEqual({ x: 150, y: 100 })
            placed.get('b1').x.should.equal(150)
            placed.get('b1').y.should.be.below(300)
        })

        it('keeps a rearranged tab off the canvas edges', () => {
            const placed = layoutNodes({ nodes: [node('a', { x: 7, y: 9 })], movableIds: ['a'] })
            const a = placed.get('a')
            ;(a.x - 50).should.be.aboveOrEqual(20)
            ;(a.y - 15).should.be.aboveOrEqual(20)
        })

        it('keeps a nested group inside its parent', () => {
            const nodes = [
                node('o1', { x: 100, y: 100, g: 'outer', wires: [['i1']] }),
                node('i1', { x: 300, y: 300, g: 'inner', wires: [['i2']] }),
                node('i2', { x: 140, y: 340, g: 'inner' })
            ]
            const groups = [{ id: 'outer' }, { id: 'inner', g: 'outer' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['o1', 'i1', 'i2'] })
            const inner = rectOf(nodes, ['i1', 'i2'], placed)
            const o1 = placed.get('o1')
            // o1 feeds the inner group, so the inner group sits to its right
            ;(inner.left - 26).should.be.above(o1.x + 50)
            placed.get('i1').y.should.equal(placed.get('i2').y)
            placed.get('i1').x.should.be.below(placed.get('i2').x)
        })

        it('moves a tidied group down past a fixed node it would cover, when not anchored', () => {
            const nodes = [
                node('a', { x: 160, y: 100, g: 'g1', wires: [['b']] }),
                node('b', { x: 160, y: 140, g: 'g1', wires: [['c']] }),
                node('c', { x: 160, y: 180, g: 'g1' }),
                node('fixed', { x: 400, y: 100 })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['a', 'b', 'c'], anchor: false })
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
            const g1 = rectOf(nodes, ['a', 'b', 'c'], placed)
            ;(g1.top - 26).should.be.aboveOrEqual(115)
        })

        it('lays out loose nodes next to a group whose nodes stay put', () => {
            const nodes = [
                node('m1', { x: 150, y: 100, g: 'g1', wires: [['new1']] }),
                node('new1', { g: 'g1', wires: [['new2']] }),
                node('new2', { g: 'g1' })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['new1', 'new2'] })
            placed.get('new1').should.deepEqual({ x: 330, y: 100 })
            placed.get('new2').should.deepEqual({ x: 510, y: 100 })
        })
    })

    describe('making room', () => {
        const canvas = { width: 8000, height: 8000 }
        const rectOfNode = (n) => ({ left: n.x - n.w / 2, right: n.x + n.w / 2, top: n.y - n.h / 2, bottom: n.y + n.h / 2 })
        const covers = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
        const within = (groups, gid, ancestor) => {
            for (let g = gid; g; g = groups.find(q => q.id === g)?.g) {
                if (g === ancestor) return true
            }
            return false
        }
        // Group boxes as the editor draws them: contents plus 26px padding, nested groups inside.
        const groupBoxes = (nodes, groups) => {
            const boxes = new Map()
            const boxOf = (gid) => {
                if (boxes.has(gid)) return boxes.get(gid)
                const rects = [
                    ...nodes.filter(n => n.g === gid).map(rectOfNode),
                    ...groups.filter(g => g.g === gid).map(g => boxOf(g.id))
                ]
                const box = {
                    left: Math.min(...rects.map(r => r.left)) - 26,
                    right: Math.max(...rects.map(r => r.right)) + 26,
                    top: Math.min(...rects.map(r => r.top)) - 26,
                    bottom: Math.max(...rects.map(r => r.bottom)) + 26
                }
                boxes.set(gid, box)
                return box
            }
            for (const g of groups) boxOf(g.id)
            return boxes
        }
        // No overlapping nodes, no group covering a node or group outside it, all inside the canvas.
        const checkClear = (nodes, groups, placed, size = canvas) => {
            const after = apply(nodes, placed)
            findOverlaps(after).should.have.lengthOf(0)
            for (const n of after) {
                const r = rectOfNode(n)
                r.left.should.be.aboveOrEqual(0)
                r.top.should.be.aboveOrEqual(0)
                r.right.should.be.belowOrEqual(size.width)
                r.bottom.should.be.belowOrEqual(size.height)
            }
            const boxes = groupBoxes(after, groups)
            for (const [gid, box] of boxes) {
                box.right.should.be.belowOrEqual(size.width)
                box.bottom.should.be.belowOrEqual(size.height)
                for (const n of after) {
                    if (within(groups, n.g, gid)) continue
                    covers(box, rectOfNode(n)).should.be.false(`group ${gid} covers ${n.id}`)
                }
                for (const [other, otherBox] of boxes) {
                    if (other === gid || within(groups, gid, other) || within(groups, other, gid)) continue
                    covers(box, otherBox).should.be.false(`groups ${gid} and ${other} overlap`)
                }
            }
        }
        // Every node in `ids` moved by the same amount; returns that amount.
        const movedTogether = (nodes, placed, ids) => {
            const deltas = ids.map(id => {
                const n = nodes.find(m => m.id === id)
                const p = placed.get(id) || n
                return `${p.x - n.x},${p.y - n.y}`
            })
            new Set(deltas).size.should.equal(1)
            return deltas[0].split(',').map(Number)
        }
        const topLeft = (nodes, placed, ids) => {
            const after = apply(nodes, placed).filter(n => ids.includes(n.id))
            return { left: Math.min(...after.map(n => n.x - n.w / 2)), top: Math.min(...after.map(n => n.y - n.h / 2)) }
        }
        const keptCorner = (nodes, placed, ids) => {
            const before = topLeft(nodes, new Map(), ids)
            const after = topLeft(nodes, placed, ids)
            Math.abs(after.left - before.left).should.be.belowOrEqual(20)
            Math.abs(after.top - before.top).should.be.belowOrEqual(20)
        }

        // A group of three stacked nodes that tidies into one wider row.
        const stacked = (g, x, y) => [
            node(`${g}a`, { x, y, g, wires: [[`${g}b`]] }),
            node(`${g}b`, { x, y: y + 40, g, wires: [[`${g}c`]] }),
            node(`${g}c`, { x, y: y + 80, g })
        ]
        const members = (g) => [`${g}a`, `${g}b`, `${g}c`]

        it('keeps a tidied group where it was and pushes a group it grows into to the right', () => {
            const nodes = [
                ...stacked('g1', 160, 100),
                node('r1', { x: 640, y: 120, g: 'g2', wires: [['r2']] }),
                node('r2', { x: 780, y: 120, g: 'g2' })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: members('g1'), canvas })
            checkClear(nodes, groups, placed)
            keptCorner(nodes, placed, members('g1'))
            const [dx, dy] = movedTogether(nodes, placed, ['r1', 'r2'])
            dx.should.be.above(0)
            dy.should.equal(0)
        })

        it('pushes a group below down, and whatever that group then covers', () => {
            const nodes = [
                node('a', { x: 160, y: 100, g: 'g1', wires: [['b', 'c']] }),
                node('b', { x: 160, y: 100, g: 'g1' }),
                node('c', { x: 160, y: 100, g: 'g1' }),
                node('m1', { x: 160, y: 200, g: 'g2', wires: [['m2']] }),
                node('m2', { x: 160, y: 240, g: 'g2' }),
                node('loose', { x: 160, y: 320 })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['a', 'b', 'c'], canvas })
            checkClear(nodes, groups, placed)
            const [, dy] = movedTogether(nodes, placed, ['m1', 'm2'])
            dy.should.be.above(0)
            placed.get('loose').y.should.be.above(320)
        })

        it('moves the groups nested in a pushed group along with it', () => {
            const nodes = [
                ...stacked('g1', 160, 100),
                node('o1', { x: 400, y: 120, g: 'outer', wires: [['i1']] }),
                node('i1', { x: 560, y: 140, g: 'inner', wires: [['i2']] }),
                node('i2', { x: 700, y: 140, g: 'inner' })
            ]
            const groups = [{ id: 'g1' }, { id: 'outer' }, { id: 'inner', g: 'outer' }]
            const placed = layoutNodes({ nodes, groups, movableIds: members('g1'), canvas })
            checkClear(nodes, groups, placed)
            const [dx, dy] = movedTogether(nodes, placed, ['o1', 'i1', 'i2'])
            ;(dx + dy).should.be.above(0)
        })

        it('grows the groups around a tidied nested group and pushes what they then cover', () => {
            const nodes = [
                ...stacked('inner', 160, 120),
                node('sibling', { x: 400, y: 140, g: 'outer' }),
                node('next', { x: 640, y: 140 })
            ]
            const groups = [{ id: 'outer' }, { id: 'inner', g: 'outer' }]
            const placed = layoutNodes({ nodes, groups, movableIds: members('inner'), canvas })
            checkClear(nodes, groups, placed)
            keptCorner(nodes, placed, members('inner'))
            placed.has('sibling').should.be.true()
            placed.has('next').should.be.true()
        })

        it('keeps the corner of a group that holds every node on the tab', () => {
            const nodes = [
                node('a', { x: 700, y: 300, g: 'g1', wires: [['b']] }),
                node('b', { x: 300, y: 340, g: 'g1', wires: [['c']] }),
                node('c', { x: 500, y: 380, g: 'g1' })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['a', 'b', 'c'], canvas })
            keptCorner(nodes, placed, ['a', 'b', 'c'])
        })

        it('moves nothing else when a tidied group gets smaller', () => {
            const nodes = [
                node('a', { x: 160, y: 100, g: 'g1', wires: [['b']] }),
                node('b', { x: 560, y: 100, g: 'g1' }),
                node('right', { x: 800, y: 100 }),
                node('below', { x: 160, y: 240 })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['a', 'b'], canvas })
            ;[...placed.keys()].sort().should.deepEqual(['a', 'b'])
        })

        it('leaves overlaps between nodes it does not touch alone', () => {
            const nodes = [
                ...stacked('g1', 160, 100),
                node('x1', { x: 1200, y: 600 }),
                node('x2', { x: 1220, y: 610 })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: members('g1'), canvas })
            placed.has('x1').should.be.false()
            placed.has('x2').should.be.false()
        })

        it('pushes right rather than past the bottom edge of the canvas', () => {
            const small = { width: 2000, height: 240 }
            const nodes = [
                node('a', { x: 160, y: 100, g: 'g1', wires: [['b', 'c']] }),
                node('b', { x: 160, y: 100, g: 'g1' }),
                node('c', { x: 160, y: 100, g: 'g1' }),
                node('low', { x: 160, y: 200 })
            ]
            const groups = [{ id: 'g1' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['a', 'b', 'c'], canvas: small })
            checkClear(nodes, groups, placed, small)
            placed.get('low').y.should.equal(200)
            placed.get('low').x.should.be.above(160)
        })

        it('moves the outputs of a new node right of it, including ones not in its way', () => {
            const nodes = [
                node('in1', { x: 160, y: 100, wires: [['new']] }),
                node('in2', { x: 160, y: 180, wires: [['new']] }),
                node('new', { wires: [['out1'], ['out2']] }),
                node('out1', { x: 380, y: 100 }),
                node('out2', { x: 380, y: 180 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['new'], canvas })
            const right = placed.get('new').x + 50
            ;(placed.get('out1').x - 50).should.be.aboveOrEqual(right + 80)
            ;(placed.get('out2').x - 50).should.be.aboveOrEqual(right + 80)
            checkClear(nodes, [], placed)
        })

        it('leaves a node that loops back to an earlier one where it is', () => {
            const nodes = [
                node('start', { x: 160, y: 100, g: 'g1', wires: [['retry']] }),
                node('retry', { x: 200, y: 140, g: 'g1', wires: [['back']] }),
                node('back', { x: 100, y: 300 })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['start', 'retry'], canvas })
            placed.has('back').should.be.false()
        })

        it('puts a new node fed by several existing ones level with the middle of them', () => {
            const nodes = [
                node('in1', { x: 160, y: 80, wires: [['join']] }),
                node('in2', { x: 160, y: 160, wires: [['join']] }),
                node('in3', { x: 160, y: 240, wires: [['join']] }),
                node('join')
            ]
            const placed = layoutNodes({ nodes, movableIds: ['join'], canvas })
            placed.get('join').y.should.equal(160)
        })

        it('pushes a group right when it already sits close to the bottom edge', () => {
            const small = { width: 1400, height: 260 }
            const nodes = [
                node('a1', { x: 160, y: 60, g: 'g1', wires: [['a2', 'a3']] }),
                node('a2', { x: 180, y: 80, g: 'g1' }),
                node('a3', { x: 200, y: 100, g: 'g1' }),
                node('b1', { x: 140, y: 200, g: 'g2', wires: [['b2']] }),
                node('b2', { x: 300, y: 200, g: 'g2' })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['a1', 'a2', 'a3'], canvas: small })
            placed.get('a1').x.should.be.below(300)
            placed.get('b1').y.should.equal(200)
            placed.get('b1').x.should.be.above(140)
        })

        it('fails without moving anything when the set fits nowhere inside the canvas', () => {
            const small = { width: 800, height: 220 }
            const nodes = [
                ...stacked('g1', 100, 80),
                node('wall', { x: 520, y: 100, w: 500 }),
                node('floor', { x: 400, y: 190, w: 760 })
            ]
            const groups = [{ id: 'g1' }]
            ;(() => layoutNodes({ nodes, groups, movableIds: members('g1'), canvas: small })).should.throw(/no free space on the canvas/)
        })

        it('does not push anything when not anchored', () => {
            const nodes = [
                ...stacked('g1', 160, 100),
                node('r1', { x: 400, y: 120, g: 'g2' })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: members('g1'), anchor: false, canvas })
            placed.has('r1').should.be.false()
            checkClear(nodes, groups, placed)
        })

        it('tidies two groups in one call without them pushing each other', () => {
            const nodes = [
                ...stacked('g1', 160, 100),
                ...stacked('g2', 400, 100),
                node('fixed', { x: 900, y: 140 })
            ]
            const groups = [{ id: 'g1' }, { id: 'g2' }]
            const placed = layoutNodes({ nodes, groups, movableIds: [...members('g1'), ...members('g2')], canvas })
            checkClear(nodes, groups, placed)
            keptCorner(nodes, placed, members('g1'))
        })

        it('keeps outputs in port order when new nodes make room', () => {
            const nodes = [
                node('sw', { x: 150, y: 100, h: 45, wires: [['a'], ['b'], ['c']] }),
                node('a'),
                node('b'),
                node('c'),
                node('blocker', { x: 330, y: 160 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['a', 'b', 'c'], canvas })
            checkClear(nodes, [], placed)
            const ys = ['a', 'b', 'c'].map(id => placed.get(id).y)
            ys.should.deepEqual([...ys].sort((p, q) => p - q))
            placed.get('b').y.should.equal(100)
        })

        it('centres new nodes on the outputs of one node on it, in port order', () => {
            const nodes = [
                node('sw', { x: 150, y: 300, h: 45, wires: [['a'], ['b'], ['c', 'd']] }),
                node('a', { x: 200, y: 500 }),
                node('b', { x: 200, y: 400 }),
                node('d', { x: 200, y: 450 }),
                node('c', { x: 200, y: 600 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['a', 'b', 'c', 'd'], canvas })
            const ys = ['a', 'b', 'd', 'c'].map(id => placed.get(id).y)
            ys.should.deepEqual([...ys].sort((p, q) => p - q))
            ;((ys[0] + ys[3]) / 2).should.be.approximately(300, 10)
        })

        it('moves what new nodes feed to the right, so its wires still run left to right', () => {
            const nodes = [
                node('in', { x: 150, y: 100, wires: [['n1']] }),
                node('n1', { wires: [['n2']] }),
                node('n2', { wires: [['out']] }),
                node('out', { x: 330, y: 100, wires: [['next']] }),
                node('next', { x: 520, y: 100 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['n1', 'n2'], canvas })
            checkClear(nodes, [], placed)
            const after = apply(nodes, placed)
            const at = (id) => after.find(n => n.id === id)
            at('out').y.should.equal(100)
            at('out').x.should.be.above(at('n2').x)
            at('next').y.should.equal(100)
            at('next').x.should.be.above(at('out').x)
        })

        it('tidies a group with several inputs from outside and several outputs leaving it', () => {
            const nodes = [
                node('in1', { x: 100, y: 100, wires: [['merge']] }),
                node('in2', { x: 100, y: 200, wires: [['merge']] }),
                node('merge', { x: 380, y: 260, g: 'g1', wires: [['sw']] }),
                node('sw', { x: 360, y: 160, h: 45, g: 'g1', wires: [['o1'], ['o2'], ['inner']] }),
                node('inner', { x: 400, y: 120, g: 'g1' }),
                node('o1', { x: 800, y: 100 }),
                node('o2', { x: 800, y: 200 })
            ]
            const groups = [{ id: 'g1' }]
            const placed = layoutNodes({ nodes, groups, movableIds: ['merge', 'sw', 'inner'], canvas })
            checkClear(nodes, groups, placed)
            const after = apply(nodes, placed)
            const at = (id) => after.find(n => n.id === id)
            at('merge').x.should.be.below(at('sw').x)
            at('sw').x.should.be.below(at('inner').x)
            // the third output is below the placeholders for the two that leave the group
            at('inner').y.should.be.aboveOrEqual(at('sw').y)
            at('o1').y.should.be.below(at('o2').y)
        })

        it('lines a merge up with its fixed feeders, keeps its outputs in order and pushes what it lands on', () => {
            const nodes = [
                node('in1', { x: 150, y: 100, wires: [['merge']] }),
                node('in2', { x: 150, y: 200, wires: [['merge']] }),
                node('merge', { h: 45, wires: [['out1'], ['out2']] }),
                node('out1'),
                node('out2'),
                node('blocker', { x: 500, y: 140, w: 300 })
            ]
            const placed = layoutNodes({ nodes, movableIds: ['merge', 'out1', 'out2'], canvas })
            checkClear(nodes, [], placed)
            placed.get('merge').x.should.be.above(200)
            placed.get('out1').y.should.be.below(placed.get('out2').y)
            placed.has('blocker').should.be.true()
        })
    })

    describe('comments', () => {
        const comment = (id, props) => node(id, { comment: true, ...props })
        const left = (p, n) => p.x - n.w / 2
        const bottom = (p, n) => p.y + n.h / 2
        const top = (p, n) => p.y - n.h / 2

        it('puts a comment above the left edge of the flow it sits nearest to', () => {
            const nodes = [
                comment('note', { x: 600, y: 420 }),
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                node('a2', { x: 400, y: 160 }),
                node('b1', { x: 150, y: 400, wires: [['b2']] }),
                node('b2', { x: 400, y: 460 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const at = (id) => placed.get(id)
            const n = (id) => nodes.find(x => x.id === id)
            left(at('note'), n('note')).should.equal(left(at('b1'), n('b1')))
            bottom(at('note'), n('note')).should.be.belowOrEqual(top(at('b1'), n('b1')))
            top(at('note'), n('note')).should.be.above(bottom(at('a2'), n('a2')))
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps the first node of a flow where it was rather than its comment', () => {
            const nodes = [
                comment('note', { x: 500, y: 100 }),
                node('a1', { x: 150, y: 200, wires: [['a2']] }),
                node('a2', { x: 400, y: 260 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            placed.get('a1').should.deepEqual({ x: 150, y: 200 })
            placed.get('note').x.should.equal(150)
            placed.get('note').y.should.be.below(200)
        })

        it('keeps several comments of one flow in the order they were from the top', () => {
            const nodes = [
                comment('second', { x: 500, y: 140 }),
                comment('first', { x: 300, y: 80 }),
                node('a1', { x: 150, y: 300, wires: [['a2']] }),
                node('a2', { x: 400, y: 300 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            placed.get('first').y.should.be.below(placed.get('second').y)
            placed.get('first').x.should.equal(placed.get('second').x)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps each comment above its own row when the rows join into one flow', () => {
            const nodes = [
                comment('noteA', { x: 300, y: 60 }),
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                node('a2', { x: 400, y: 100, wires: [['out']] }),
                comment('noteB', { x: 300, y: 160 }),
                node('b1', { x: 150, y: 200, wires: [['b2']] }),
                node('b2', { x: 400, y: 200, wires: [['out']] }),
                comment('noteC', { x: 300, y: 260 }),
                node('c1', { x: 150, y: 300, wires: [['out']] }),
                node('out', { x: 650, y: 200 })
            ]
            const placed = layoutNodes({ nodes, movableIds: nodes.map(n => n.id) })
            const at = (id) => placed.get(id)
            const n = (id) => nodes.find(x => x.id === id)
            const order = ['noteA', 'a1', 'noteB', 'b1', 'noteC', 'c1']
            for (let i = 1; i < order.length; i++) {
                top(at(order[i]), n(order[i])).should.be.aboveOrEqual(bottom(at(order[i - 1]), n(order[i - 1])))
            }
            for (const id of ['noteB', 'noteC']) left(at(id), n(id)).should.equal(left(at('noteA'), n('noteA')))
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('puts a comment in a group above the left edge of the rest of the group', () => {
            const nodes = [
                comment('note', { x: 500, y: 120, g: 'g1' }),
                node('a1', { x: 150, y: 200, g: 'g1', wires: [['a2']] }),
                node('a2', { x: 400, y: 160, g: 'g1' })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['g1', ...nodes.map(n => n.id)] })
            const a1 = placed.get('a1')
            left(placed.get('note'), nodes[0]).should.equal(left(a1, nodes[1]))
            bottom(placed.get('note'), nodes[0]).should.be.belowOrEqual(top(a1, nodes[1]))
            bottom(placed.get('note'), nodes[0]).should.be.belowOrEqual(top(placed.get('a2'), nodes[2]))
        })

        it('keeps nodes outside a group level with the node a comment in the group sits above', () => {
            const nodes = [
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                comment('note', { x: 400, y: 60, g: 'g1' }),
                node('a2', { x: 400, y: 100, g: 'g1', wires: [['a3']] }),
                node('a3', { x: 650, y: 100 })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['g1', ...nodes.map(n => n.id)] })
            bottom(placed.get('note'), nodes[1]).should.be.belowOrEqual(top(placed.get('a2'), nodes[2]))
            left(placed.get('note'), nodes[1]).should.equal(left(placed.get('a2'), nodes[2]))
            placed.get('a3').y.should.equal(placed.get('a2').y)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('keeps a group on its row when a comment above the row makes room', () => {
            const nodes = [
                comment('row', { x: 150, y: 60 }),
                node('a1', { x: 150, y: 100, wires: [['a2']] }),
                comment('note', { x: 600, y: 60, g: 'g1' }),
                node('a2', { x: 400, y: 100, g: 'g1' })
            ]
            const placed = layoutNodes({ nodes, groups: [{ id: 'g1' }], movableIds: ['g1', ...nodes.map(n => n.id)] })
            placed.get('a2').y.should.equal(placed.get('a1').y)
            bottom(placed.get('note'), nodes[2]).should.be.belowOrEqual(top(placed.get('a2'), nodes[3]))
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })

        it('lays out a tab that only holds comments', () => {
            const nodes = [comment('c1', { x: 100, y: 100 }), comment('c2', { x: 400, y: 100 })]
            const placed = layoutNodes({ nodes, movableIds: ['c1', 'c2'] })
            placed.size.should.equal(2)
            findOverlaps(apply(nodes, placed)).should.have.lengthOf(0)
        })
    })

    describe('findOverlaps', () => {
        it('reports pairs that overlap, counting buttons', () => {
            const nodes = [
                node('a', { x: 100, y: 100 }),
                node('b', { x: 215, y: 100, button: 'left' }),
                node('c', { x: 500, y: 100 })
            ]
            findOverlaps(nodes).should.deepEqual([['a', 'b']])
        })
    })
})
