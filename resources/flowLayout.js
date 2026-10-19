// Lays out a chosen set of nodes on one tab, moving other nodes only to make room for them.
// Pure functions: the caller measures the nodes and applies the returned positions.
//
// A group whose nodes are all being laid out is arranged inside and then moved as one
// block, keeping its top-left corner. When every node on the tab is being laid out, the
// whole tab is rearranged from its top-left corner.

import dagre from './vendor/dagre.esm.js'

// The editor pads a group 26px around its contents when it recomputes the group bounds.
const GROUP_PADDING = 26
// The editor draws output ports this far apart, centred on the node.
const PORT_SPACING = 13
// Gaps are sized for the editor's default 20px grid, and in whole cells of a finer one.
const DEFAULT_GRID = 20
// Height of a node with a single line label, as the editor draws it.
const NODE_HEIGHT = 30
// Inject/debug style buttons draw outside the node's own width.
const BUTTON_WIDTH = 20
const ROOT = ''
const NO_ROOM = 'There is no free space on the canvas for these nodes, so nothing was moved'

/**
 * @typedef {Object} LayoutNode
 * @property {string} id
 * @property {number} x - centre x
 * @property {number} y - centre y
 * @property {number} w
 * @property {number} h
 * @property {string} [g] - id of the innermost group the node is in
 * @property {'left'|'right'} [button] - side of the node a button is drawn on
 * @property {boolean} [comment] - a comment node, kept above the left edge of what it sits nearest to
 * @property {string[][]} [wires]
 */

/**
 * @typedef {Object} LayoutGroup
 * @property {string} id
 * @property {string} [g] - parent group id
 * @property {{x: number, y: number, w: number, h: number}} [bounds] - the editor's current bounds, if known
 */

const leftExtra = (n) => (n.button === 'left' ? BUTTON_WIDTH : 0)
const fullWidth = (n) => n.w + leftExtra(n) + (n.button === 'right' ? BUTTON_WIDTH : 0)

function nodeRect (n, x = n.x, y = n.y) {
    return {
        left: x - n.w / 2 - (n.button === 'left' ? BUTTON_WIDTH : 0),
        right: x + n.w / 2 + (n.button === 'right' ? BUTTON_WIDTH : 0),
        top: y - n.h / 2,
        bottom: y + n.h / 2
    }
}

function inflate (r, d) {
    return { left: r.left - d, right: r.right + d, top: r.top - d, bottom: r.bottom + d }
}

function translate (r, dx, dy) {
    return { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy }
}

function union (a, b) {
    if (!a) return b
    if (!b) return a
    return {
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
        top: Math.min(a.top, b.top),
        bottom: Math.max(a.bottom, b.bottom)
    }
}

function intersects (a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

// Distance between the closest edges of two rectangles; 0 when they overlap.
function gapBetween (a, b) {
    return Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom))
}

// What a comment at `rect` describes: the nearest item level with it or below it, or the
// nearest item when there is none.
function commentHost (rect, items, rectOf) {
    const nearest = (list) => list.reduce((best, u) => (best === null || gapBetween(rect, rectOf(u)) < gapBetween(rect, rectOf(best)) ? u : best), null)
    return nearest(items.filter(u => rectOf(u).top >= rect.top)) ?? nearest(items)
}

function isFiniteRect (r) {
    return !!r && [r.left, r.right, r.top, r.bottom].every(Number.isFinite)
}

/**
 * Pairs of nodes whose drawn areas (including buttons) overlap.
 * @param {LayoutNode[]} nodes
 * @returns {string[][]}
 */
export function findOverlaps (nodes) {
    const overlaps = []
    for (let i = 0; i < nodes.length; i++) {
        const a = nodeRect(nodes[i])
        for (let j = i + 1; j < nodes.length; j++) {
            if (intersects(a, nodeRect(nodes[j]))) {
                overlaps.push([nodes[i].id, nodes[j].id])
            }
        }
    }
    return overlaps
}

/**
 * Compute positions for the movable nodes. Other nodes are wiring anchors and obstacles; when
 * anchored, those in the way are moved too and their new positions are returned with the rest.
 * @param {Object} options
 * @param {LayoutNode[]} options.nodes - every non-config node and junction on the tab
 * @param {LayoutGroup[]} [options.groups] - every group on the tab
 * @param {string[]} options.movableIds - node ids to lay out, in the order the caller listed them
 * @param {number} [options.gridSize]
 * @param {boolean} [options.anchor] - keep the nodes where they are, or next to what they are wired
 *   to, and move other nodes down or right out of their way; when a whole tab is rearranged, keep
 *   each flow where its first node was. Otherwise nothing else moves: the nodes go to free space
 *   and the flows of a whole tab are stacked from its top-left corner
 * @param {number} [options.maxWidth] - a flow wider than this carries on in a new row below; 0 never wraps
 * @param {{width: number, height: number}} [options.canvas] - size of the editor canvas; nothing is
 *   placed past its right or bottom edge, and a flow wider than it wraps whatever maxWidth is
 * @returns {Map<string, {x: number, y: number}>}
 * @throws when the nodes fit nowhere inside the canvas
 */
