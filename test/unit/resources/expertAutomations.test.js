/// <reference types="should" />
'use strict'
const should = require('should')
const sinon = require('sinon')

// These tests are for frontend only code.
// Since the tests run in a node Env CI and node versions below 20 do not support ES modules,
// we will skip these FE tests if we detect an older node version that doesn't support ESM.
const [major] = process.versions.node.split('.').map(Number)
let skipTests = false
if (major < 20) {
    console.debug(`Skipping expertAutomations frontend tests since Node v${process.versions.node} does not support ES modules! These will be covered in another CI run.`)
    skipTests = true
}

const describeMain = skipTests ? describe.skip : describe

describeMain('expertAutomations', () => {
    /** @type {import('../../../resources/expertAutomations.js').ExpertAutomations} */
    let expertAutomations
    /** @type {ReturnType<typeof createMockRed>} */
    let mockRED
    let mockExpertComms

    function createMockRed () {
        return {
            view: {
                addFlowTab: sinon.stub(),
                reveal: sinon.stub(),
                select: sinon.stub(),
                state: sinon.stub().returns(1) // default to default state
            },
            nodes: {
                node: sinon.stub(),
                getAllFlowNodes: sinon.stub(),
                createExportableNodeSet: sinon.stub().callsFake((nodes) => nodes || []),
                dirty: sinon.stub()
            },
            settings: {
                version: '4.1.4'
            },
            state: { DEFAULT: 1 },
            workspaces: {
                active: sinon.stub().returns('active-tab'),
                show: sinon.stub()
            }
        }
    }

    beforeEach(async () => {
        // Mock RED instance
        mockRED = createMockRed()

        mockExpertComms = {}
        const ExpertAutomationsModule = import('../../../resources/expertAutomations.js')
        expertAutomations = new (await ExpertAutomationsModule).ExpertAutomations()
    })

    afterEach(() => {
        sinon.restore()
        delete require.cache[require.resolve('../../../resources/expertAutomations.js')]
    })

    describe('initialization', () => {
        it('should initialize with RED instance and options', () => {
            expertAutomations.init(mockExpertComms, mockRED)
            expertAutomations.RED.should.equal(mockRED)
            expertAutomations.expertComms.should.equal(mockExpertComms)
        })
        it('should have supported actions', () => {
            const supportedActions = expertAutomations.supportedActions
            supportedActions.should.be.an.Object()
            const expectedKeys = [
                'automation/get-nodes',
                'automation/select-nodes',
                'automation/open-node-edit',
                'automation/search',
                'automation/add-flow-tab',
                'automation/update-node',
                'automation/show-workspace',
                'automation/get-workspace-nodes',
                'automation/list-workspaces',
                'automation/close-search',
                'automation/close-type-search',
                'automation/close-action-list',
                'automation/add-tab',
                'automation/remove-tab',
                'automation/add-nodes',
                'automation/remove-nodes',
                'automation/set-wires',
                'automation/set-links',
                'automation/import-flow',
                'automation/close-editor-tray'
            ]
            supportedActions.should.only.have.keys(...expectedKeys)
        })
        it('should have hasAction method', () => {
            expertAutomations.should.have.property('hasAction').which.is.a.Function()
        })
        it('should return true for supported actions', () => {
            expertAutomations.hasAction('automation/get-nodes').should.be.true()
            expertAutomations.hasAction('automation/select-nodes').should.be.true()
            expertAutomations.hasAction('automation/get-nodes').should.be.true()
        })
        it('should return false for unsupported actions', () => {
            expertAutomations.hasAction('automation/nonexistent-action').should.be.false()
            expertAutomations.hasAction('bad-namespace/get-nodes').should.be.false()
        })
    })

    describe('actions', () => {
        beforeEach(() => {
            expertAutomations.init(mockExpertComms, mockRED)
        })

        describe('selectNodes', () => {
            it('should select a single node and reveal it', () => {
                const mockNode = { id: 'node1' }
                mockRED.nodes.node.returns(mockNode)
                mockRED.nodes.getAllFlowNodes.returns([mockNode])
                const result = expertAutomations.selectNodes('node1', null)
                mockRED.view.reveal.calledWith('node1', false).should.be.true()
                mockRED.view.select.calledWith({ nodes: [mockNode] }).should.be.true()
                result.should.deepEqual([mockNode])
            })
            it('should select multiple nodes', () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = expertAutomations.selectNodes(['node1', 'node2'], null)
                mockRED.view.select.calledWith({ nodes: [mockNode1, mockNode2] }).should.be.true()
                result.should.deepEqual([mockNode1, mockNode2])
            })
            it('should return null if no nodes found', () => {
                mockRED.nodes.node.returns(null)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = expertAutomations.selectNodes('node1', null)
                should(result).equal(null)
            })
        })
        describe('getNodes', () => {
            it('should get a single node', () => {
                const mockNode = { id: 'node1' }
                mockRED.nodes.node.returns(mockNode)
                const result = expertAutomations.getNodes('node1', null)
                result.should.deepEqual([mockNode])
            })
            it('should get multiple nodes', () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = expertAutomations.getNodes(['node1', 'node2'], null)
                result.should.deepEqual([mockNode1, mockNode2])
            })
            it('should return null if node not found', () => {
                mockRED.nodes.node.returns(null)
                const result = expertAutomations.getNodes('node1', null)
                should(result).equal(null)
            })
        })
        describe('editNode', () => {
            it('should edit a node when in default state', () => {
                mockRED.editor = { edit: sinon.stub() }
                const mockNode = { id: 'node1' }
                mockRED.nodes.node.returns(mockNode)
                mockRED.nodes.getAllFlowNodes.returns([mockNode])
                const result = expertAutomations.editNode('node1')
                mockRED.editor.edit.calledWith(mockNode).should.be.true()
                result.should.equal(mockNode)
            })
            it('should throw error if not in default state', () => {
                mockRED.view.state.returns(2);
                (() => expertAutomations.editNode('node1')).should.throw('Cannot select and edit node when not in default view state')
            })
            it('should throw error if node not found', () => {
                mockRED.nodes.node.returns(null);
                (() => expertAutomations.editNode('node1')).should.throw('Node with id node1 not found')
            })
        })
        describe('search', () => {
            beforeEach(() => {
                mockRED.search = {
                    show: sinon.stub(),
                    search: sinon.stub()
                }
            })
            it('should call RED.search.show for interactive search', () => {
                expertAutomations.search('test query', true)
                mockRED.search.show.calledWith('test query').should.be.true()
            })
            it('should call RED.search.search for non-interactive search and return results', () => {
                mockRED.search.search.returns(['result1', 'result2'])
                const results = expertAutomations.search('test query', false)
                mockRED.search.search.calledWith('test query').should.be.true()
                results.should.deepEqual(['result1', 'result2'])
            })
        })
    })

    describe('invokeAction', () => {
        beforeEach(() => {
            expertAutomations.init(mockExpertComms, mockRED)
            sinon.spy(expertAutomations, 'getNodes')
            sinon.spy(expertAutomations, 'selectNodes')
            sinon.spy(expertAutomations, 'editNode')
            sinon.spy(expertAutomations, '_formatNodes')
        })
        it('should throw an error if action is not found (bad namespace)', async () => {
            await should(expertAutomations.invokeAction('bad-namespace/open-edit-node')).rejectedWith(/Action .* not found/)
        })
        it('should throw an error if action is not found (bad action name)', async () => {
            await should(expertAutomations.invokeAction('automation/nonexistent-action')).rejectedWith(/Action .* not found/)
        })
        describe('selectNodes action', () => {
            it('should invoke action and select nodes', async () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                expertAutomations.selectNodes.calledWith(['node1', 'node2'], undefined).should.be.true()
                mockRED.view.select.calledWith({ nodes: [mockNode1, mockNode2] }).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1, mockNode2])
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should fail if no nodes found', async () => {
                mockRED.nodes.node.returns(null)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', false)
                result.should.have.property('error')
            })
        })
        describe('getNodes action', () => {
            it('should invoke action and get multiple nodes using params.ids', async () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                expertAutomations.getNodes.calledWith(['node1', 'node2'], undefined).should.be.true()
                expertAutomations._formatNodes.calledWith([mockNode1, mockNode2], undefined).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1, mockNode2])
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should invoke action and get single node using params.id', async () => {
                const mockNode1 = { id: 'node1' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { id: 'node1' } }, result)
                expertAutomations.getNodes.calledWith('node1', undefined).should.be.true()
                expertAutomations._formatNodes.calledWith([mockNode1], undefined).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1])
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should fail if no nodes found', async () => {
                mockRED.nodes.node.returns(null)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', false)
                result.should.have.property('error')
            })
        })
        describe('editNode action', () => {
            it('should invoke action', async () => {
                const mockNode = { id: 'node1' }
                mockRED.editor = { edit: sinon.stub() }
                mockRED.nodes.node.returns(mockNode)
                mockRED.nodes.getAllFlowNodes.returns([mockNode])
                const result = {}
                await expertAutomations.invokeAction('automation/open-node-edit', { params: { id: 'node1' } }, result)
                mockRED.editor.edit.calledWith(mockNode).should.be.true()
                result.should.have.property('node').and.deepEqual(mockNode)
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should fail if no node found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/open-node-edit', { params: { id: 'node1' } }, result)).rejectedWith('Node with id node1 not found')
            })
            it('should fail if non string params.id is used', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/open-node-edit', { params: { id: ['node1', 'node2'] } }, result)).rejectedWith(/Node with .* not found/)
            })
        })
        describe('search action', () => {
            beforeEach(() => {
                mockRED.search = {
                    show: sinon.stub(),
                    search: sinon.stub()
                }
            })
            it('should invoke search action in interactive mode', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/search', { params: { query: 'find me', interactive: true } }, result)
                mockRED.search.show.calledWith('find me').should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should invoke search action in non-interactive mode and return results', async () => {
                mockRED.search.search.returns([{ id: 0, label: 'this is node a find me', node: { id: 'nodeA' } }, { id: 1, label: 'this is node b find me', node: { id: 'nodeB' } }])
                const result = {}
                await expertAutomations.invokeAction('automation/search', { params: { query: 'find me', interactive: false } }, result)
                mockRED.search.search.calledWith('find me').should.be.true()
                result.should.have.property('results').and.is.an.Array().with.lengthOf(2)
                result.results[0].should.have.property('id', 0)
                result.results[0].should.have.property('label', 'this is node a find me')
                result.results[0].should.have.property('node').which.deepEqual({ id: 'nodeA' })
                result.results[1].should.have.property('id', 1)
                result.results[1].should.have.property('label', 'this is node b find me')
                result.results[1].should.have.property('node').which.deepEqual({ id: 'nodeB' })
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
        })
        describe('addFlowTab action', async () => {
            it('should use importNodes when addFlowTab is provided a title', async () => {
                const result = {}
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.workspaces = { ...mockRED.workspaces, isLocked: sinon.stub().returns(false) }
                sinon.stub(expertAutomations.redOps, 'commandAndWait').callsFake((cmd, event, options) => {
                    cmd() // execute the command immediately for testing
                    return Promise.resolve()
                })
                await expertAutomations.invokeAction('automation/add-flow-tab', { params: { title: 'My New Flow' } }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[0].should.deepEqual([{ id: '', type: 'tab', label: 'My New Flow', disabled: false, info: '', env: [] }])
                args[1].should.deepEqual({ generateIds: true, addFlow: false, touchImport: true, applyNodeDefaults: true })
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should invoke core add-flow when title is not required', async () => {
                // remove addFlowTab API and add importNodes
                sinon.stub(expertAutomations.redOps, 'commandAndWait').resolves()
                const result = {}
                await expertAutomations.invokeAction('automation/add-flow-tab', { params: { } }, result)
                expertAutomations.redOps.commandAndWait.called.should.be.true()
                result.should.have.property('success', true)
            })
        })
        describe('removeNodes action', () => {
            beforeEach(() => {
                mockRED.nodes.remove = sinon.stub().returns({ nodes: [], links: [] })
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.view.updateActive = sinon.stub()
                mockRED.view.redraw = sinon.stub()
                mockRED.workspaces = { ...mockRED.workspaces, isLocked: sinon.stub().returns(false) }
            })
            it('should remove nodes by ID string and push history', async () => {
                const mockNode = { id: 'n1' }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                const result = {}
                await expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'] }
                }, result)
                mockRED.nodes.remove.calledWith('n1').should.be.true()
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'delete')
                historyArg.should.have.property('nodes').which.is.an.Array().with.lengthOf(1)
                historyArg.nodes[0].should.equal(mockNode)
                mockRED.nodes.dirty.calledWith(true).should.be.true()
                mockRED.view.updateActive.calledOnce.should.be.true()
                mockRED.view.redraw.calledOnce.should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
                result.should.have.property('data').which.deepEqual({ removed: ['n1'] })
            })
            it('should collect removed links for history', async () => {
                const mockNode = { id: 'n1' }
                const mockLink = { source: { id: 'n1' }, target: { id: 'n2' } }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.remove.returns({ nodes: [], links: [mockLink] })
                const result = {}
                await expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'] }
                }, result)
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('links').which.is.an.Array().with.lengthOf(1)
                historyArg.links[0].should.equal(mockLink)
            })
            it('should throw if any node ID does not exist', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['nonexistent'] }
                }, result)).rejectedWith(/Node nonexistent not found/)
                mockRED.nodes.remove.called.should.be.false()
            })
            it('should throw without removing anything if mix of valid and invalid IDs', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1' })
                mockRED.nodes.node.withArgs('bad').returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1', 'bad'] }
                }, result)).rejectedWith(/Node bad not found/)
                mockRED.nodes.remove.called.should.be.false()
            })
            it('should throw if node workspace is locked', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'locked-tab' })
                mockRED.workspaces.isLocked = sinon.stub().withArgs('locked-tab').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'] }
                }, result)).rejectedWith(/workspace locked-tab is locked/)
                mockRED.nodes.remove.called.should.be.false()
            })
        })
        describe('setWires action', () => {
            beforeEach(() => {
                mockRED.nodes.addLink = sinon.stub()
                mockRED.nodes.removeLink = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1 })
                mockRED.history = { push: sinon.stub() }
                mockRED.view.updateActive = sinon.stub()
                mockRED.view.redraw = sinon.stub()
                mockRED.workspaces = {
                    ...mockRED.workspaces,
                    isLocked: sinon.stub().returns(false)
                }
            })
            it('should add a wire between two nodes with history', async () => {
                const source = { id: 'n1', z: 'tab1', outputs: 1, dirty: false, changed: false }
                const target = { id: 'n2', z: 'tab1', type: 'debug' }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                const result = {}
                await expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)
                mockRED.nodes.addLink.calledOnce.should.be.true()
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'add')
                historyArg.should.have.property('links').which.is.an.Array().with.lengthOf(1)
                source.changed.should.be.false('wiring should not set node.changed (per NR convention)')
                source.dirty.should.be.true()
                mockRED.nodes.dirty.calledWith(true).should.be.true()
                mockRED.view.updateActive.calledOnce.should.be.true()
                mockRED.view.redraw.calledOnce.should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.deepEqual({ mode: 'add', source: 'n1', output: undefined, target: 'n2' })
            })
            it('should remove a wire with history', async () => {
                const source = { id: 'n1', z: 'tab1', outputs: 1, dirty: false, changed: false }
                const target = { id: 'n2', z: 'tab1', type: 'debug' }
                const existingLink = { source: { id: 'n1' }, sourcePort: 0, target: { id: 'n2' } }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                mockRED.nodes.getNodeLinks.returns([existingLink])
                const result = {}
                await expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'remove', source: 'n1', target: 'n2' }
                }, result)
                mockRED.nodes.removeLink.calledWith(existingLink).should.be.true()
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'delete')
                historyArg.should.have.property('links').which.is.an.Array().with.lengthOf(1)
                source.changed.should.be.false('wiring should not set node.changed (per NR convention)')
                result.should.have.property('success', true)
            })
            it('should use non-zero output port', async () => {
                const source = { id: 'n1', z: 'tab1', outputs: 3, dirty: false, changed: false }
                const target = { id: 'n2', z: 'tab1', type: 'debug' }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                const result = {}
                await expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', output: 2, target: 'n2' }
                }, result)
                const linkArg = mockRED.nodes.addLink.firstCall.args[0]
                linkArg.should.have.property('sourcePort', 2)
                result.should.have.property('success', true)
            })
            it('should throw if source node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'missing', target: 'n2' }
                }, result)).rejectedWith(/Source node missing not found/)
            })
            it('should throw if target node not found', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 1 })
                mockRED.nodes.node.withArgs('n2').returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)).rejectedWith(/Target node n2 not found/)
            })
            it('should throw if wiring a node to itself', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 1 })
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n1' }
                }, result)).rejectedWith(/Cannot wire a node to itself/)
            })
            it('should throw if source and target are on different tabs', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 1 })
                mockRED.nodes.node.withArgs('n2').returns({ id: 'n2', z: 'tab2', type: 'debug' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)).rejectedWith(/Source and target nodes must be on the same tab/)
            })
            it('should throw if workspace is locked', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 1 })
                mockRED.nodes.node.withArgs('n2').returns({ id: 'n2', z: 'tab1', type: 'debug' })
                mockRED.workspaces.isLocked.withArgs('tab1').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)).rejectedWith(/workspace tab1 is locked/)
            })
            it('should throw if source output port does not exist', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 1 })
                mockRED.nodes.node.withArgs('n2').returns({ id: 'n2', z: 'tab1', type: 'debug' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', output: 5, target: 'n2' }
                }, result)).rejectedWith(/does not have output port 5/)
            })
            it('should throw if source node has no outputs', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 0 })
                mockRED.nodes.node.withArgs('n2').returns({ id: 'n2', z: 'tab1', type: 'debug' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)).rejectedWith(/does not have output port 0/)
            })
            it('should throw if target node does not accept inputs', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'tab1', outputs: 1 })
                mockRED.nodes.node.withArgs('n2').returns({ id: 'n2', z: 'tab1', type: 'inject' })
                mockRED.nodes.getType.withArgs('inject').returns({ inputs: 0, outputs: 1 })
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)).rejectedWith(/does not accept inputs/)
            })
            it('should throw if adding a wire that already exists', async () => {
                const source = { id: 'n1', z: 'tab1', outputs: 1 }
                const target = { id: 'n2', z: 'tab1', type: 'debug' }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                mockRED.nodes.getNodeLinks.returns([
                    { source: { id: 'n1' }, sourcePort: 0, target: { id: 'n2' } }
                ])
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', source: 'n1', target: 'n2' }
                }, result)).rejectedWith(/Wire already exists from n1 port 0 to n2/)
            })
            it('should throw if removing a wire that does not exist', async () => {
                const source = { id: 'n1', z: 'tab1', outputs: 1 }
                const target = { id: 'n2', z: 'tab1', type: 'debug' }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                mockRED.nodes.getNodeLinks.returns([])
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'remove', source: 'n1', output: 0, target: 'n2' }
                }, result)).rejectedWith(/Wire not found from n1 port 0 to n2/)
            })
        })
        describe('setLinks action', () => {
            beforeEach(() => {
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.view.redraw = sinon.stub()
                mockRED.view.selection = sinon.stub().returns(null)
                mockRED.workspaces = {
                    ...mockRED.workspaces,
                    isLocked: sinon.stub().returns(false)
                }
            })
            it('should add a bidirectional link between link out and link in', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: [], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, result)
                linkOut.links.should.containEql('li1')
                linkIn.links.should.containEql('lo1')
                linkOut.dirty.should.be.true()
                linkIn.dirty.should.be.true()
                linkOut.changed.should.be.true()
                linkIn.changed.should.be.true()
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'multi')
                historyArg.events.should.have.lengthOf(2)
                mockRED.nodes.dirty.calledWith(true).should.be.true()
                mockRED.view.redraw.calledOnce.should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.deepEqual({ mode: 'add', source: 'lo1', target: 'li1' })
            })
            it('should remove a bidirectional link between link out and link in', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: ['li1'], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: ['lo1'], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'remove', source: 'lo1', target: 'li1' }
                }, result)
                linkOut.links.should.not.containEql('li1')
                linkIn.links.should.not.containEql('lo1')
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'multi')
                historyArg.events.should.have.lengthOf(2)
                result.should.have.property('success', true)
            })
            it('should add a unidirectional link from link call to link in', async () => {
                const linkCall = { id: 'lc1', type: 'link call', z: 'tab1', links: [], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: [], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lc1').returns(linkCall)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lc1', target: 'li1' }
                }, result)
                linkCall.links.should.containEql('li1')
                linkIn.links.should.not.containEql('lc1')
                linkCall.dirty.should.be.true()
                linkIn.dirty.should.be.false()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.events.should.have.lengthOf(1)
                result.should.have.property('success', true)
            })
            it('should remove a unidirectional link from link call to link in', async () => {
                const linkCall = { id: 'lc1', type: 'link call', z: 'tab1', links: ['li1'], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: [], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lc1').returns(linkCall)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'remove', source: 'lc1', target: 'li1' }
                }, result)
                linkCall.links.should.not.containEql('li1')
                linkIn.links.should.not.containEql('lc1')
                result.should.have.property('success', true)
            })
            it('should throw if linking a node to itself', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', z: 'tab1' })
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'lo1' }
                }, {})).rejectedWith(/Cannot link a node to itself/)
            })
            it('should throw if source node not found', async () => {
                mockRED.nodes.node.returns(null)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'missing', target: 'li1' }
                }, {})).rejectedWith(/Source node missing not found/)
            })
            it('should throw if target node not found', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', z: 'tab1' })
                mockRED.nodes.node.withArgs('li1').returns(null)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/Target node li1 not found/)
            })
            it('should throw if source is not a link out or link call', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', type: 'inject', z: 'tab1' })
                mockRED.nodes.node.withArgs('li1').returns({ id: 'li1', type: 'link in', z: 'tab1' })
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'n1', target: 'li1' }
                }, {})).rejectedWith(/must be a link out or link call node/)
            })
            it('should throw if target is not a link in', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', mode: 'link', z: 'tab1' })
                mockRED.nodes.node.withArgs('lo2').returns({ id: 'lo2', type: 'link out', mode: 'link', z: 'tab1' })
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'lo2' }
                }, {})).rejectedWith(/must be a link in node/)
            })
            it('should throw if source is link out in return mode', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', mode: 'return', z: 'tab1' })
                mockRED.nodes.node.withArgs('li1').returns({ id: 'li1', type: 'link in', z: 'tab1' })
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/return mode.*cannot have outbound links/)
            })
            it('should throw if source workspace is locked', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [] })
                mockRED.nodes.node.withArgs('li1').returns({ id: 'li1', type: 'link in', z: 'tab1', links: [] })
                mockRED.workspaces.isLocked.withArgs('tab1').returns(true)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/workspace tab1 is locked/)
            })
            it('should throw if target workspace is locked (cross-tab)', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [] })
                mockRED.nodes.node.withArgs('li1').returns({ id: 'li1', type: 'link in', z: 'tab2', links: [] })
                mockRED.workspaces.isLocked.withArgs('tab2').returns(true)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/workspace tab2 is locked/)
            })
            it('should throw if adding a link that already exists', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: ['li1'] }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: ['lo1'] }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/Link already exists from lo1 to li1/)
            })
            it('should throw if removing a link that does not exist', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [] }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: [] }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'remove', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/Link not found from lo1 to li1/)
            })
            it('should allow cross-tab links between link out and link in', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab2', links: [], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, result)
                linkOut.links.should.containEql('li1')
                linkIn.links.should.containEql('lo1')
                result.should.have.property('success', true)
            })
            it('should replace existing link when adding to link call (single target only)', async () => {
                const linkCall = { id: 'lc1', type: 'link call', linkType: 'static', z: 'tab1', links: ['li1'], dirty: false, changed: false }
                const newLinkIn = { id: 'li2', type: 'link in', z: 'tab1', links: [], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lc1').returns(linkCall)
                mockRED.nodes.node.withArgs('li2').returns(newLinkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lc1', target: 'li2' }
                }, result)
                linkCall.links.should.deepEqual(['li2'])
                linkCall.links.should.not.containEql('li1')
                result.should.have.property('success', true)
            })
            it('should throw if link call is in dynamic mode', async () => {
                mockRED.nodes.node.withArgs('lc1').returns({ id: 'lc1', type: 'link call', linkType: 'dynamic', z: 'tab1' })
                mockRED.nodes.node.withArgs('li1').returns({ id: 'li1', type: 'link in', z: 'tab1' })
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lc1', target: 'li1' }
                }, {})).rejectedWith(/dynamic mode.*cannot have static links/)
            })
            it('should refresh selection to update virtual wires', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: [], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                mockRED.view.selection.returns({ nodes: [linkOut] })
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, result)
                mockRED.view.select.calledWith({ nodes: [linkOut] }).should.be.true()
                mockRED.view.redraw.calledOnce.should.be.true()
            })
            it('should preserve history with previous links state for undo', async () => {
                const linkOut = { id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: ['existing1'], dirty: false, changed: false }
                const linkIn = { id: 'li1', type: 'link in', z: 'tab1', links: ['existing2'], dirty: false, changed: false }
                mockRED.nodes.node.withArgs('lo1').returns(linkOut)
                mockRED.nodes.node.withArgs('li1').returns(linkIn)
                const result = {}
                await expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, result)
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.events[0].changes.links.should.deepEqual(['existing1'])
                historyArg.events[1].changes.links.should.deepEqual(['existing2'])
            })
        })
        describe('addNodes action', () => {
            it('should validate types and delegate to importNodes with applyNodeDefaults', async () => {
                const addedNode = { id: 'n1', type: 'inject', z: 'tab1', x: 100, y: 200 }
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: { name: { value: '' }, repeat: { value: '' } } })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab' })
                // Returns null on pre-import existence check, then the node after import
                mockRED.nodes.node = sinon.stub()
                mockRED.nodes.node.withArgs('n1').onFirstCall().returns(null) // pre-import: node doesn't exist
                mockRED.nodes.node.withArgs('n1').returns(addedNode) // post-import lookup
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
                const nodes = [{ id: 'n1', type: 'inject', z: 'tab1', x: 100, y: 200 }]
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes }
                }, result)
                mockRED.nodes.getType.calledWith('inject').should.be.true()
                mockRED.view.importNodes.calledOnce.should.be.true()
                const importArgs = mockRED.view.importNodes.firstCall.args
                importArgs[0][0].should.have.property('id', 'n1')
                importArgs[1].should.have.property('generateIds', false)
                importArgs[1].should.have.property('addFlow', false)
                importArgs[1].should.have.property('notify', false)
                importArgs[1].should.have.property('applyNodeDefaults', true)
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
                result.should.have.property('data').which.is.an.Array().with.lengthOf(1)
                result.data[0].should.have.property('id', 'n1')
                result.data[0].should.have.property('type', 'inject')
                result.data[0].should.have.property('z', 'tab1')
                result.data[0].should.have.property('x', 100)
                result.data[0].should.have.property('y', 200)
                result.should.have.property('validation').which.is.an.Array().with.lengthOf(0)
            })
            it('should return validation errors for invalid added nodes', async () => {
                const addedNode = { id: 'n1', type: 'inject', z: 'tab1', x: 100, y: 200 }
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: { repeat: { value: '' } } })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab' })
                mockRED.nodes.node = sinon.stub()
                mockRED.nodes.node.withArgs('n1').onFirstCall().returns(null)
                mockRED.nodes.node.withArgs('n1').returns(addedNode)
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = false; n.validationErrors = ['repeat'] }) }
                const nodes = [{ id: 'n1', type: 'inject', z: 'tab1', x: 100, y: 200 }]
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes }
                }, result)
                result.should.have.property('success', true)
                result.should.have.property('validation').which.is.an.Array().with.lengthOf(1)
                result.validation[0].should.have.property('id', 'n1')
                result.validation[0].should.have.property('valid', false)
                result.validation[0].should.have.property('validationErrors').which.deepEqual(['repeat'])
            })
            it('should throw if node type is unknown', async () => {
                mockRED.nodes.getType = sinon.stub().returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'unknown', z: 'tab1' }] }
                }, result)).rejectedWith(/Unknown node type/)
            })
            // it('should switch to target tab when nodes target a different workspace', async () => {
            //     mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
            //     mockRED.nodes.workspace = sinon.stub().returns({ id: 'other-tab', type: 'tab' })
            //     mockRED.nodes.node = sinon.stub().returns(null)
            //     mockRED.view.importNodes = sinon.stub()
            //     mockRED.nodes.dirty = sinon.stub()
            //     mockRED.workspaces.active.returns('active-tab')
            //     const nodes = [{ id: 'n1', type: 'inject', z: 'other-tab', x: 100, y: 200 }]
            //     const result = {}
            //     await expertAutomations.invokeAction('automation/add-nodes', {
            //         params: { nodes }
            //     }, result)
            //     mockRED.workspaces.show.calledWith('other-tab').should.be.true()
            //     result.should.have.property('success', true)
            // })
            it('should validate workspace via hasWorkspace', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'active-tab', type: 'tab' })
                mockRED.nodes.node = sinon.stub().returns(null)
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.workspaces.active.returns('active-tab')
                const nodes = [{ id: 'n1', type: 'inject', z: 'active-tab', x: 100, y: 200 }]
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes }
                }, result)
                mockRED.nodes.workspace.calledWith('active-tab').should.be.true()
                result.should.have.property('success', true)
            })
            it('should throw if target tab does not exist', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'nonexistent' }] }
                }, result)).rejectedWith(/Workspace tab nonexistent not found/)
            })
            it('should throw if any target tab does not exist (mixed z)', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns(null)
                mockRED.nodes.workspace.withArgs('tab1').returns({ id: 'tab1', type: 'tab' })
                const result = {}
                const nodes = [
                    { id: 'n1', type: 'inject', z: 'tab1' },
                    { id: 'n2', type: 'debug', z: 'tab2' }
                ]
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes }
                }, result)).rejectedWith(/Workspace tab tab2 not found/)
            })
            it('should throw if target tab is locked', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab', locked: true })
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1' }] }
                }, result)).rejectedWith(/Workspace tab tab1 is locked/)
            })
            it('should throw if node IDs already exist on the canvas', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab' })
                mockRED.nodes.node = sinon.stub().returns({ id: 'n1' })
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1' }] }
                }, result)).rejectedWith(/Node ID\(s\) already exist: n1/)
                mockRED.view.importNodes.called.should.be.false('importNodes should not be called when IDs already exist')
            })
            it('should throw if nodes array is empty', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [] }
                }, result)).rejectedWith(/nodes array must not be empty/)
            })
            it('should pass generateIds option to importNodes', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab' })
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1' }], generateIds: true }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const opts = mockRED.view.importNodes.firstCall.args[1]
                opts.generateIds.should.equal(true)
                result.should.have.property('success', true)
            })
            it('should not include label in result.data when node.label is a function (postMessage structured clone safety)', async () => {
                const configNode = {
                    id: 'cfg1',
                    type: 'ui-base',
                    name: 'My Dashboard',
                    label: function () { return `${this.name} [${this.path}]` || 'UI Config' }
                }
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab' })
                mockRED.nodes.getType = sinon.stub().returns({ category: 'config', inputs: 0, outputs: 0, defaults: { name: { value: '' } } })
                mockRED.nodes.node = sinon.stub()
                mockRED.nodes.node.withArgs('cfg1').onFirstCall().returns(null)
                mockRED.nodes.node.withArgs('cfg1').returns(configNode)
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'cfg1', type: 'ui-base', name: 'My Dashboard', z: 'tab1' }] }
                }, result)
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Array().with.lengthOf(1)
                result.data[0].should.have.property('id', 'cfg1')
                result.data[0].should.not.have.property('label')
                should(() => JSON.stringify(result.data[0])).not.throw()
            })
            it('should throw if node is missing required property z', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject' }] }
                }, result)).rejectedWith(/missing required property: z/)
            })
            it('should throw if node is missing required property id', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ type: 'inject', z: 'tab1' }] }
                }, result)).rejectedWith(/missing required property: id/)
            })
            it('should throw if node is missing required property type', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', z: 'tab1' }] }
                }, result)).rejectedWith(/missing required property: type/)
            })
        })
        describe('removeTab action', () => {
            it('should remove an existing tab', async () => {
                const mockWs = { id: 'tab1', type: 'tab' }
                mockRED.nodes.workspace = sinon.stub().withArgs('tab1').returns(mockWs)
                mockRED.workspaces = { delete: sinon.stub() }
                const result = {}
                await expertAutomations.invokeAction('automation/remove-tab', {
                    params: { id: 'tab1' }
                }, result)
                mockRED.workspaces.delete.calledWith(mockWs).should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.deepEqual({ removed: 'tab1' })
            })
            it('should throw if tab not found', async () => {
                mockRED.nodes.workspace = sinon.stub().returns(null)
                mockRED.workspaces = { delete: sinon.stub() }
                await should(expertAutomations.invokeAction('automation/remove-tab', {
                    params: { id: 'does-not-exist' }
                }, {})).rejectedWith(/Tab with id does-not-exist not found/)
            })
            it('should throw if id is empty', async () => {
                mockRED.nodes.workspace = sinon.stub().returns(null)
                mockRED.workspaces = { delete: sinon.stub() }
                await should(expertAutomations.invokeAction('automation/remove-tab', {
                    params: { id: '' }
                }, {})).rejectedWith(/Tab with id .* not found/)
            })
            it('should throw if tab is locked', async () => {
                mockRED.nodes.workspace = sinon.stub().withArgs('locked-tab').returns({ id: 'locked-tab', type: 'tab', locked: true })
                mockRED.workspaces = { delete: sinon.stub() }
                await should(expertAutomations.invokeAction('automation/remove-tab', {
                    params: { id: 'locked-tab' }
                }, {})).rejectedWith(/Tab locked-tab is locked/)
                mockRED.workspaces.delete.called.should.be.false()
            })
        })
        describe('addTab action', () => {
            beforeEach(() => {
                mockRED.nodes.addWorkspace = sinon.stub().callsFake(ws => {
                    // After adding, workspace lookup should find it
                    mockRED.nodes.workspace.withArgs(ws.id).returns(ws)
                })
                mockRED.nodes.id = sinon.stub().returns('gen-id')
                mockRED.nodes.dirty = sinon.stub()
                mockRED.nodes.workspace = sinon.stub().returns(null)
                mockRED.nodes.subflow = sinon.stub().returns(null)
                mockRED.history = { push: sinon.stub() }
                mockRED.workspaces = { add: sinon.stub(), show: sinon.stub() }
            })
            it('should create a new tab with history and dirty', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/add-tab', {
                    params: { label: 'My Tab' }
                }, result)
                mockRED.nodes.addWorkspace.calledOnce.should.be.true()
                mockRED.workspaces.add.calledOnce.should.be.true()
                mockRED.workspaces.show.calledOnce.should.be.true()
                const ws = mockRED.nodes.addWorkspace.firstCall.args[0]
                ws.should.have.property('label', 'My Tab')
                ws.should.have.property('type', 'tab')
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'add')
                historyArg.should.have.property('workspaces').which.is.an.Array().with.lengthOf(1)
                mockRED.nodes.dirty.calledWith(true).should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Object()
                result.data.should.have.property('label', 'My Tab')
            })
            it('should use defaults when optional fields omitted', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/add-tab', {
                    params: { label: 'Minimal Tab' }
                }, result)
                const ws = mockRED.nodes.addWorkspace.firstCall.args[0]
                ws.should.have.property('disabled', false)
                ws.should.have.property('info', '')
                ws.should.have.property('env').which.deepEqual([])
                result.should.have.property('success', true)
            })
            it('should throw if label is missing', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-tab', {
                    params: {}
                }, result)).rejectedWith(/Tab label is required/)
            })
            it('should throw if tab ID already exists as a node', async () => {
                mockRED.nodes.node.withArgs('existing-id').returns({ id: 'existing-id' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-tab', {
                    params: { id: 'existing-id', label: 'Dupe Tab' }
                }, result)).rejectedWith(/ID existing-id already exists/)
            })
            it('should throw if tab ID already exists as a workspace', async () => {
                mockRED.nodes.workspace.withArgs('existing-ws').returns({ id: 'existing-ws' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-tab', {
                    params: { id: 'existing-ws', label: 'Dupe Tab' }
                }, result)).rejectedWith(/ID existing-ws already exists/)
            })
            it('should throw if tab ID already exists as a subflow', async () => {
                mockRED.nodes.subflow.withArgs('existing-sf').returns({ id: 'existing-sf' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-tab', {
                    params: { id: 'existing-sf', label: 'Dupe Tab' }
                }, result)).rejectedWith(/ID existing-sf already exists/)
            })
        })
        describe('close UI panel actions', () => {
            it('should close search', async () => {
                mockRED.search = { show: sinon.stub(), search: sinon.stub(), hide: sinon.stub() }
                const result = {}
                await expertAutomations.invokeAction('automation/close-search', { params: {} }, result)
                mockRED.search.hide.calledOnce.should.be.true()
                result.should.have.property('success', true)
            })
            it('should close type search via ESC dispatch when input element exists', async () => {
                mockRED.typeSearch = { hide: sinon.stub() }
                const mockInput = { dispatchEvent: sinon.stub() }
                const origDocument = globalThis.document
                const origKeyboardEvent = globalThis.KeyboardEvent
                globalThis.document = { getElementById: sinon.stub().withArgs('red-ui-type-search-input').returns(mockInput) }
                globalThis.KeyboardEvent = class KeyboardEvent {
                    constructor (type, opts) { this.type = type; this.key = opts.key; this.keyCode = opts.keyCode; this.bubbles = opts.bubbles }
                }
                try {
                    const result = {}
                    await expertAutomations.invokeAction('automation/close-type-search', { params: {} }, result)
                    mockInput.dispatchEvent.calledOnce.should.be.true()
                    const event = mockInput.dispatchEvent.firstCall.args[0]
                    event.key.should.equal('Escape')
                    event.keyCode.should.equal(27)
                    event.bubbles.should.be.true()
                    mockRED.typeSearch.hide.called.should.be.false()
                    result.should.have.property('success', true)
                } finally {
                    if (origDocument) { globalThis.document = origDocument } else { delete globalThis.document }
                    if (origKeyboardEvent) { globalThis.KeyboardEvent = origKeyboardEvent } else { delete globalThis.KeyboardEvent }
                }
            })
            it('should fall back to RED.typeSearch.hide() when input element not found', async () => {
                mockRED.typeSearch = { hide: sinon.stub() }
                const origDocument = globalThis.document
                globalThis.document = { getElementById: sinon.stub().returns(null) }
                try {
                    const result = {}
                    await expertAutomations.invokeAction('automation/close-type-search', { params: {} }, result)
                    mockRED.typeSearch.hide.calledOnce.should.be.true()
                    result.should.have.property('success', true)
                } finally {
                    if (origDocument) { globalThis.document = origDocument } else { delete globalThis.document }
                }
            })
            it('should close action list', async () => {
                mockRED.actionList = { hide: sinon.stub() }
                const result = {}
                await expertAutomations.invokeAction('automation/close-action-list', { params: {} }, result)
                mockRED.actionList.hide.calledOnce.should.be.true()
                result.should.have.property('success', true)
            })
        })
        describe('getWorkspaceNodes action', () => {
            it('should delegate to RED.nodes.createCompleteNodeSet', async () => {
                const mockFlows = [
                    { id: 'tab1', type: 'tab', label: 'Flow 1' },
                    { id: 'n1', type: 'inject', z: 'tab1', wires: [['n2']] }
                ]
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns(mockFlows)
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.should.have.property('flows').which.deepEqual(mockFlows)
                mockRED.nodes.createCompleteNodeSet.calledOnce.should.be.true()
                mockRED.nodes.createCompleteNodeSet.firstCall.args[0].should.deepEqual({ credentials: false })
            })
            it('should return empty array when no flows exist', async () => {
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.should.have.property('flows').which.deepEqual([])
            })
        })
        describe('updateNode action', () => {
            it('should update node properties with history and changed flag', async () => {
                const mockNode = { id: 'n1', name: 'old', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-node', {
                    params: { id: 'n1', properties: { name: 'new' } }
                }, result)
                mockNode.name.should.equal('new')
                mockNode.changed.should.be.true()
                mockNode.dirty.should.be.true()
                mockRED.history.push.calledOnce.should.be.true()
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.should.have.property('t', 'edit')
                historyArg.should.have.property('node', mockNode)
                historyArg.should.have.property('changes').which.deepEqual({ name: 'old' })
                historyArg.should.have.property('changed', false)
                mockRED.nodes.dirty.calledWith(true).should.be.true()
                mockRED.view.redraw.calledOnce.should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Object()
                result.data.should.have.property('id', 'n1')
                result.data.should.have.property('name', 'new')
                result.should.have.property('validation').which.deepEqual({ valid: true })
            })
            it('should return validation errors after update', async () => {
                const mockNode = { id: 'n1', repeat: 'bad', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = false; n.validationErrors = ['repeat'] }) }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-node', {
                    params: { id: 'n1', properties: { repeat: 'bad' } }
                }, result)
                result.should.have.property('success', true)
                result.should.have.property('validation').which.deepEqual({ valid: false, validationErrors: ['repeat'] })
            })
            it('should capture old values correctly before applying changes', async () => {
                const mockNode = { id: 'n1', name: 'original', x: 100, changed: true }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-node', {
                    params: { id: 'n1', properties: { name: 'updated', x: 200 } }
                }, result)
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.changes.should.deepEqual({ name: 'original', x: 100 })
                historyArg.changed.should.be.true()
                mockNode.name.should.equal('updated')
                mockNode.x.should.equal(200)
            })
            it('should throw if properties is empty object', async () => {
                const mockNode = { id: 'n1', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                const result = {}
                await should(expertAutomations.invokeAction('automation/update-node', {
                    params: { id: 'n1', properties: {} }
                }, result)).rejectedWith(/"properties" must not be empty/)
            })
            it('should throw if node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/update-node', {
                    params: { id: 'missing', properties: { name: 'x' } }
                }, result)).rejectedWith(/Node missing not found/)
            })
            describe('patches', () => {
                function setupPatchNode (overrides = {}) {
                    const mockNode = {
                        id: 'n1',
                        func: 'line1\nline2\nline3\nline4\nline5',
                        changed: false,
                        ...overrides
                    }
                    mockRED.nodes.node.withArgs('n1').returns(mockNode)
                    mockRED.nodes.dirty = sinon.stub()
                    mockRED.history = { push: sinon.stub() }
                    mockRED.editor = { validateNode: sinon.stub() }
                    mockRED.view.redraw = sinon.stub()
                    return mockNode
                }

                it('should replace a single line', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 2, end: 2, content: 'B' }] }
                    }, result)
                    mockNode.func.should.equal('a\nB\nc')
                    result.should.have.property('success', true)
                })
                it('should replace a range with fewer lines', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc\nd' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 2, end: 3, content: 'X' }] }
                    }, result)
                    mockNode.func.should.equal('a\nX\nd')
                })
                it('should replace a range with more lines', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 2, end: 2, content: 'X\nY\nZ' }] }
                    }, result)
                    mockNode.func.should.equal('a\nX\nY\nZ\nc')
                })
                it('should delete lines with op delete', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc\nd' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'delete', start: 2, end: 3 }] }
                    }, result)
                    mockNode.func.should.equal('a\nd')
                })
                it('should apply multiple non-overlapping patches bottom-up', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [
                                { property: 'func', op: 'replace', start: 1, end: 1, content: 'TOP' },
                                { property: 'func', op: 'replace', start: 4, end: 5, content: 'BOTTOM' }
                            ]
                        }
                    }, result)
                    mockNode.func.should.equal('TOP\nline2\nline3\nBOTTOM')
                })
                it('should patch different properties independently', async () => {
                    const mockNode = setupPatchNode({ template: 'h1\nh2\nh3' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [
                                { property: 'func', op: 'replace', start: 1, end: 1, content: 'FUNC' },
                                { property: 'template', op: 'replace', start: 2, end: 2, content: 'H2' }
                            ]
                        }
                    }, result)
                    mockNode.func.should.equal('FUNC\nline2\nline3\nline4\nline5')
                    mockNode.template.should.equal('h1\nH2\nh3')
                })
                it('should support patches together with properties', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            properties: { name: 'Patched' },
                            patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'FIRST' }]
                        }
                    }, result)
                    mockNode.name.should.equal('Patched')
                    mockNode.func.should.equal('FIRST\nline2\nline3\nline4\nline5')
                    const historyArg = mockRED.history.push.firstCall.args[0]
                    historyArg.changes.should.have.property('func', 'line1\nline2\nline3\nline4\nline5')
                    historyArg.changes.should.have.property('name', undefined)
                })
                it('should record original value in history for undo', async () => {
                    const mockNode = setupPatchNode({ func: 'old\ncode' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'new' }] }
                    }, result)
                    mockNode.func.should.equal('new\ncode')
                    const historyArg = mockRED.history.push.firstCall.args[0]
                    historyArg.changes.should.have.property('func', 'old\ncode')
                })
                it('should insert lines after the last line (append)', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'insert', start: 3, content: 'c\nd' }] }
                    }, result)
                    mockNode.func.should.equal('a\nb\nc\nd')
                })
                it('should insert lines before the first line (prepend)', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'insert', start: 1, content: 'z' }] }
                    }, result)
                    mockNode.func.should.equal('z\na\nb')
                })
                it('should insert lines between existing lines', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'insert', start: 3, content: 'inserted' }] }
                    }, result)
                    mockNode.func.should.equal('a\nb\ninserted\nc')
                })
                it('should replace last line and append new lines in one call', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [
                                { property: 'func', op: 'replace', start: 5, end: 5, content: 'return [msg, null];' },
                                { property: 'func', op: 'insert', start: 6, content: '// appended' }
                            ]
                        }
                    }, result)
                    mockNode.func.should.equal('line1\nline2\nline3\nline4\nreturn [msg, null];\n// appended')
                })
                it('should prepend new lines and replace first line in one call', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [
                                { property: 'func', op: 'insert', start: 1, content: '// header' },
                                { property: 'func', op: 'replace', start: 1, end: 1, content: 'FIRST' }
                            ]
                        }
                    }, result)
                    mockNode.func.should.equal('// header\nFIRST\nline2\nline3\nline4\nline5')
                })
                it('should patch a single-line property', async () => {
                    const mockNode = setupPatchNode({ func: 'only line' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'replaced' }] }
                    }, result)
                    mockNode.func.should.equal('replaced')
                })
                it('should auto-detect tab separator and preserve it', async () => {
                    const mockNode = setupPatchNode({ func: '$sum(items.price)\t* discount\t+ shipping' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 2, end: 2, content: '* (discount + loyalty)' }] }
                    }, result)
                    mockNode.func.should.equal('$sum(items.price)\t* (discount + loyalty)\t+ shipping')
                })
                it('should insert with tab separator when target uses tabs', async () => {
                    const mockNode = setupPatchNode({ func: 'a\tb\tc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'insert', start: 4, content: 'd' }] }
                    }, result)
                    mockNode.func.should.equal('a\tb\tc\td')
                })
                it('should delete with tab separator when target uses tabs', async () => {
                    const mockNode = setupPatchNode({ func: 'a\tb\tc\td' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'delete', start: 2, end: 3 }] }
                    }, result)
                    mockNode.func.should.equal('a\td')
                })
                it('should use newline when value contains both tabs and newlines', async () => {
                    const mockNode = setupPatchNode({ func: 'line1\nline2\twith tab\nline3' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 2, end: 2, content: 'replaced' }] }
                    }, result)
                    mockNode.func.should.equal('line1\nreplaced\nline3')
                })
                it('should patch a nested property via dot path', async () => {
                    const mockNode = setupPatchNode({
                        rules: [{ from: 'msg.payload', to: '$sum(items.price)\n* 1.0', type: 'jsonata' }]
                    })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [{ property: 'rules.0.to', op: 'replace', start: 2, end: 2, content: '* 1.2' }]
                        }
                    }, result)
                    mockNode.rules[0].to.should.equal('$sum(items.price)\n* 1.2')
                    const historyArg = mockRED.history.push.firstCall.args[0]
                    historyArg.changes.rules[0].to.should.equal('$sum(items.price)\n* 1.0')
                })
                it('should patch multiple nested paths on the same top-level property', async () => {
                    const mockNode = setupPatchNode({
                        rules: [
                            { to: 'line1\nline2' },
                            { to: 'aaa\nbbb' }
                        ]
                    })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [
                                { property: 'rules.0.to', op: 'replace', start: 1, end: 1, content: 'LINE1' },
                                { property: 'rules.1.to', op: 'replace', start: 2, end: 2, content: 'BBB' }
                            ]
                        }
                    }, result)
                    mockNode.rules[0].to.should.equal('LINE1\nline2')
                    mockNode.rules[1].to.should.equal('aaa\nBBB')
                })
                it('should refresh sidebar info panel after update', async () => {
                    setupPatchNode()
                    mockRED.sidebar = { info: { refresh: sinon.stub() } }
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'X' }] }
                    }, result)
                    mockRED.sidebar.info.refresh.calledOnce.should.be.true()
                })
                it('should close editor tray if open during update', async () => {
                    setupPatchNode()
                    const triggerStub = sinon.stub()
                    let stateCallCount = 0
                    mockRED.view.state = sinon.stub().callsFake(() => {
                        stateCallCount++
                        return stateCallCount <= 2 ? 2 : 1
                    })
                    global.$ = sinon.stub().returns({ trigger: triggerStub })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'X' }] }
                    }, result)
                    triggerStub.calledWith('click').should.be.true()
                    result.should.have.property('success', true)
                    delete global.$
                })
                it('should not close tray when editor is not open', async () => {
                    setupPatchNode()
                    global.$ = sinon.stub().returns({ trigger: sinon.stub() })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'X' }] }
                    }, result)
                    global.$.called.should.be.false()
                    delete global.$
                })
                it('should throw if start > end for replace', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 5, end: 2, content: 'x' }] }
                    }, result)).rejectedWith(/Invalid patch range/)
                })
                it('should throw if end exceeds line count', async () => {
                    setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 999, content: 'x' }] }
                    }, result)).rejectedWith(/exceeds line count/)
                })
                it('should throw if property is not a string', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'x', op: 'replace', start: 1, end: 1, content: '100' }] }
                    }, result)).rejectedWith(/not a string/)
                })
                it('should throw on overlapping replace patches', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: {
                            id: 'n1',
                            patches: [
                                { property: 'func', op: 'replace', start: 1, end: 3, content: 'a' },
                                { property: 'func', op: 'replace', start: 2, end: 4, content: 'b' }
                            ]
                        }
                    }, result)).rejectedWith(/Overlapping patches/)
                })
                it('should throw if neither properties nor patches provided', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1' }
                    }, result)).rejectedWith(/At least one of/)
                })
                it('should throw if node not found with patches', async () => {
                    mockRED.nodes.node.returns(null)
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'missing', patches: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'x' }] }
                    }, result)).rejectedWith(/Node missing not found/)
                })
                it('should throw if start is not a positive integer', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 0, end: 1, content: 'x' }] }
                    }, result)).rejectedWith(/must be a positive integer/)
                })
                it('should throw if insert position exceeds line count + 1', async () => {
                    setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'insert', start: 4, content: 'x' }] }
                    }, result)).rejectedWith(/exceeds line count/)
                })
                it('should throw if replace is missing end', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, content: 'x' }] }
                    }, result)).rejectedWith(/requires "end"/)
                })
                it('should throw if replace is missing content', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'replace', start: 1, end: 1 }] }
                    }, result)).rejectedWith(/requires "content"/)
                })
                it('should throw if delete is missing end', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'delete', start: 1 }] }
                    }, result)).rejectedWith(/requires "end"/)
                })
                it('should throw if insert is missing content', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'insert', start: 1 }] }
                    }, result)).rejectedWith(/requires "content"/)
                })
                it('should throw on unknown op', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'func', op: 'move', start: 1 }] }
                    }, result)).rejectedWith(/Unknown patch op/)
                })
                it('should throw if nested path cannot be resolved', async () => {
                    setupPatchNode({ rules: [{ to: 'value' }] })
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-node', {
                        params: { id: 'n1', patches: [{ property: 'rules.5.to', op: 'replace', start: 1, end: 1, content: 'x' }] }
                    }, result)).rejectedWith(/resolved to/)
                })
            })
        })
        describe('closeEditorTray action', () => {
            afterEach(() => {
                delete global.$
            })
            it('should close the editor tray by clicking cancel', async () => {
                const triggerStub = sinon.stub()
                mockRED.view.state = sinon.stub()
                mockRED.view.state.onFirstCall().returns(2)
                mockRED.view.state.returns(1)
                global.$ = sinon.stub().returns({ trigger: triggerStub })
                const result = {}
                await expertAutomations.invokeAction('automation/close-editor-tray', {
                    params: {}
                }, result)
                global.$.calledWith('.red-ui-tray-toolbar button#node-dialog-cancel').should.be.true()
                triggerStub.calledWith('click').should.be.true()
                result.should.have.property('closed', true)
                result.should.have.property('success', true)
            })
            it('should close multiple stacked trays', async () => {
                let clickCount = 0
                const triggerStub = sinon.stub().callsFake(() => { clickCount++ })
                mockRED.view.state = sinon.stub().callsFake(() => clickCount >= 2 ? 1 : 2)
                global.$ = sinon.stub().returns({ trigger: triggerStub })
                const result = {}
                await expertAutomations.invokeAction('automation/close-editor-tray', {
                    params: {}
                }, result)
                triggerStub.callCount.should.equal(2)
                result.should.have.property('closed', true)
            })
            it('should return closed false if tray did not close within max iterations', async () => {
                mockRED.view.state = sinon.stub().returns(2)
                global.$ = sinon.stub().returns({ trigger: sinon.stub() })
                const clock = sinon.useFakeTimers()
                const result = {}
                const promise = expertAutomations.invokeAction('automation/close-editor-tray', {
                    params: {}
                }, result)
                for (let i = 0; i < 10; i++) {
                    await clock.tickAsync(300)
                }
                await promise
                global.$.callCount.should.equal(10)
                result.should.have.property('closed', false)
                clock.restore()
            })
            it('should be a no-op when editor is already in default state', async () => {
                global.$ = sinon.stub().returns({ trigger: sinon.stub() })
                const result = {}
                await expertAutomations.invokeAction('automation/close-editor-tray', {
                    params: {}
                }, result)
                global.$.called.should.be.false()
                result.should.have.property('closed', true)
            })
        })
        describe('showWorkspace action', () => {
            it('should navigate to the specified workspace', async () => {
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', label: 'My Tab', type: 'tab' })
                mockRED.workspaces = { show: sinon.stub() }
                const result = {}
                await expertAutomations.invokeAction('automation/show-workspace', {
                    params: { id: 'tab1' }
                }, result)
                mockRED.workspaces.show.calledWith('tab1').should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.deepEqual({ id: 'tab1', label: 'My Tab' })
            })
            it('should throw if workspace does not exist', async () => {
                mockRED.nodes.workspace = sinon.stub().returns(null)
                mockRED.workspaces = { show: sinon.stub() }
                const result = {}
                await should(expertAutomations.invokeAction('automation/show-workspace', {
                    params: { id: 'nonexistent' }
                }, result)).rejectedWith(/Workspace nonexistent not found/)
            })
        })
        describe('importFlow action', () => {
            beforeEach(() => {
                mockRED.view.importNodes = sinon.stub().returns([{ id: 'n1', type: 'inject' }])
                mockRED.nodes.dirty = sinon.stub()
                mockRED._ = sinon.stub().returns('error')
                mockRED.workspaces = { ...mockRED.workspaces, isLocked: sinon.stub().returns(false) }
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
            })
            it('should import flow JSON string', async () => {
                const flowJson = JSON.stringify([{ id: 'n1', type: 'inject' }])
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowJson }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[1].should.have.property('touchImport', true)
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Array().with.lengthOf(1)
                result.data[0].should.have.property('id', 'n1')
                result.data[0].should.have.property('type', 'inject')
                result.should.have.property('validation').which.is.an.Array().with.lengthOf(0)
            })
            it('should return validation errors for invalid imported nodes', async () => {
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = false; n.validationErrors = ['repeat'] }) }
                const flowJson = JSON.stringify([{ id: 'n1', type: 'inject' }])
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowJson }
                }, result)
                result.should.have.property('success', true)
                result.should.have.property('validation').which.is.an.Array().with.lengthOf(1)
                result.validation[0].should.have.property('id', 'n1')
                result.validation[0].should.have.property('valid', false)
                result.validation[0].should.have.property('validationErrors').which.deepEqual(['repeat'])
            })
            it('should import flow array and validate via redOps.validateFlow', async () => {
                sinon.stub(expertAutomations.redOps, 'validateFlow').returns([{ id: 'n1', type: 'inject' }])
                const flowArray = [{ id: 'n1', type: 'inject' }]
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowArray }
                }, result)
                expertAutomations.redOps.validateFlow.calledWith(flowArray).should.be.true()
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[0].should.deepEqual(flowArray)
                args[1].should.have.property('touchImport', true)
                result.should.have.property('success', true)
                expertAutomations.redOps.validateFlow.restore()
            })
            it('should throw when flow param is neither string nor array', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: 12345 }
                }, result)).rejectedWith('importFlow expects a JSON string or an array of node objects')
            })
            it('should pass addFlowTab: true to importNodes as addFlow: true', async () => {
                const flowArray = [{ id: 'n1', type: 'inject' }]
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowArray, addFlowTab: true }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[1].should.have.property('addFlow', true)
                result.should.have.property('success', true)
            })
            it('should throw if importing into a locked workspace', async () => {
                mockRED.workspaces.isLocked = sinon.stub().returns(true)
                const flowArray = [{ id: 'n1', type: 'inject' }]
                const result = {}
                await should(expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowArray }
                }, result)).rejectedWith(/Cannot import into a locked workspace/)
                mockRED.view.importNodes.called.should.be.false()
            })
            it('should allow import into locked workspace when addFlowTab is true', async () => {
                mockRED.workspaces.isLocked = sinon.stub().returns(true)
                const flowArray = [{ id: 'n1', type: 'inject' }]
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowArray, addFlowTab: true }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                result.should.have.property('success', true)
            })
            it('should rethrow importNodes errors with a descriptive message', async () => {
                mockRED.view.importNodes = sinon.stub().throws(new Error('duplicate node id'))
                const flowArray = [{ id: 'n1', type: 'inject' }]
                await should(expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowArray }
                }, {})).rejectedWith(/importNodes failed: duplicate node id/)
            })
        })
    })
})
