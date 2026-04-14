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
            supportedActions.should.only.have.keys('automation/get-nodes', 'automation/select-nodes', 'automation/open-node-edit', 'automation/search', 'automation/add-flow-tab', 'automation/update-node', 'automation/show-workspace', 'automation/get-workspace-nodes', 'automation/close-search', 'automation/close-type-search', 'automation/close-action-list', 'automation/add-tab', 'automation/remove-tab', 'automation/add-nodes', 'automation/remove-nodes', 'automation/set-wires', 'automation/import-flow')
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
                sinon.stub(expertAutomations.redOps, 'commandAndWait').callsFake((cmd, event, options) => {
                    cmd() // execute the command immediately for testing
                    return Promise.resolve()
                })
                await expertAutomations.invokeAction('automation/add-flow-tab', { params: { title: 'My New Flow' } }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[0].should.deepEqual([{ id: '', type: 'tab', label: 'My New Flow', disabled: false, info: '', env: [] }])
                args[1].should.deepEqual({ generateIds: true, addFlow: false, notify: false, touchImport: true, applyNodeDefaults: true })
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
                }, result)).rejectedWith(/Node\(s\) not found: nonexistent/)
                mockRED.nodes.remove.called.should.be.false()
            })
            it('should throw without removing anything if mix of valid and invalid IDs', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1' })
                mockRED.nodes.node.withArgs('bad').returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1', 'bad'] }
                }, result)).rejectedWith(/Node\(s\) not found: bad/)
                mockRED.nodes.remove.called.should.be.false()
            })
        })
        describe('setWires action', () => {
            beforeEach(() => {
                mockRED.nodes.addLink = sinon.stub()
                mockRED.nodes.removeLink = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                mockRED.history = { push: sinon.stub() }
                mockRED.view.updateActive = sinon.stub()
                mockRED.view.redraw = sinon.stub()
            })
            it('should add a wire between two nodes with history', async () => {
                const source = { id: 'n1', dirty: false, changed: false }
                const target = { id: 'n2' }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                const result = {}
                await expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', from: 'n1', to: 'n2' }
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
            })
            it('should remove a wire with history', async () => {
                const source = { id: 'n1', dirty: false, changed: false }
                const existingLink = { source: { id: 'n1' }, sourcePort: 0, target: { id: 'n2' } }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.getNodeLinks.returns([existingLink])
                const result = {}
                await expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'remove', from: 'n1', to: 'n2' }
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
                const source = { id: 'n1', dirty: false, changed: false }
                const target = { id: 'n2' }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.node.withArgs('n2').returns(target)
                const result = {}
                await expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', from: 'n1', output: 2, to: 'n2' }
                }, result)
                const linkArg = mockRED.nodes.addLink.firstCall.args[0]
                linkArg.should.have.property('sourcePort', 2)
                result.should.have.property('success', true)
            })
            it('should throw if source node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'add', from: 'missing', to: 'n2' }
                }, result)).rejectedWith(/Source node missing not found/)
            })
            it('should throw if removing a wire that does not exist', async () => {
                const source = { id: 'n1', dirty: false, changed: false }
                mockRED.nodes.node.withArgs('n1').returns(source)
                mockRED.nodes.getNodeLinks.returns([])
                const result = {}
                await should(expertAutomations.invokeAction('automation/set-wires', {
                    params: { mode: 'remove', from: 'n1', output: 0, to: 'n2' }
                }, result)).rejectedWith(/Wire not found from n1 port 0 to n2/)
            })
        })
        describe('addNodes action', () => {
            it('should validate types and delegate to importNodes with applyNodeDefaults', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: { name: { value: '' }, repeat: { value: '' } } })
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
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
            })
            it('should throw if node type is unknown', async () => {
                mockRED.nodes.getType = sinon.stub().returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'unknown', z: 'tab1' }] }
                }, result)).rejectedWith(/Unknown node type/)
            })
            it('should switch to target tab when nodes target a different workspace', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.workspaces.active.returns('active-tab')
                const nodes = [{ id: 'n1', type: 'inject', z: 'other-tab', x: 100, y: 200 }]
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes }
                }, result)
                mockRED.workspaces.show.calledWith('other-tab').should.be.true()
                result.should.have.property('success', true)
            })
            it('should not switch tabs when nodes target the active workspace', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.workspaces.active.returns('active-tab')
                const nodes = [{ id: 'n1', type: 'inject', z: 'active-tab', x: 100, y: 200 }]
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes }
                }, result)
                mockRED.workspaces.show.called.should.be.false()
                result.should.have.property('success', true)
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
        })
        describe('addTab action', () => {
            beforeEach(() => {
                mockRED.nodes.addWorkspace = sinon.stub()
                mockRED.nodes.id = sinon.stub().returns('gen-id')
                mockRED.nodes.dirty = sinon.stub()
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
            it('should return flows with tabs and nodes', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(cb => {
                    cb({ id: 'tab1', label: 'Flow 1', disabled: false })
                })
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'test', x: 100, y: 200, outputs: 1, _config: {} })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.should.have.property('flows').which.is.an.Array()
                result.flows.should.have.length(2)
                result.flows[0].should.have.property('type', 'tab')
            })
            it('should include _config properties in node output', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'test', outputs: 0, _config: { topic: '"hello"' } })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('topic', 'hello')
            })
            it('should populate wires from links', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'test', outputs: 1, _config: {} })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([
                    { source: { id: 'n1' }, sourcePort: 0, target: { id: 'n2' } }
                ])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('wires').which.deepEqual([['n2']])
            })
            it('should return empty wires for nodes with zero outputs', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'debug', z: 'tab1', name: 'dbg', outputs: 0, _config: {} })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('wires').which.deepEqual([])
            })
            it('should handle multiple tabs', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(cb => {
                    cb({ id: 'tab1', label: 'Flow 1', disabled: false })
                    cb({ id: 'tab2', label: 'Flow 2', disabled: true })
                })
                mockRED.nodes.eachNode = sinon.stub().callsFake(() => {})
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows.should.have.length(2)
                result.flows[0].should.have.property('label', 'Flow 1')
                result.flows[1].should.have.property('label', 'Flow 2')
                result.flows[1].should.have.property('disabled', true)
            })
            it('should omit x and y when node has no coordinates', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'no-coords', outputs: 0, _config: {} })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.not.have.property('x')
                result.flows[0].should.not.have.property('y')
            })
            it('should populate wires on multiple output ports', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'switch', z: 'tab1', name: 'sw', outputs: 2, _config: {} })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([
                    { source: { id: 'n1' }, sourcePort: 0, target: { id: 'a1' } },
                    { source: { id: 'n1' }, sourcePort: 1, target: { id: 'b1' } },
                    { source: { id: 'n1' }, sourcePort: 0, target: { id: 'a2' } }
                ])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('wires').which.deepEqual([['a1', 'a2'], ['b1']])
            })
            it('should exclude x and y keys from _config', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'test', x: 10, y: 20, outputs: 0, _config: { x: '999', y: '888', topic: '"hi"' } })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('x', 10)
                result.flows[0].should.have.property('y', 20)
                result.flows[0].should.have.property('topic', 'hi')
            })
            it('should not overwrite existing plain properties from _config', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'original', outputs: 0, _config: { name: '"overwritten"' } })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('name', 'original')
            })
            it('should fall back to raw string when _config value is not valid JSON', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'test', outputs: 0, _config: { payload: 'not-valid-json{' } })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.flows[0].should.have.property('payload', 'not-valid-json{')
            })
            it('should handle node without _config property', async () => {
                mockRED.nodes.eachWorkspace = sinon.stub().callsFake(() => {})
                mockRED.nodes.eachNode = sinon.stub().callsFake(cb => {
                    cb({ id: 'n1', type: 'inject', z: 'tab1', name: 'no-config', x: 50, y: 60, outputs: 0 })
                })
                mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.flows[0].should.have.property('id', 'n1')
                result.flows[0].should.have.property('name', 'no-config')
                result.flows[0].should.have.property('wires').which.deepEqual([])
            })
        })
        describe('updateNode action', () => {
            it('should update node properties with history and changed flag', async () => {
                const mockNode = { id: 'n1', name: 'old', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.editor = { validateNode: sinon.stub() }
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
            it('should throw if node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/update-node', {
                    params: { id: 'missing', properties: {} }
                }, result)).rejectedWith(/Node missing not found/)
            })
        })
        describe('showWorkspace action', () => {
            it('should navigate to the specified workspace', async () => {
                mockRED.workspaces = { show: sinon.stub() }
                const result = {}
                await expertAutomations.invokeAction('automation/show-workspace', {
                    params: { id: 'tab1' }
                }, result)
                mockRED.workspaces.show.calledWith('tab1').should.be.true()
                result.should.have.property('success', true)
            })
        })
        describe('importFlow action', () => {
            it('should import flow JSON string', async () => {
                mockRED.view.importNodes = sinon.stub()
                mockRED._ = sinon.stub().returns('error')
                const flowJson = JSON.stringify([{ id: 'n1', type: 'inject' }])
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowJson }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[1].should.have.property('touchImport', true)
                result.should.have.property('success', true)
            })
            it('should import flow array directly without JSON.parse', async () => {
                mockRED.view.importNodes = sinon.stub()
                const flowArray = [{ id: 'n1', type: 'inject' }]
                const result = {}
                await expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: flowArray }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                const args = mockRED.view.importNodes.firstCall.args
                args[0].should.deepEqual(flowArray)
                args[1].should.have.property('touchImport', true)
                result.should.have.property('success', true)
            })
            it('should throw when flow param is neither string nor array', async () => {
                mockRED.view.importNodes = sinon.stub()
                mockRED._ = sinon.stub().returns('error')
                const result = {}
                await should(expertAutomations.invokeAction('automation/import-flow', {
                    params: { flow: 12345 }
                }, result)).rejectedWith('importFlow expects a JSON string or an array of node objects')
            })
            it('should pass addFlowTab: true to importNodes as addFlow: true', async () => {
                mockRED.view.importNodes = sinon.stub()
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
        })
    })
})