export function layoutNodes ({ nodes, groups = [], movableIds, gridSize = 20, anchor = true, maxWidth = 1600, canvas = { width: 8000, height: 8000 } }) {
    const grid = gridSize > 0 ? gridSize : 20
    // Unit of every gap: whole grid cells at least as wide as a default grid cell, so a
    // fine grid does not pack the nodes against each other.
    const step = Math.ceil(DEFAULT_GRID / grid) * grid
    const spacing = { grid, columnGap: step * 4, rowGap: step * 1.5, clearance: step }
    const { columnGap, rowGap } = spacing
    const wrapWidth = Math.min(maxWidth > 0 ? maxWidth : Infinity, canvas.width - step * 2)
    // Highest a wrapped row's top may be, below a row ending at `bottom`. A node fits halfway
    // between the rows, centred on a grid line, with space clear above and below it: three
    // cells of a grid finer than 10px, otherwise a grid cell up to 10px.
    const nextRowTop = (bottom) => {
        const clear = grid < 10 ? grid * 3 : Math.min(grid, 10)
        const middle = Math.ceil((bottom + clear + NODE_HEIGHT / 2) / grid) * grid
        return middle + NODE_HEIGHT / 2 + clear
    }

    // Offset that keeps `rect` clear of the canvas edges, pulled back left and up when it
    // would run past the right or bottom edge. `pad` is how far groups around it will grow.
    const inCanvas = (rect, { dx, dy }, pad = 0) => {
        const maxDx = Math.floor((canvas.width - step - pad - rect.right) / grid) * grid
        const maxDy = Math.floor((canvas.height - step - pad - rect.bottom) / grid) * grid
        return {
            dx: Math.max(Math.min(dx, maxDx), Math.ceil((step - rect.left) / grid) * grid),
            dy: Math.max(Math.min(dy, maxDy), Math.ceil((step - rect.top) / grid) * grid)
        }
    }
    const fitsCanvas = (rect, { dx, dy }, pad = 0) => rect.right + dx + pad <= canvas.width - step && rect.bottom + dy + pad <= canvas.height - step
    // A pushed node only has to fit along the way it moves, so one already close to the
    // bottom edge can still move right.
    const staysInCanvas = (rect, { dx, dy }, pad = 0) => (dx === 0 || rect.right + dx + pad <= canvas.width - step) && (dy === 0 || rect.bottom + dy + pad <= canvas.height - step)
    // Keep a set clear of the obstacles and inside the canvas, as near `offset` as it can be.
    // When moving it down would take it past the bottom edge, it goes to the free spot
    // nearest `offset`, next to an obstacle or against the canvas edges.
    const settleInCanvas = (unitRects, rect, obstacles, offset, pad = 0) => {
        const start = inCanvas(rect, offset, pad)
        const down = { dx: start.dx, dy: clearDown(unitRects, obstacles, start, spacing) }
        if (fitsCanvas(rect, down, pad)) return down
        const minDx = Math.ceil((step - rect.left) / grid) * grid
        const minDy = Math.ceil((step - rect.top) / grid) * grid
        const xs = new Set([start.dx, minDx])
        const ys = new Set([start.dy, minDy])
        for (const o of obstacles) {
            const gap = o.pad + spacing.clearance
            xs.add(Math.ceil((o.rect.right + gap - rect.left) / grid) * grid)
            ys.add(Math.ceil((o.rect.bottom + gap - rect.top) / grid) * grid)
        }
        const spots = []
        for (const dx of xs) {
            for (const dy of ys) {
                if (dx >= minDx && dy >= minDy && fitsCanvas(rect, { dx, dy }, pad)) spots.push({ dx, dy })
            }
        }
        spots.sort((a, b) => Math.hypot(a.dx - offset.dx, a.dy - offset.dy) - Math.hypot(b.dx - offset.dx, b.dy - offset.dy))
        return spots.find(o => clearDown(unitRects, obstacles, o, spacing) === o.dy) || down
    }

    const byId = new Map(nodes.map(n => [n.id, n]))
    const groupsById = new Map(groups.map(g => [g.id, g]))
    const movable = movableIds.filter((id, i) => byId.has(id) && movableIds.indexOf(id) === i)
    const movableSet = new Set(movable)
    const order = new Map(movable.map((id, i) => [id, i]))
    const placed = new Map()

    const parentOf = (gid) => {
        const parent = groupsById.get(gid)?.g
        return parent && groupsById.has(parent) ? parent : ROOT
    }
    const containerOf = (n) => (n.g && groupsById.has(n.g) ? n.g : ROOT)

    const chainCache = new Map()
    const chainOf = (container) => {
        if (!chainCache.has(container)) {
            const chain = []
            let current = container
            while (current !== ROOT && !chain.includes(current)) {
                chain.push(current)
                current = parentOf(current)
            }
            chainCache.set(container, chain)
        }
        return chainCache.get(container)
    }

    const successors = new Map(nodes.map(n => [n.id, []]))
    const predecessors = new Map(nodes.map(n => [n.id, []]))
    // [output port, target id] for every wire
    const outputs = new Map(nodes.map(n => [n.id, []]))
    for (const n of nodes) {
        for (const [port, targets] of (n.wires || []).entries()) {
            for (const target of targets || []) {
                if (!byId.has(target) || target === n.id) continue
                successors.get(n.id).push(target)
                predecessors.get(target).push(n.id)
                outputs.get(n.id).push([port, target])
            }
        }
    }

    const childNodes = new Map()
    const childGroups = new Map()
    for (const n of nodes) {
        const c = containerOf(n)
        if (!childNodes.has(c)) childNodes.set(c, [])
        childNodes.get(c).push(n.id)
    }
    for (const g of groups) {
        const p = parentOf(g.id)
        if (!childGroups.has(p)) childGroups.set(p, [])
        childGroups.get(p).push(g.id)
    }

    const descendantCache = new Map()
    const descendants = (container, trail = new Set()) => {
        if (descendantCache.has(container)) return descendantCache.get(container)
        trail.add(container)
        const ids = [...(childNodes.get(container) || [])]
        for (const child of childGroups.get(container) || []) {
            if (!trail.has(child)) ids.push(...descendants(child, trail))
        }
        descendantCache.set(container, ids)
        return ids
    }
    // A container is laid out as a whole when every node in it is movable.
    const isWhole = (container) => {
        const ids = descendants(container)
        return ids.length > 0 && ids.every(id => movableSet.has(id))
    }

    // The item directly inside `container` that holds the node: the node itself or a group.
    const unitIn = (nodeId, container) => {
        let current = containerOf(byId.get(nodeId))
        if (current === container) return nodeId
        while (current !== ROOT) {
            const parent = parentOf(current)
            if (parent === container) return current
            current = parent
        }
        return null
    }
    const unitNodes = (unit) => (byId.has(unit) ? [unit] : descendants(unit))

    const groupOriginalRect = (gid) => {
        const b = groupsById.get(gid)?.bounds
        if (b && b.w > 0 && b.h > 0 && [b.x, b.y].every(Number.isFinite)) {
            return { left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h }
        }
        let rect = null
        for (const id of descendants(gid)) rect = union(rect, nodeRect(byId.get(id)))
        return rect && inflate(rect, GROUP_PADDING)
    }
    const originalRect = (unit) => (byId.has(unit) ? nodeRect(byId.get(unit)) : groupOriginalRect(unit))
    const firstOrder = (unit) => Math.min(...unitNodes(unit).map(id => order.get(id) ?? Infinity))

    // Wires between units of one container, following the nodes inside each group.
    const unitGraph = (units, container) => {
        const unitSet = new Set(units)
        const succ = new Map(units.map(u => [u, new Set()]))
        const pred = new Map(units.map(u => [u, new Set()]))
        for (const unit of units) {
            for (const id of unitNodes(unit)) {
                for (const target of successors.get(id)) {
                    const other = unitIn(target, container)
                    if (other && other !== unit && unitSet.has(other)) {
                        succ.get(unit).add(other)
                        pred.get(other).add(unit)
                    }
                }
            }
        }
        // A comment goes with the unit it describes.
        const isComment = (u) => byId.get(u)?.comment
        const hosts = units.filter(u => !isComment(u) && isFiniteRect(originalRect(u)))
        for (const unit of units.filter(isComment)) {
            const rect = originalRect(unit)
            if (!isFiniteRect(rect) || hosts.length === 0) continue
            const host = commentHost(rect, hosts, originalRect)
            succ.get(unit).add(host)
            pred.get(host).add(unit)
        }
        return {
            succs: (u) => [...succ.get(u)],
            preds: (u) => [...pred.get(u)]
        }
    }

    const sortUnits = (units) => [...units].sort((a, b) => firstOrder(a) - firstOrder(b))

    // Lay out one connected set of units left to right. Whole groups go to dagre as
    // clusters, so their nodes stay together and wires between groups are untangled
    // with the rest. Returns node positions and the rectangles of the units, groups
    // including their padding.
    const arrangeSet = (units, width = wrapWidth) => {
        const clusterParent = new Map()
        const allIds = []
        const addGroup = (gid, parent) => {
            if (clusterParent.has(gid)) return
            clusterParent.set(gid, parent)
            allIds.push(...(childNodes.get(gid) || []))
            for (const child of childGroups.get(gid) || []) addGroup(child, gid)
        }
        for (const unit of units) {
            if (byId.has(unit)) {
                allIds.push(unit)
            } else {
                addGroup(unit, null)
            }
        }
        // Comments are placed once the rest is laid out, unless there is nothing else.
        const comments = allIds.filter(id => byId.get(id).comment)
        const nodeIds = comments.length < allIds.length ? allIds.filter(id => !comments.includes(id)) : allIds
        const inSet = new Set(nodeIds)
        const clusterOf = (id) => {
            const c = containerOf(byId.get(id))
            return clusterParent.has(c) ? c : null
        }
        const clustersOf = (id) => {
            const chain = []
            for (let c = clusterOf(id); c; c = clusterParent.get(c)) chain.push(c)
            return chain
        }

        const g = new dagre.graphlib.Graph({ compound: true })
        g.setGraph({ rankdir: 'LR', nodesep: rowGap, ranksep: columnGap })
        g.setDefaultEdgeLabel(() => ({}))
        for (const gid of clusterParent.keys()) g.setNode(`group:${gid}`, {})
        for (const [gid, parent] of clusterParent) {
            if (parent) g.setParent(`group:${gid}`, `group:${parent}`)
        }
        const setParent = (v, id) => {
            const c = clusterOf(id)
            if (c) g.setParent(v, `group:${c}`)
        }
        for (const id of nodeIds) {
            g.setNode(id, { width: fullWidth(byId.get(id)), height: byId.get(id).h })
            setParent(id, id)
        }
        // [port, dagre node] for each wire out of a node. A wire leaving the set ends on a
        // placeholder, so it still takes its row among the outputs next to it.
        const outgoing = new Map(nodeIds.map(id => [id, new Map()]))
        for (const id of nodeIds) {
            for (const [port, target] of outputs.get(id)) {
                let to = target
                if (!inSet.has(target)) {
                    to = `out:${id}:${port}`
                    if (!g.hasNode(to)) {
                        g.setNode(to, { width: grid, height: grid })
                        setParent(to, id)
                    }
                }
                g.setEdge(id, to)
                outgoing.get(id).set(to, Math.min(outgoing.get(id).get(to) ?? Infinity, port))
            }
        }
        // Every node nothing feeds starts in the first column, as a heavy wire from one start
        // node keeps them all next to it.
        const starts = nodeIds.filter(id => g.predecessors(id).length === 0)
        if (starts.length > 1) {
            g.setNode('start:', { width: 0, height: 0 })
            for (const id of starts) g.setEdge('start:', id, { weight: nodeIds.length * 10 })
        }
        dagre.layout(g)
        if (g.hasNode('start:')) g.removeNode('start:')

        // Units in the same rank share dagre's x.
        const rankXs = [...new Set(g.nodes().filter(v => !v.startsWith('group:')).map(v => Math.round(g.node(v).x)))].sort((a, b) => a - b)
        const rankOf = (v) => rankXs.indexOf(Math.round(g.node(v).x))
        const columns = rankXs.map(() => [])
        for (const id of nodeIds) columns[rankOf(id)].push(id)
        const y = new Map(g.nodes().map(v => [v, g.node(v).y]))

        // dagre does not know about output ports. The outputs of a node are put back in port
        // order, first port on top, on the rows dagre gave them, and nodes on the same port
        // in the order they had before. A wire that reaches further
        // than the next column keeps its row there, and only nodes fed by that one node and
        // in the same group move.
        const rowAt = (from, to, x) => {
            if (Math.round(g.node(to).x) === x) return y.get(to)
            let best = null
            for (const p of g.edge(from, to)?.points || []) {
                if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) best = p
            }
            return best ? best.y : y.get(to)
        }
        // The first column keeps the order its nodes had from the top, and every column
        // after it follows what feeds it, so flows stay in the order they were.
        const changedRanks = new Set([0])
        const before = (id) => (Number.isFinite(byId.get(id).y) ? byId.get(id).y : Infinity)
        // Where each node comes in that order: its row in the first column, then the average of
        // what feeds it, so a column holding a single node does not lose the order.
        const place = new Map()
        const fedFrom = (id) => g.predecessors(id).filter(p => place.has(p))
        for (let rank = 0; rank < columns.length; rank++) {
            if (changedRanks.has(rank)) {
                const byCluster = new Map()
                for (const id of columns[rank]) {
                    const c = clusterOf(id)
                    if (!byCluster.has(c)) byCluster.set(c, [])
                    byCluster.get(c).push(id)
                }
                for (const ids of byCluster.values()) {
                    const key = (id) => {
                        if (rank === 0) return before(id)
                        const from = fedFrom(id)
                        return from.length ? from.reduce((sum, p) => sum + place.get(p), 0) / from.length : y.get(id)
                    }
                    const keys = new Map(ids.map(id => [id, key(id)]))
                    const rows = ids.map(id => y.get(id)).sort((a, b) => a - b)
                    const sorted = [...ids].sort((a, b) => keys.get(a) - keys.get(b) || y.get(a) - y.get(b))
                    sorted.forEach((id, i) => y.set(id, rows[i]))
                }
                changedRanks.add(rank + 1)
            }
            for (const id of columns[rank]) {
                const from = fedFrom(id)
                // Nodes fed by the same nodes keep the rows they were given between them.
                place.set(id, rank > 0 && from.length ? from.reduce((sum, p) => sum + place.get(p), 0) / from.length + y.get(id) / 1e6 : y.get(id))
            }
            for (const id of columns[rank]) {
                const outs = [...outgoing.get(id)]
                const nextX = rankXs[rank + 1]
                if (nextX === undefined || outs.length < 2) continue
                const entries = []
                for (const [wire, [to, port]] of outs.entries()) {
                    const isNode = inSet.has(to)
                    const movable = isNode && rankOf(to) === rank + 1 && g.predecessors(to).length === 1 && clusterOf(to) === clusterOf(id)
                    if (isNode && rankOf(to) === rank + 1 && !movable) continue
                    const before = byId.get(to)?.y
                    entries.push({ to, port, wire, before: Number.isFinite(before) ? before : Infinity, movable, row: movable ? y.get(to) : rowAt(id, to, nextX) })
                }
                const rows = entries.map(e => e.row).sort((a, b) => a - b)
                // Wires on the same port keep the order their nodes had, or the order they were wired.
                entries.sort((a, b) => a.port - b.port || (a.movable && b.movable ? a.before - b.before || a.wire - b.wire : a.row - b.row))
                entries.forEach((e, i) => {
                    if (e.movable && y.get(e.to) !== rows[i]) {
                        y.set(e.to, rows[i])
                        changedRanks.add(rank + 1)
                    }
                })
            }
        }

        // Rows first, column by column. A node fed by a single node that feeds nothing else
        // lines up with it. A node fed by several sits at the average height of the output
        // ports wired into it. Any other node keeps the row it was given. Each column then
        // sits as close to those rows as its order and gaps allow, on the grid.
        const crossedGroups = (a, b) => {
            const ca = clustersOf(a)
            const cb = clustersOf(b)
            return ca.filter(c => !cb.includes(c)).length + cb.filter(c => !ca.includes(c)).length
        }
        const positions = new Map()
        const portY = (from, to) => {
            const count = (byId.get(from).wires || []).length
            return positions.get(from).y + (outgoing.get(from).get(to) - (count - 1) / 2) * PORT_SPACING
        }
        for (const column of columns) {
            column.sort((a, b) => y.get(a) - y.get(b))
            const fedBy = (id) => g.predecessors(id).filter(p => positions.has(p))
            const wanted = column.map(id => {
                const from = fedBy(id)
                // Nodes fed only by one node that feeds nothing else are centred on it together.
                if (from.length === 1 && g.successors(from[0]).every(s => column.includes(s) && fedBy(s).length === 1)) {
                    const block = column.filter(s => g.successors(from[0]).includes(s))
                    const height = block.reduce((sum, s) => sum + byId.get(s).h + step, -step)
                    const centre = positions.get(from[0]).y
                    let top = centre - height / 2
                    for (const s of block) {
                        // Whole grid cells either side, so the block stays centred once snapped.
                        const offset = top + byId.get(s).h / 2 - centre
                        if (s === id) return centre + Math.sign(offset) * Math.ceil(Math.abs(offset) / grid) * grid
                        top += byId.get(s).h + step
                    }
                }
                if (from.length > 1) return from.reduce((sum, p) => sum + portY(p, id), 0) / from.length
                return y.get(id)
            })
            const gaps = column.map((id, i) => {
                if (i === 0) return 0
                const gap = step + crossedGroups(column[i - 1], id) * GROUP_PADDING
                return byId.get(column[i - 1]).h / 2 + gap + byId.get(id).h / 2
            })
            const rows = closestRows(wanted, gaps)
            let previous = null
            column.forEach((id, i) => {
                let centre = Math.round(rows[i] / grid) * grid
                if (previous !== null) centre = Math.max(centre, Math.ceil((previous + gaps[i]) / grid) * grid)
                positions.set(id, { x: 0, y: centre })
                previous = centre
            })
        }

        // Then each node goes as far left as it can: a column gap right of what feeds it,
        // and clear of any node or group further left that shares its rows. A wide node
        // only pushes along what is level with it, not the whole of the next column.
        const placedSoFar = []
        for (const column of columns) {
            for (const id of column) {
                const s = byId.get(id)
                const top = positions.get(id).y - s.h / 2
                const bottom = positions.get(id).y + s.h / 2
                const feeders = new Set(g.predecessors(id))
                let left = 0
                // Outlines of the groups further left that this node is not in, with the
                // padding of each level inside them, and how many of this node's own groups
                // lie between them and it.
                const groupRects = new Map()
                for (const other of placedSoFar) {
                    const crossed = crossedGroups(other, id)
                    const r = nodeRect(byId.get(other), positions.get(other).x, positions.get(other).y)
                    const padding = step + crossed * GROUP_PADDING
                    const level = top < r.bottom + padding && r.top < bottom + padding
                    if (feeders.has(other)) left = Math.max(left, r.right + Math.max(columnGap, padding))
                    if (level) left = Math.max(left, r.right + Math.max(step * 2, padding))
                    const chain = clustersOf(other)
                    chain.forEach((c, i) => {
                        if (clustersOf(id).includes(c)) return
                        const own = clustersOf(id).filter(o => !chain.slice(i).includes(o)).length
                        const previous = groupRects.get(c)
                        groupRects.set(c, { rect: union(previous?.rect, inflate(r, (i + 1) * GROUP_PADDING)), own })
                    })
                }
                for (const { rect, own } of groupRects.values()) {
                    const padding = step + own * GROUP_PADDING
                    if (top < rect.bottom + padding && rect.top < bottom + padding) left = Math.max(left, rect.right + padding)
                }
                const x = Math.ceil((left + leftExtra(s)) / grid) * grid + s.w / 2
                positions.get(id).x = x
            }
            placedSoFar.push(...column)
        }

        const nodeAt = (id) => nodeRect(byId.get(id), positions.get(id).x, positions.get(id).y)

        // A flow wider than maxWidth carries on below, starting again from its left edge.
        // A row only breaks where it cuts no group, or only a group holding all of `ids`,
        // which then grows taller. With no such place the nodes stay wide.
        const wrapRows = (ids) => {
            const inRows = new Set(ids)
            const cols = columns.map(column => column.filter(id => inRows.has(id)))
            // Columns holding only the ends of wires that leave the set have no width.
            const filled = cols.map((c, k) => k).filter(k => cols[k].length)
            if (filled.length < 2) return
            const holdsAll = (c) => ids.every(id => clustersOf(id).includes(c))
            // Rows inside a group holding all of them sit a row gap apart, without its padding.
            const outline = (id) => inflate(nodeAt(id), clustersOf(id).filter(c => !holdsAll(c)).length * GROUP_PADDING)
            const left = (k) => Math.min(...cols[k].map(id => outline(id).left))
            const right = (k) => Math.max(...cols[k].map(id => outline(id).right))
            const spans = new Map()
            for (const id of ids) {
                for (const c of clustersOf(id)) {
                    const [first, last] = spans.get(c) || [Infinity, -Infinity]
                    spans.set(c, [Math.min(first, rankOf(id)), Math.max(last, rankOf(id))])
                }
            }
            const canBreak = (k) => [...spans].every(([c, [first, last]]) => !(first < k && k <= last) || holdsAll(c))
            const rowStarts = (limit) => {
                const starts = [filled[0]]
                for (const k of filled.slice(1)) {
                    const start = starts[starts.length - 1]
                    if (k <= start || right(k) - left(start) <= limit) continue
                    let at = k
                    while (at > start && (!cols[at].length || !canBreak(at))) at--
                    if (at > start) starts.push(at)
                }
                return starts
            }
            // Rows of about even width rather than full rows and a short last one.
            let starts = rowStarts(width)
            const total = Math.max(...filled.map(right)) - left(filled[0])
            for (let limit = total / starts.length; limit < width; limit += grid) {
                const even = rowStarts(limit)
                if (even.length <= starts.length) {
                    starts = even
                    break
                }
            }
            const origin = left(filled[0])
            let bottom = -Infinity
            starts.forEach((start, b) => {
                const row = cols.slice(start, starts[b + 1]).flat()
                if (b > 0) {
                    const top = Math.min(...row.map(id => outline(id).top))
                    const dx = Math.round((origin - left(start)) / grid) * grid
                    const dy = Math.ceil((nextRowTop(bottom) - top) / grid) * grid
                    for (const id of row) {
                        positions.get(id).x += dx
                        positions.get(id).y += dy
                    }
                }
                bottom = Math.max(bottom, ...row.map(id => outline(id).bottom))
            })
        }

        const members = new Map([...clusterParent.keys()].map(c => [c, nodeIds.filter(id => clustersOf(id).includes(c))]))
        const depth = (c) => {
            let levels = 0
            for (let p = clusterParent.get(c); p; p = clusterParent.get(p)) levels++
            return levels
        }
        const clusterRect = (c) => {
            let rect = null
            for (const id of members.get(c)) rect = union(rect, nodeAt(id))
            for (const [child, parent] of clusterParent) {
                if (parent === c) rect = union(rect, clusterRect(child))
            }
            return rect && inflate(rect, GROUP_PADDING)
        }
        if (width < Infinity) {
            // Each group wraps inside itself first, innermost first. What lies below it moves
            // down by as much as it grew, and what lies beside it moves left by as much as it
            // narrowed. Then the whole set wraps.
            const boundsOf = (ids) => ids.map(nodeAt).reduce(union)
            const clusters = [...clusterParent.keys()].filter(c => members.get(c).length)
            for (const c of clusters.sort((a, b) => depth(b) - depth(a))) {
                const ids = members.get(c)
                const before = boundsOf(ids)
                wrapRows(ids)
                const after = boundsOf(ids)
                const grew = Math.ceil((after.bottom - before.bottom) / grid) * grid
                const narrowed = Math.floor((before.right - after.right) / grid) * grid
                if (grew <= 0) continue
                // Nodes outside the group that it feeds, directly or through each other.
                const followers = []
                const seen = new Set(ids)
                const queue = [...ids]
                while (queue.length) {
                    for (const next of successors.get(queue.shift())) {
                        if (!inSet.has(next) || seen.has(next)) continue
                        seen.add(next)
                        followers.push(next)
                        queue.push(next)
                    }
                }
                for (const id of nodeIds) {
                    if (ids.includes(id) || followers.includes(id)) continue
                    const r = nodeAt(id)
                    if (r.top >= before.bottom) {
                        positions.get(id).y += grew
                    } else if (r.left >= before.right) {
                        positions.get(id).x -= narrowed
                    }
                }
                // Followers carry on from what feeds them, on its row, clear of the group.
                const box = clusterRect(c)
                const shared = clustersOf(ids[0])
                for (const id of followers.sort((a, b) => rankOf(a) - rankOf(b))) {
                    const s = byId.get(id)
                    const feeders = predecessors.get(id).filter(p => inSet.has(p))
                    const own = clustersOf(id).filter(x => !shared.includes(x)).length * GROUP_PADDING
                    const y = Math.round(feeders.reduce((sum, p) => sum + positions.get(p).y, 0) / feeders.length / grid) * grid
                    const xAt = (left) => Math.ceil((left + own + leftExtra(s)) / grid) * grid + s.w / 2
                    let x = xAt(Math.max(...feeders.map(p => nodeAt(p).right + Math.max(columnGap, step + crossedGroups(p, id) * GROUP_PADDING))) - own)
                    if (intersects(inflate(nodeRect(s, x, y), own + step), box)) x = xAt(box.right + step)
                    positions.set(id, { x, y })
                }
            }
            wrapRows(nodeIds)
        }

        // Each comment goes above the row of the node it sat nearest to, against the left edge
        // of what else is in its group, or of the whole set. Everything from that row down
        // moves down to make room, so comments and rows keep the order they had.
        if (nodeIds !== allIds) {
            const contentRect = (c) => {
                let rect = null
                for (const id of nodeIds) {
                    const chain = clustersOf(id)
                    const inner = c === null ? chain.length : chain.indexOf(c)
                    if (inner >= 0) rect = union(rect, inflate(nodeAt(id), inner * GROUP_PADDING))
                }
                return rect
            }
            const fromTop = (a, b) => (byId.get(a).y ?? Infinity) - (byId.get(b).y ?? Infinity) || (byId.get(a).x ?? Infinity) - (byId.get(b).x ?? Infinity)
            const hostOf = (id) => {
                const rect = nodeRect(byId.get(id))
                const c = clusterOf(id)
                const inside = nodeIds.filter(n => c === null || clustersOf(n).includes(c))
                const candidates = (inside.length ? inside : nodeIds).filter(n => isFiniteRect(nodeRect(byId.get(n))))
                if (!isFiniteRect(rect) || candidates.length === 0) return inside[0] ?? nodeIds[0]
                return commentHost(rect, candidates, (n) => nodeRect(byId.get(n)))
            }
            // The outline of the host as seen from the comment's group: the host itself, or
            // the outermost group between them.
            const hostRect = (id, host) => {
                const inner = clustersOf(host)
                const outer = inner.slice(0, inner.indexOf(clusterOf(id)) >= 0 ? inner.indexOf(clusterOf(id)) : inner.length)
                return outer.length ? clusterRect(outer[outer.length - 1]) : nodeAt(host)
            }
            const byHost = new Map()
            // Comments in different groups go above different outlines of the same host.
            for (const id of [...comments].sort(fromTop)) {
                const host = hostOf(id)
                const key = `${host}\n${clusterOf(id)}`
                if (!byHost.has(key)) byHost.set(key, { host, own: [] })
                byHost.get(key).own.push(id)
            }
            const laid = []
            const blocks = [...byHost.values()].sort((a, b) => hostRect(a.own[0], a.host).top - hostRect(b.own[0], b.host).top)
            for (const { host, own } of blocks) {
                const c = clusterOf(own[0])
                const box = contentRect(c) || { left: 0, top: 0 }
                const left = box.left
                const width = Math.max(...own.map(id => fullWidth(byId.get(id))))
                const height = own.reduce((sum, id) => sum + byId.get(id).h + step, 0)
                // Cut above the host, and above anything that would sit beside the comments.
                const scope = [...nodeIds, ...laid].filter(id => c === null || clustersOf(id).includes(c))
                let line = hostRect(own[0], host).top
                for (let moved = true; moved;) {
                    moved = false
                    for (const id of scope) {
                        const r = nodeAt(id)
                        if (r.top < line && r.bottom > line && r.left < left + width + step && r.right + step > left) {
                            line = r.top
                            moved = true
                        }
                    }
                }
                line = Math.floor(line / grid) * grid
                const shift = Math.ceil(height / grid) * grid
                // What starts below the cut moves down. A group the comments are not in moves
                // as a whole when its content starts below the cut, or not at all, so a group
                // beside them does not grow.
                const contentTop = (id) => {
                    const outer = clustersOf(id).filter(g => !clustersOf(own[0]).includes(g))
                    return outer.length ? clusterRect(outer[outer.length - 1]).top + GROUP_PADDING : nodeAt(id).top
                }
                const below = [...nodeIds, ...laid].filter(id => contentTop(id) >= line)
                for (const id of below) positions.get(id).y += shift
                let top = line
                for (const id of own) {
                    const s = byId.get(id)
                    const y = Math.ceil((top + s.h / 2) / grid) * grid
                    positions.set(id, { x: Math.ceil((box.left + leftExtra(s)) / grid) * grid + s.w / 2, y })
                    top = y + s.h / 2 + step
                    for (const cc of clustersOf(id)) members.get(cc).push(id)
                    laid.push(id)
                }
            }
        }

        // Snapping can still bring a group against something beside it; move the lower one
        // down until they are apart.
        for (let attempt = 0; attempt < 100; attempt++) {
            const items = []
            for (const [c, parent] of clusterParent) items.push({ parent, ids: members.get(c), rect: clusterRect(c) })
            for (const id of allIds) items.push({ parent: clusterOf(id), ids: [id], rect: nodeAt(id) })
            let moved = false
            for (let i = 0; i < items.length && !moved; i++) {
                for (let j = i + 1; j < items.length && !moved; j++) {
                    const [a, b] = [items[i], items[j]]
                    if (a.parent !== b.parent || !a.rect || !b.rect || !intersects(a.rect, b.rect)) continue
                    const [upper, lower] = a.rect.top <= b.rect.top ? [a, b] : [b, a]
                    const dy = Math.ceil((upper.rect.bottom + grid - lower.rect.top) / grid) * grid
                    for (const id of lower.ids) positions.get(id).y += dy
                    moved = true
                }
            }
            if (!moved) break
        }

        const rects = units.map(unit => (byId.has(unit) ? nodeAt(unit) : clusterRect(unit)))
        return { positions, rects, rect: rects.reduce(union, null) }
    }

    // Nodes that do not move, at their current position or where they were just placed.
    const fixedNodes = () => {
        const fixed = []
        for (const n of nodes) {
            if (placed.has(n.id)) {
                fixed.push({ ...n, ...placed.get(n.id) })
            } else if (!movableSet.has(n.id)) {
                fixed.push(n)
            }
        }
        return fixed
    }

    // Bounds of each group computed from its fixed contents, as the editor would draw it.
    const groupRects = (fixed) => {
        const rects = new Map()
        const direct = new Map()
        for (const n of fixed) {
            const c = containerOf(n)
            if (c !== ROOT) direct.set(c, union(direct.get(c), nodeRect(n)))
        }
        const pending = new Set()
        for (const id of movable) {
            if (!placed.has(id)) {
                for (const g of chainOf(containerOf(byId.get(id)))) pending.add(g)
            }
        }
        const visiting = new Set()
        const rectOf = (gid) => {
            if (rects.has(gid)) return rects.get(gid)
            if (visiting.has(gid)) return null
            visiting.add(gid)
            let content = direct.get(gid) || null
            for (const child of childGroups.get(gid) || []) content = union(content, rectOf(child))
            let rect = content && inflate(content, GROUP_PADDING)
            if (!pending.has(gid) && !descendants(gid).some(id => placed.has(id))) {
                rect = union(rect, groupOriginalRect(gid))
            }
            rects.set(gid, rect)
            return rect
        }
        for (const g of groups) rectOf(g.id)
        return rects
    }

    // What a fixed node looks like from inside `container`: the node itself when it is
    // in the same container, otherwise the outermost group that separates them.
    // `pad` is how far the container's own groups will grow around a unit placed in it.
    const obstacleFor = (container, fixedNode, rects) => {
        const memberChain = chainOf(container)
        const fixedChain = chainOf(containerOf(fixedNode))
        let depth = memberChain.length
        let common = null
        for (let i = 0; i < memberChain.length; i++) {
            if (fixedChain.includes(memberChain[i])) {
                depth = i
                common = memberChain[i]
                break
            }
        }
        const index = common === null ? fixedChain.length - 1 : fixedChain.indexOf(common) - 1
        if (index >= 0) {
            const rect = rects.get(fixedChain[index])
            return rect ? { key: fixedChain[index], rect, pad: depth * GROUP_PADDING } : null
        }
        return { key: fixedNode.id, rect: nodeRect(fixedNode), pad: depth * GROUP_PADDING }
    }

    const obstaclesFor = (container, fixed, rects) => {
        const seen = new Map()
        for (const f of fixed) {
            const o = obstacleFor(container, f, rects)
            if (o && !seen.has(o.key)) seen.set(o.key, o)
        }
        return [...seen.values()]
    }

    const place = (positions, dx, dy) => {
        for (const [id, p] of positions) placed.set(id, { x: p.x + dx, y: p.y + dy })
    }

    // Whether the groups holding `container` would cover something outside them once
    // they grow around `rect`.
    const groupsCollide = (container, rect, fixed, rects) => {
        const chain = chainOf(container)
        for (let i = 0; i < chain.length; i++) {
            const gid = chain[i]
            const grown = union(rects.get(gid), inflate(rect, GROUP_PADDING * (i + 1)))
            const outside = obstaclesFor(parentOf(gid), fixed, rects).filter(o => o.key !== gid)
            if (outside.some(o => intersects(grown, o.rect))) return true
        }
        return false
    }

    // A set that would run past the right edge of the canvas at `offset` wraps into the room
    // left there. Returns the set arranged again, or null when it fits or cannot wrap tighter.
    const wrappedToCanvas = (arrange, arranged, offset, pad = 0) => {
        const room = canvas.width - step - pad - Math.max(arranged.rect.left + offset.dx, step)
        if (arranged.rect.right - arranged.rect.left <= room || room >= wrapWidth) return null
        return arrange(room)
    }

    // Sets wired from the same node that stays put, such as new nodes on the outputs of a
    // switch, are laid out as one: stacked in the order of the ports they hang off, then of
    // where they were and the order they were wired. Returns lists of sets.
    const siblingSets = (sets) => {
        const feedersOf = (set) => new Set(set.flatMap(unitNodes).flatMap(id => predecessors.get(id)).filter(f => !movableSet.has(f)))
        const bundles = []
        for (const set of sets) {
            const feeders = feedersOf(set)
            const bundle = bundles.find(b => [...b.feeders].some(f => feeders.has(f)))
            if (bundle) {
                bundle.sets.push(set)
                for (const f of feeders) bundle.feeders.add(f)
            } else {
                bundles.push({ sets: [set], feeders })
            }
        }
        return bundles.map(({ sets, feeders }) => {
            if (sets.length === 1) return sets
            const feeder = byId.get([...feeders][0])
            const key = (set) => {
                const ids = set.flatMap(unitNodes)
                let best = [Infinity, Infinity, Infinity]
                for (const [port, targets] of (feeder.wires || []).entries()) {
                    for (const [wire, target] of (targets || []).entries()) {
                        if (!ids.includes(target)) continue
                        const y = byId.get(target).y
                        const k = [port, Number.isFinite(y) ? y : Infinity, wire]
                        if (k[0] < best[0] || (k[0] === best[0] && (k[1] < best[1] || (k[1] === best[1] && k[2] < best[2])))) best = k
                    }
                }
                return best
            }
            const keys = new Map(sets.map(set => [set, key(set)]))
            return [...sets].sort((a, b) => keys.get(a)[0] - keys.get(b)[0] || keys.get(a)[1] - keys.get(b)[1] || keys.get(a)[2] - keys.get(b)[2])
        })
    }

    // Lay out sibling sets one below the other, lined up on their left edges.
    const arrangeSiblings = (sets, width = wrapWidth) => {
        if (sets.length === 1) return arrangeSet(sets[0], width)
        const positions = new Map()
        const rects = []
        let top = null
        let left = null
        for (const set of sets) {
            const arranged = arrangeSet(set, width)
            if (top === null) {
                top = arranged.rect.top
                left = arranged.rect.left
            }
            // Whole grid cells, so the nodes stay on the grid.
            const dx = Math.round((left - arranged.rect.left) / grid) * grid
            const dy = Math.ceil((top - arranged.rect.top) / grid) * grid
            for (const [id, p] of arranged.positions) positions.set(id, { x: p.x + dx, y: p.y + dy })
            for (const r of arranged.rects) rects.push(translate(r, dx, dy))
            top = arranged.rect.bottom + dy + step
        }
        return { positions, rects, rect: rects.reduce(union, null) }
    }

    // Lay out the movable units of a container that also holds nodes that stay put.
    const layoutAmongFixed = (container) => {
        const units = [
            ...(childNodes.get(container) || []).filter(id => movableSet.has(id)),
            ...(childGroups.get(container) || []).filter(isWhole)
        ]
        if (units.length === 0) return
        const graph = unitGraph(units, container)
        for (const siblings of siblingSets(components(sortUnits(units), graph))) {
            const set = siblings.flat()
            const fixed = fixedNodes()
            const spot = (arranged) => offsetAmongFixed(container, set, arranged, fixed)
            const arrange = (width) => arrangeSiblings(siblings, width)
            let arranged = arrange()
            let { wanted, offset } = spot(arranged)
            const pad = chainOf(container).length * GROUP_PADDING
            const wrapped = wrappedToCanvas(arrange, arranged, wanted, pad)
            if (wrapped) {
                arranged = wrapped
                const again = spot(arranged)
                wanted = again.wanted
                offset = again.offset
            }
            if (anchor && wanted) {
                // Sets already laid out in this container stay put; only the rest makes room.
                const done = fixed.filter(f => movableSet.has(f.id) && (container === ROOT || chainOf(containerOf(f)).includes(container)))
                const kept = inCanvas(arranged.rect, wanted, pad)
                kept.dy = clearDown(arranged.rects, obstaclesFor(container, done, groupRects(fixed)), kept, spacing)
                if (fitsCanvas(arranged.rect, kept, pad)) {
                    const before = new Map(placed)
                    place(arranged.positions, kept.dx, kept.dy)
                    if (makeRoom(container, set, arranged.rects.map(r => translate(r, kept.dx, kept.dy)))) continue
                    placed.clear()
                    for (const [id, p] of before) placed.set(id, p)
                }
            }
            if (!offset) throw new Error(NO_ROOM)
            place(arranged.positions, offset.dx, offset.dy)
        }
    }

    // How far right a unit has to move to sit a column gap after the nodes in `feeding` that
    // are wired into it, so their wires run left to right. Nodes laid out on their own feed
    // whatever they are wired to. Any other node only pushes what was already to its right,
    // so a wire looping back to an earlier node is left alone.
    const behindFeeders = (unit, set, feeding, current) => {
        let need = 0
        for (const id of unit.ids) {
            for (const from of predecessors.get(id)) {
                if (!feeding.has(from) || unit.ids.includes(from)) continue
                const loose = set.includes(from)
                if (!loose && !(byId.get(id).x >= byId.get(from).x)) continue
                const p = placed.get(from) || byId.get(from)
                const right = nodeRect(byId.get(from), p.x, p.y).right
                need = Math.max(need, right + spacing.columnGap - nodeRect(current.get(id)).left)
            }
        }
        return need > 0 ? Math.ceil(need / grid) * grid : 0
    }

    // Move whatever stays put out of the way of `rects`, just placed in `container`: each
    // thing they cover goes down or right, then whatever that bumps into, and so on up
    // through every group around the container as it grows. What the moved nodes feed goes
    // right, so its wires still run left to right; anything else takes the shorter move.
    // Returns false when something would have to leave the canvas.
    const makeRoom = (container, set, rects) => {
        const { clearance } = spacing
        let level = container
        let region = rects
        let skip = new Set(set)
        const feeding = new Set(set.flatMap(unitNodes))
        for (;;) {
            const fixed = fixedNodes()
            const fixedIds = new Set(fixed.map(f => f.id))
            const current = new Map(fixed.map(f => [f.id, f]))
            const rectsNow = groupRects(fixed)
            const units = [
                ...(childNodes.get(level) || []).filter(id => fixedIds.has(id) && !skip.has(id)),
                ...(childGroups.get(level) || []).filter(gid => !skip.has(gid) && rectsNow.get(gid) && descendants(gid).some(id => fixedIds.has(id)))
            ].map(unit => ({
                key: unit,
                ids: unitNodes(unit).filter(id => fixedIds.has(id)),
                rect: byId.has(unit) ? nodeRect(current.get(unit)) : rectsNow.get(unit)
            }))
            units.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
            const pad = chainOf(level).length * GROUP_PADDING
            // Nodes laid out in this call stay put, so they are in the way from the start.
            const done = units.filter(unit => unit.ids.length === 1 && byId.has(unit.ids[0]) && unit.ids[0] === unit.key && movableSet.has(unit.key))
            const settled = [...region.map(rect => ({ rect, moving: true })), ...done.map(unit => ({ rect: unit.rect }))]
            const hits = (rect, list) => list.filter(o => intersects(inflate(rect, clearance), o.rect))
            // Smallest grid-aligned shift along one axis that clears everything settled.
            const shift = (rect, axis) => {
                let d = 0
                for (let attempt = 0; attempt < 1000; attempt++) {
                    const r = inflate(axis === 'x' ? translate(rect, d, 0) : translate(rect, 0, d), clearance)
                    const hit = hits(axis === 'x' ? translate(rect, d, 0) : translate(rect, 0, d), settled)
                    if (hit.length === 0) return d
                    const push = Math.max(...hit.map(o => (axis === 'x' ? o.rect.right - r.left : o.rect.bottom - r.top)))
                    d += Math.ceil(push / grid) * grid
                }
                return d
            }
            for (const unit of units) {
                if (done.includes(unit)) continue
                const behind = behindFeeders(unit, set, feeding, current)
                const fromBehind = behind > 0 && { dx: behind + shift(translate(unit.rect, behind, 0), 'x'), dy: 0 }
                if (!fromBehind && hits(unit.rect, settled.filter(o => o.moving)).length === 0) {
                    settled.push({ rect: unit.rect })
                    continue
                }
                const fed = unit.ids.some(id => predecessors.get(id).some(p => feeding.has(p)))
                const options = [fromBehind, { dx: 0, dy: shift(unit.rect, 'y') }, { dx: shift(unit.rect, 'x'), dy: 0 }]
                    .filter(o => o && staysInCanvas(unit.rect, o, pad))
                    .sort((a, b) => (fed ? b.dx - a.dx : a.dx + a.dy - b.dx - b.dy))
                if (options.length === 0) return false
                const { dx, dy } = options[0]
                for (const id of unit.ids) {
                    const n = current.get(id)
                    placed.set(id, { x: n.x + dx, y: n.y + dy })
                    if (dx > 0) feeding.add(id)
                }
                settled.push({ rect: translate(unit.rect, dx, dy), moving: true })
            }
            if (level === ROOT) return true
            const grown = groupRects(fixedNodes()).get(level)
            if (!grown) return true
            region = [grown]
            skip = new Set([level])
            level = parentOf(level)
        }
    }

    // Where a set goes among nodes that stay put: the spot it would like, and the spot it
    // gets once clear of everything and inside the canvas.
    const offsetAmongFixed = (container, set, arranged, fixed) => {
        const rects = groupRects(fixed)
        const rect = arranged.rect
        // Inside a group, only what is already in that group can pull nodes towards it,
        // so the group does not stretch over whatever lies between.
        const inContainer = (f) => container === ROOT || chainOf(containerOf(f)).includes(container)
        const fixedById = new Map(fixed.filter(inContainer).map(f => [f.id, f]))
        const containerRect = container === ROOT ? null : rects.get(container)

        // Single nodes go next to what they are wired to; groups are tidied where they are.
        const onlyNodes = set.every(u => byId.has(u))
        const candidates = []
        if (onlyNodes) {
            const rectAt = (id, p) => nodeRect(byId.get(id), p.x, p.y)
            candidates.push(anchorOffset(set, arranged.positions, rectAt, fixedById, predecessors, successors, (f) => obstacleFor(container, f, rects), spacing))
        }
        let original = null
        for (const u of set) original = union(original, originalRect(u))
        // A group tidied in place stays where it was even when the group around it has to
        // grow to reach it.
        if (isFiniteRect(original) && ((anchor && !onlyNodes) || !containerRect || intersects(original, containerRect))) {
            candidates.push({
                dx: Math.round((original.left - rect.left) / grid) * grid,
                dy: Math.round((original.top - rect.top) / grid) * grid
            })
        }
        candidates.push(...freeOffsets(rect, container, fixed, rects, containerOf, chainOf, spacing))

        const obstacles = obstaclesFor(container, fixed, rects)
        const pad = chainOf(container).length * GROUP_PADDING
        const settled = candidates.filter(Boolean).map(o => settleInCanvas(arranged.rects, rect, obstacles, o, pad))
        // Take the first spot inside the canvas where the groups around the set can grow
        // to fit it without covering anything outside them.
        const inside = settled.filter(o => fitsCanvas(rect, o, pad))
        const offset = inside.find(o => !groupsCollide(container, translate(rect, o.dx, o.dy), fixed, rects)) || inside[0]
        return { wanted: candidates.find(Boolean), offset }
    }

    if (isWhole(ROOT) && anchor) {
        // The whole tab moves, but each flow keeps its first node where it was, so flows
        // the user put apart stay apart. A flow is only moved down when it would cover
        // one placed before it.
        const units = [...(childNodes.get(ROOT) || []), ...(childGroups.get(ROOT) || []).filter(isWhole)]
        const sets = components(sortUnits(units), unitGraph(units, ROOT))
        const originalTop = (set) => Math.min(...set.map(u => originalRect(u)?.top).filter(Number.isFinite))
        const originalLeft = (set) => Math.min(...set.map(u => originalRect(u)?.left).filter(Number.isFinite))
        sets.sort((a, b) => originalTop(a) - originalTop(b) || originalLeft(a) - originalLeft(b))
        const taken = []
        // Offset that puts the flow's first node back where it was, or a lone group's
        // top-left corner.
        const anchored = (set, arranged) => {
            const original = set.length === 1 && !byId.has(set[0]) ? originalRect(set[0]) : null
            if (isFiniteRect(original)) {
                return {
                    dx: Math.round((original.left - arranged.rect.left) / grid) * grid,
                    dy: Math.round((original.top - arranged.rect.top) / grid) * grid
                }
            }
            let first = null
            const onlyComments = [...arranged.positions.keys()].every(id => byId.get(id).comment)
            for (const [id, p] of arranged.positions) {
                if (byId.get(id).comment && !onlyComments) continue
                const r = nodeRect(byId.get(id), p.x, p.y)
                if (!first || r.left < first.left || (r.left === first.left && r.top < first.top)) first = { id, left: r.left, top: r.top }
            }
            const start = byId.get(first.id)
            const p = arranged.positions.get(first.id)
            const rect = arranged.rect
            // A flow that was never placed starts near the top-left corner.
            const known = Number.isFinite(start.x) && Number.isFinite(start.y)
            const shift = known ? { x: start.x - p.x, y: start.y - p.y } : { x: step * 4 - rect.left, y: step * 2 - rect.top }
            return { dx: Math.round(shift.x / grid) * grid, dy: Math.round(shift.y / grid) * grid }
        }
        for (const set of sets) {
            let arranged = arrangeSet(set)
            arranged = wrappedToCanvas(width => arrangeSet(set, width), arranged, anchored(set, arranged)) || arranged
            const offset = settleInCanvas(arranged.rects, arranged.rect, taken, anchored(set, arranged))
            if (!fitsCanvas(arranged.rect, offset)) throw new Error(NO_ROOM)
            place(arranged.positions, offset.dx, offset.dy)
            for (const r of arranged.rects) taken.push({ rect: translate(r, offset.dx, offset.dy), pad: 0 })
        }
        return placed
    }

    if (isWhole(ROOT)) {
        // The whole tab moves: arrange each connected set left to right and stack the sets
        // from where the tab's top-left corner was, keeping the order they had on the canvas.
        const units = [...(childNodes.get(ROOT) || []), ...(childGroups.get(ROOT) || []).filter(isWhole)]
        const sets = components(sortUnits(units), unitGraph(units, ROOT))
        const originalTop = (set) => {
            const tops = set.map(u => originalRect(u)?.top).filter(Number.isFinite)
            return tops.length ? Math.min(...tops) : Infinity
        }
        sets.sort((a, b) => originalTop(a) - originalTop(b))
        let original = null
        for (const u of units) original = union(original, originalRect(u))
        const left = isFiniteRect(original) ? Math.max(original.left, step) : step * 4
        let top = isFiniteRect(original) ? Math.max(original.top, step) : step * 2
        const taken = []
        for (const set of sets) {
            const wanted = ({ rect }) => ({ dx: Math.ceil((left - rect.left) / grid) * grid, dy: Math.ceil((top - rect.top) / grid) * grid })
            let arranged = arrangeSet(set)
            arranged = wrappedToCanvas(width => arrangeSet(set, width), arranged, wanted(arranged)) || arranged
            const rect = arranged.rect
            const offset = settleInCanvas(arranged.rects, rect, taken, wanted(arranged))
            if (!fitsCanvas(rect, offset)) throw new Error(NO_ROOM)
            place(arranged.positions, offset.dx, offset.dy)
            for (const r of arranged.rects) taken.push({ rect: translate(r, offset.dx, offset.dy), pad: 0 })
            top = Math.max(top, rect.bottom + offset.dy + rowGap * 2)
        }
        return placed
    }

    // Containers holding movable units next to fixed ones, innermost first so outer
    // levels see the space the inner ones took.
    const containers = new Set()
    for (const id of movable) {
        let container = containerOf(byId.get(id))
        while (container !== ROOT && isWhole(container)) {
            container = parentOf(container)
        }
        containers.add(container)
    }
    const ordered = [...containers].sort((a, b) => chainOf(b).length - chainOf(a).length)
    for (const container of ordered) layoutAmongFixed(container)
    return placed
}

