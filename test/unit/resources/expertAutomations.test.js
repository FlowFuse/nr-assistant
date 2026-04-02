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
                createExportableNodeSet: sinon.stub().callsFake((nodes) => nodes || [])
            },
            settings: {
                version: '4.1.4'
            },
            state: { DEFAULT: 1 }
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
            supportedActions.should.only.have.keys('automation/get-nodes', 'automation/select-nodes', 'automation/open-node-edit', 'automation/search', 'automation/add-flow-tab', 'automation/show-workspace')
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
                args[1].should.deepEqual({ generateIds: true, addFlow: false, notify: false })
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
    })
})