// Connected sets of units, in the order their first member was listed.
function components (units, graph) {
    const inSet = new Set(units)
    const seen = new Set()
    const result = []
    for (const start of units) {
        if (seen.has(start)) continue
        const members = new Set()
        const stack = [start]
        seen.add(start)
        while (stack.length) {
            const id = stack.pop()
            members.add(id)
            for (const next of [...graph.succs(id), ...graph.preds(id)]) {
                if (inSet.has(next) && !seen.has(next)) {
                    seen.add(next)
                    stack.push(next)
                }
            }
        }
        result.push(units.filter(id => members.has(id)))
    }
    return result
}

// Rows as close as possible to `wanted`, in the same order, with row i at least gaps[i]
// below row i - 1 (pool adjacent violators on the rows less their minimum offsets).
function closestRows (wanted, gaps) {
    const offsets = []
    let offset = 0
    gaps.forEach((gap, i) => {
        offset += i === 0 ? 0 : gap
        offsets.push(offset)
    })
    const blocks = []
    wanted.forEach((w, i) => {
        blocks.push({ sum: w - offsets[i], count: 1 })
        while (blocks.length > 1) {
            const last = blocks[blocks.length - 1]
            const before = blocks[blocks.length - 2]
            if (before.sum / before.count <= last.sum / last.count) break
            before.sum += last.sum
            before.count += last.count
            blocks.pop()
        }
    })
    const rows = []
    for (const block of blocks) {
        for (let k = 0; k < block.count; k++) rows.push(block.sum / block.count + offsets[rows.length])
    }
    return rows
}

// Place a set of nodes next to the first fixed node it is wired to: to the right of an
// upstream node, or to the left of a downstream one.
function anchorOffset (set, local, unitRect, fixedById, predecessors, successors, obstacleFor, { columnGap, grid }) {
    const snap = (v) => Math.round(v / grid) * grid
    const referenceFor = (fixedNode) => obstacleFor(fixedNode) || { rect: nodeRect(fixedNode), pad: 0 }
    // The nodes fed by the same nodes that stay put go after the furthest of those, with
    // the middle of them level with the middle of their feeders: a node fed by several sits
    // between them, and several fed by one are centred on it.
    const upstreamOf = (id) => predecessors.get(id).filter(f => fixedById.has(f))
    const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length
    const first = set.find(id => upstreamOf(id).length > 0)
    if (first) {
        const feeders = new Set(upstreamOf(first))
        const fed = set.filter(id => upstreamOf(id).some(f => feeders.has(f)))
        let dx = -Infinity
        for (const id of fed) {
            const rect = unitRect(id, local.get(id))
            const targetLeft = Math.max(...upstreamOf(id).map(f => {
                const ref = referenceFor(fixedById.get(f))
                return ref.rect.right + ref.pad + columnGap
            }))
            dx = Math.max(dx, Math.ceil((targetLeft - rect.left) / grid) * grid)
        }
        const middle = mean([...feeders].map(f => fixedById.get(f).y))
        return { dx, dy: snap(middle - mean(fed.map(id => local.get(id).y))) }
    }
    for (const id of set) {
        const downstream = successors.get(id).find(f => fixedById.has(f))
        if (downstream) {
            const fixedNode = fixedById.get(downstream)
            const ref = referenceFor(fixedNode)
            const p = local.get(id)
            const rect = unitRect(id, p)
            const targetRight = ref.rect.left - ref.pad - columnGap
            return { dx: Math.floor((targetRight - rect.right) / grid) * grid, dy: snap(fixedNode.y - p.y) }
        }
    }
    return null
}

// Spots for a set with no usable position: below whatever already sits in its container,
// lined up with its left edge, or to the right of it, lined up with its top.
function freeOffsets (rect, container, fixed, rects, containerOf, chainOf, { columnGap, rowGap, clearance, grid }) {
    let area = null
    for (const f of fixed) {
        if (container === ROOT ? chainOf(containerOf(f)).length === 0 : chainOf(containerOf(f)).includes(container)) {
            area = union(area, nodeRect(f))
        }
    }
    if (container === ROOT) {
        for (const [gid, r] of rects) {
            if (r && chainOf(gid).length === 1) area = union(area, r)
        }
    }
    if (!area) {
        return [{
            dx: Math.ceil((clearance * 4 - rect.left) / grid) * grid,
            dy: Math.ceil((clearance * 2 - rect.top) / grid) * grid
        }]
    }
    return [{
        dx: Math.ceil((area.left - rect.left) / grid) * grid,
        dy: Math.ceil((area.bottom + rowGap * 2 - rect.top) / grid) * grid
    }, {
        dx: Math.ceil((area.right + columnGap - rect.left) / grid) * grid,
        dy: Math.ceil((area.top - rect.top) / grid) * grid
    }]
}

// Move the set down, a grid step at a time past whatever it hits, until no unit
// overlaps anything it has to keep clear of.
function clearDown (unitRects, obstacles, offset, { clearance, grid }) {
    let dy = offset.dy
    for (let attempt = 0; attempt < 1000; attempt++) {
        let push = 0
        for (const local of unitRects) {
            for (const o of obstacles) {
                const r = inflate(translate(local, offset.dx, dy), o.pad + clearance)
                if (intersects(r, o.rect)) {
                    push = Math.max(push, o.rect.bottom - r.top)
                }
            }
        }
        if (push === 0) return dy
        dy += Math.ceil(push / grid) * grid
    }
    return dy
}
