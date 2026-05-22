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
                state: sinon.stub().returns(1), // default to default state
                updateActive: sinon.stub(),
                redraw: sinon.stub()
            },
            nodes: {
                node: sinon.stub(),
                group: sinon.stub().returns(null),
                getAllFlowNodes: sinon.stub(),
                getNodeLinks: sinon.stub().returns([]),
                getType: sinon.stub().returns(null),
                createExportableNodeSet: sinon.stub().callsFake((nodes) => nodes || []),
                dirty: sinon.stub()
            },
            settings: {
                version: '4.1.4'
            },
            state: { DEFAULT: 1 },
            workspaces: {
                active: sinon.stub().returns('active-tab'),
                show: sinon.stub(),
                isLocked: sinon.stub().returns(false),
                selection: sinon.stub().returns([]),
                isHidden: sinon.stub().returns(false)
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
                'automation/update-nodes',
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
                'automation/close-editor-tray',
                'automation/get-node-types',
                'automation/get-palette',
                'automation/list-config-nodes',
                'automation/open-palette-manager',
                'automation/manage-groups',
                'automation/align-selection'
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
            it('should return empty array if node not found', () => {
                mockRED.nodes.node.returns(null)
                const result = expertAutomations.selectNodes('node1', null)
                result.should.deepEqual([])
                mockRED.view.select.called.should.be.false()
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
            it('should return empty array if node not found', () => {
                mockRED.nodes.node.returns(null)
                const result = expertAutomations.getNodes('node1', null)
                result.should.deepEqual([])
            })
            it('should support include with ids array', () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                const n4 = { id: 'n4' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }, { target: n4 }])
                mockRED.nodes.getNodeLinks.withArgs('n4', 0).returns([])
                const result = expertAutomations.getNodes(['n1', 'n2'], 'downstream')
                result.should.have.lengthOf(4)
                result.map(n => n.id).should.deepEqual(['n1', 'n3', 'n2', 'n4'])
            })
            it('should deduplicate overlapping connections across ids', () => {
                const n1 = { id: 'n1' }
                const shared = { id: 'shared' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('shared').returns(shared)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: shared }])
                mockRED.nodes.getNodeLinks.withArgs('shared', 0).returns([])
                const result = expertAutomations.getNodes(['n1', 'shared'], 'downstream')
                result.should.have.lengthOf(2)
                result.map(n => n.id).should.deepEqual(['n1', 'shared'])
            })
            it('should limit traversal depth with levels param', () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = expertAutomations.getNodes('n1', 'downstream', 1)
                result.should.have.lengthOf(2)
                result.map(n => n.id).should.deepEqual(['n1', 'n2'])
            })
            it('should traverse all levels when levels is 0', () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = expertAutomations.getNodes('n1', 'downstream', 0)
                result.should.have.lengthOf(3)
                result.map(n => n.id).should.deepEqual(['n1', 'n2', 'n3'])
            })
            it('should exclude config nodes from traversal', () => {
                const n1 = { id: 'n1', type: 'function' }
                const configNode = { id: 'cfg1', type: 'mqtt-broker' }
                const n2 = { id: 'n2', type: 'debug' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.getType.withArgs('mqtt-broker').returns({ category: 'config' })
                mockRED.nodes.getNodeLinks.withArgs('n1', 1).returns([
                    { source: configNode },
                    { source: n2 }
                ])
                mockRED.nodes.getNodeLinks.withArgs('n2', 1).returns([])
                const result = expertAutomations.getNodes('n1', 'upstream')
                result.map(n => n.id).should.deepEqual(['n1', 'n2'])
            })
            it('should exclude link nodes from traversal', () => {
                const n1 = { id: 'n1', type: 'function' }
                const linkOut = { id: 'lo1', type: 'link out' }
                const n2 = { id: 'n2', type: 'debug' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: linkOut }, { target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([])
                const result = expertAutomations.getNodes('n1', 'downstream')
                result.map(n => n.id).should.deepEqual(['n1', 'n2'])
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
                (() => expertAutomations.editNode('node1')).should.throw('Node node1 not found')
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
            it('should return summarized nodes by default', async () => {
                const mockNode1 = { id: 'node1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const mockNode2 = { id: 'node2', type: 'debug', x: 30, y: 40, z: 'tab1' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                expertAutomations.selectNodes.calledWith(['node1', 'node2'], undefined, undefined).should.be.true()
                mockRED.view.select.calledWith({ nodes: [mockNode1, mockNode2] }).should.be.true()
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(2)
                result.nodes[0].should.have.property('id', 'node1')
                result.nodes[0].should.have.property('type', 'inject')
            })
            it('should return full node data when full is true', async () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['node1', 'node2'], full: true } }, result)
                expertAutomations._formatNodes.calledWith([mockNode1, mockNode2], undefined).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1, mockNode2])
                result.should.have.property('success', true)
            })
            it('should return warning if node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', true)
                result.should.have.property('nodes').and.deepEqual([])
                result.should.have.property('warning', 'Nodes not found: node1')
            })
            it('should return found nodes with warning for missing ones', async () => {
                const mockNode1 = { id: 'node1' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.should.have.property('warning', 'Nodes not found: node2')
            })
            it('should group results by source node when include is downstream', async () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                const n4 = { id: 'n4' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.node.withArgs('n4').returns(n4)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }, { target: n4 }])
                mockRED.nodes.getNodeLinks.withArgs('n4', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['n1', 'n2'], include: 'downstream' } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(2)
                result.nodes[0].should.have.property('id', 'n1')
                result.nodes[0].should.have.property('downstream').with.lengthOf(1)
                result.nodes[0].downstream[0].should.have.property('id', 'n3')
                result.nodes[1].should.have.property('id', 'n2')
                result.nodes[1].should.have.property('downstream').with.lengthOf(2)
                result.nodes[1].downstream.map(n => n.id).should.deepEqual(['n3', 'n4'])
            })
            it('should split upstream and downstream when include is connected', async () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n2', 1).returns([{ source: n1 }])
                mockRED.nodes.getNodeLinks.withArgs('n1', 1).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['n2'], include: 'connected' } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.nodes[0].should.have.property('id', 'n2')
                result.nodes[0].should.have.property('upstream').with.lengthOf(1)
                result.nodes[0].upstream[0].should.have.property('id', 'n1')
                result.nodes[0].should.have.property('downstream').with.lengthOf(1)
                result.nodes[0].downstream[0].should.have.property('id', 'n3')
            })
            it('should return leveled results when levels is specified', async () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                const n4 = { id: 'n4' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.node.withArgs('n4').returns(n4)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([{ target: n4 }])
                mockRED.nodes.getNodeLinks.withArgs('n4', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['n1'], include: 'downstream', levels: 1 } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.nodes[0].should.have.property('id', 'n1')
                result.nodes[0].should.have.property('downstream')
                result.nodes[0].downstream.should.have.property('1').with.lengthOf(1)
                result.nodes[0].downstream['1'][0].should.have.property('id', 'n2')
                result.nodes[0].downstream.should.not.have.property('2')
            })
            it('should return all levels when levels is 0', async () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['n1'], include: 'downstream', levels: 0 } }, result)
                result.should.have.property('success', true)
                result.nodes[0].should.have.property('downstream')
                result.nodes[0].downstream.should.have.property('1').with.lengthOf(1)
                result.nodes[0].downstream['1'][0].should.have.property('id', 'n2')
                result.nodes[0].downstream.should.have.property('2').with.lengthOf(1)
                result.nodes[0].downstream['2'][0].should.have.property('id', 'n3')
            })
            it('should show parallel connections at the same level', async () => {
                const n1 = { id: 'n1' }
                const n2 = { id: 'n2' }
                const n3 = { id: 'n3' }
                const n4 = { id: 'n4' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.node.withArgs('n4').returns(n4)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }, { target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n4 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n4', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['n1'], include: 'downstream', levels: 0 } }, result)
                result.nodes[0].downstream.should.have.property('1').with.lengthOf(2)
                result.nodes[0].downstream['1'].map(n => n.id).should.deepEqual(['n2', 'n3'])
                result.nodes[0].downstream.should.have.property('2').with.lengthOf(1)
                result.nodes[0].downstream['2'][0].should.have.property('id', 'n4')
            })
        })
        describe('getNodes action', () => {
            it('should return summarized nodes by default', async () => {
                const mockNode1 = { id: 'node1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const mockNode2 = { id: 'node2', type: 'debug', x: 30, y: 40, z: 'tab1' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(2)
                result.nodes[0].should.have.property('id', 'node1')
                result.nodes[0].should.have.property('type', 'inject')
            })
            it('should return full node data when full is true', async () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['node1', 'node2'], full: true } }, result)
                expertAutomations._formatNodes.calledWith([mockNode1, mockNode2], undefined).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1, mockNode2])
                result.should.have.property('success', true)
            })
            it('should invoke action and get single node using params.id', async () => {
                const mockNode1 = { id: 'node1', type: 'function', x: 10, y: 20, z: 'tab1' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.nodes[0].should.have.property('id', 'node1')
                result.nodes[0].should.have.property('type', 'function')
            })
            it('should return warning if node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', true)
                result.should.have.property('nodes').and.deepEqual([])
                result.should.have.property('warning', 'Nodes not found: node1')
            })
            it('should group results by source node when include is downstream', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'function', x: 30, y: 40, z: 'tab1' }
                const n3 = { id: 'n3', type: 'debug', x: 50, y: 60, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['n1', 'n2'], include: 'downstream' } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(2)
                result.nodes[0].should.have.property('id', 'n1')
                result.nodes[0].should.have.property('type', 'inject')
                result.nodes[0].should.have.property('downstream').with.lengthOf(2)
                result.nodes[0].downstream.map(n => n.id).should.deepEqual(['n2', 'n3'])
                result.nodes[1].should.have.property('id', 'n2')
                result.nodes[1].should.have.property('downstream').with.lengthOf(1)
                result.nodes[1].downstream[0].should.have.property('id', 'n3')
            })
            it('should split upstream and downstream when include is connected', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'function', x: 30, y: 40, z: 'tab1' }
                const n3 = { id: 'n3', type: 'debug', x: 50, y: 60, z: 'tab1' }
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n2', 1).returns([{ source: n1 }])
                mockRED.nodes.getNodeLinks.withArgs('n1', 1).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['n2'], include: 'connected' } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.nodes[0].should.have.property('id', 'n2')
                result.nodes[0].should.have.property('type', 'function')
                result.nodes[0].should.have.property('upstream').with.lengthOf(1)
                result.nodes[0].upstream[0].should.have.property('id', 'n1')
                result.nodes[0].should.have.property('downstream').with.lengthOf(1)
                result.nodes[0].downstream[0].should.have.property('id', 'n3')
            })
            it('should return leveled results when levels is specified', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'function', x: 30, y: 40, z: 'tab1' }
                const n3 = { id: 'n3', type: 'debug', x: 50, y: 60, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['n1'], include: 'downstream', levels: 1 } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.nodes[0].should.have.property('id', 'n1')
                result.nodes[0].should.have.property('downstream')
                result.nodes[0].downstream.should.have.property('1').with.lengthOf(1)
                result.nodes[0].downstream['1'][0].should.have.property('id', 'n2')
                result.nodes[0].downstream.should.not.have.property('2')
            })
            it('should show parallel vs serial connections via levels', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'function', x: 30, y: 40, z: 'tab1' }
                const n3 = { id: 'n3', type: 'debug', x: 50, y: 60, z: 'tab1' }
                const n4 = { id: 'n4', type: 'http', x: 70, y: 80, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.node.withArgs('n4').returns(n4)
                mockRED.nodes.getNodeLinks.withArgs('n1', 0).returns([{ target: n2 }, { target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n4 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n4', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['n1'], include: 'downstream', levels: 0 } }, result)
                result.nodes[0].downstream.should.have.property('1').with.lengthOf(2)
                result.nodes[0].downstream['1'].map(n => n.id).should.deepEqual(['n2', 'n3'])
                result.nodes[0].downstream.should.have.property('2').with.lengthOf(1)
                result.nodes[0].downstream['2'][0].should.have.property('id', 'n4')
            })
            it('should return leveled connected results with upstream and downstream', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'function', x: 30, y: 40, z: 'tab1' }
                const n3 = { id: 'n3', type: 'debug', x: 50, y: 60, z: 'tab1' }
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n3').returns(n3)
                mockRED.nodes.getNodeLinks.withArgs('n2', 1).returns([{ source: n1 }])
                mockRED.nodes.getNodeLinks.withArgs('n1', 1).returns([])
                mockRED.nodes.getNodeLinks.withArgs('n2', 0).returns([{ target: n3 }])
                mockRED.nodes.getNodeLinks.withArgs('n3', 0).returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['n2'], include: 'connected', levels: 0 } }, result)
                result.should.have.property('success', true)
                result.nodes.should.have.lengthOf(1)
                result.nodes[0].should.have.property('id', 'n2')
                result.nodes[0].upstream.should.have.property('1').with.lengthOf(1)
                result.nodes[0].upstream['1'][0].should.have.property('id', 'n1')
                result.nodes[0].downstream.should.have.property('1').with.lengthOf(1)
                result.nodes[0].downstream['1'][0].should.have.property('id', 'n3')
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
                await should(expertAutomations.invokeAction('automation/open-node-edit', { params: { id: 'node1' } }, result)).rejectedWith('Node node1 not found')
            })
            it('should fail if non string params.id is used', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/open-node-edit', { params: { id: ['node1', 'node2'] } }, result)).rejectedWith(/Node .* not found/)
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
                mockRED.nodes.dirty = sinon.stub()
                mockRED.actions = { invoke: sinon.stub() }
                mockRED.view.select = sinon.stub()
                mockRED.view.selection = sinon.stub().callsFake(() => mockRED.view.select.lastCall?.args[0] || { nodes: [] })
                mockRED.workspaces = { ...mockRED.workspaces, isLocked: sinon.stub().returns(false) }
            })
            it('should remove nodes by delegating to core:delete-selection', async () => {
                const mockNode = { id: 'n1' }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                const result = {}
                await expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'] }
                }, result)
                mockRED.view.select.calledWith({ nodes: [mockNode] }).should.be.true()
                mockRED.actions.invoke.calledWith('core:delete-selection').should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
                result.should.have.property('data').which.deepEqual({ removed: ['n1'] })
            })
            it('should use core:delete-selection-and-reconnect when reconnectWires is true', async () => {
                const mockNode = { id: 'n1' }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                const result = {}
                await expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'], reconnectWires: true }
                }, result)
                mockRED.actions.invoke.calledWith('core:delete-selection-and-reconnect').should.be.true()
                result.should.have.property('success', true)
            })
            it('should throw if any node ID does not exist', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['nonexistent'] }
                }, result)).rejectedWith(/Node nonexistent not found/)
                mockRED.actions.invoke.called.should.be.false()
            })
            it('should throw without removing anything if mix of valid and invalid IDs', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1' })
                mockRED.nodes.node.withArgs('bad').returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1', 'bad'] }
                }, result)).rejectedWith(/Node bad not found/)
                mockRED.actions.invoke.called.should.be.false()
            })
            it('should throw if node workspace is locked', async () => {
                mockRED.nodes.node.withArgs('n1').returns({ id: 'n1', z: 'locked-tab' })
                mockRED.workspaces.isLocked = sinon.stub().withArgs('locked-tab').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'] }
                }, result)).rejectedWith(/Workspace locked-tab is locked/)
                mockRED.actions.invoke.called.should.be.false()
            })
            it('should reject group IDs and return GROUP_OPERATION_REQUIRED error', async () => {
                mockRED.nodes.group.withArgs('g1').returns({ id: 'g1', type: 'group' })
                const result = {}
                await expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['g1'] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'GROUP_OPERATION_REQUIRED')
                result.should.have.property('error').which.match(/group nodes/)
                mockRED.actions.invoke.called.should.be.false()
            })
            it('should reject nodes that are members of a group', async () => {
                const mockNode = { id: 'n1', g: 'grp1' }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                const result = {}
                await expertAutomations.invokeAction('automation/remove-nodes', {
                    params: { ids: ['n1'] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/member of a group/)
                mockRED.actions.invoke.called.should.be.false()
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
                }, result)).rejectedWith(/Workspace tab1 is locked/)
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
                }, {})).rejectedWith(/Workspace tab1 is locked/)
            })
            it('should throw if target workspace is locked (cross-tab)', async () => {
                mockRED.nodes.node.withArgs('lo1').returns({ id: 'lo1', type: 'link out', mode: 'link', z: 'tab1', links: [] })
                mockRED.nodes.node.withArgs('li1').returns({ id: 'li1', type: 'link in', z: 'tab2', links: [] })
                mockRED.workspaces.isLocked.withArgs('tab2').returns(true)
                await should(expertAutomations.invokeAction('automation/set-links', {
                    params: { mode: 'add', source: 'lo1', target: 'li1' }
                }, {})).rejectedWith(/Workspace tab2 is locked/)
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
                }, result)).rejectedWith(/Workspace nonexistent not found/)
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
                }, result)).rejectedWith(/Workspace tab2 not found/)
            })
            it('should throw if target tab is locked', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ inputs: 1, outputs: 1, defaults: {} })
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', type: 'tab' })
                mockRED.workspaces.isLocked = sinon.stub().withArgs('tab1').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1' }] }
                }, result)).rejectedWith(/Workspace tab1 is locked/)
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
            it('should throw if non-config node is missing required property z', async () => {
                mockRED.nodes.getType = sinon.stub().returns({ category: 'function', inputs: 1, outputs: 1, defaults: {} })
                const result = {}
                await should(expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject' }] }
                }, result)).rejectedWith(/missing required property: z/)
            })
            it('should accept config nodes without z property', async () => {
                const configNode = { id: 'cfg1', type: 'ui-base', name: 'Dashboard' }
                mockRED.nodes.getType = sinon.stub().returns({ category: 'config', inputs: 0, outputs: 0, defaults: { name: { value: '' } } })
                mockRED.nodes.node = sinon.stub()
                mockRED.nodes.node.withArgs('cfg1').onFirstCall().returns(null)
                mockRED.nodes.node.withArgs('cfg1').returns(configNode)
                mockRED.view.importNodes = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [configNode] }
                }, result)
                mockRED.view.importNodes.calledOnce.should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Array().with.lengthOf(1)
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
            it('should reject group type and return GROUP_OPERATION_REQUIRED error', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'g1', type: 'group', z: 'tab1' }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'GROUP_OPERATION_REQUIRED')
                result.should.have.property('error').which.match(/group nodes/)
            })
            it('should reject wires property in add-nodes', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1', wires: [['n2']] }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/"wires" cannot be set directly/)
            })
            it('should reject links property in add-nodes for link node types', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'lo1', type: 'link out', z: 'tab1', links: ['li1'] }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/"links" cannot be set directly/)
            })
            it('should not reject links property in add-nodes for non-link node types', async () => {
                const result = {}
                try {
                    await expertAutomations.invokeAction('automation/add-nodes', {
                        params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1', links: ['something'] }] }
                    }, result)
                } catch (_) { /* may fail for unrelated reasons — only check no FORBIDDEN_PROPERTY */ }
                result.should.not.have.property('errorCode', 'FORBIDDEN_PROPERTY')
            })
            it('should reject g property in add-nodes', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/add-nodes', {
                    params: { nodes: [{ id: 'n1', type: 'inject', z: 'tab1', g: 'grp1' }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/"g" cannot be set directly/)
            })
        })
        describe('removeTab action', () => {
            it('should remove an existing tab', async () => {
                const mockWs = { id: 'tab1', type: 'tab', locked: false, disabled: false }
                mockRED.nodes.workspace = sinon.stub().withArgs('tab1').returns(mockWs)
                mockRED.nodes.getWorkspaceOrder = sinon.stub().returns([])
                mockRED.workspaces = {
                    delete: sinon.stub(),
                    selection: sinon.stub().returns([]),
                    active: sinon.stub().returns(null),
                    isHidden: sinon.stub().returns(false)
                }
                const result = {}
                await expertAutomations.invokeAction('automation/remove-tab', {
                    params: { id: 'tab1' }
                }, result)
                mockRED.workspaces.delete.calledWith(mockWs).should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data')
                result.data.should.have.property('removed', 'tab1')
                result.data.should.have.property('remainingTabs').which.is.an.Array()
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
            it('should return slim summaries by default', async () => {
                const mockTab = { id: 'tab1', type: 'tab', label: 'Flow 1', disabled: false }
                const mockFlows = [
                    mockTab,
                    { id: 'n1', type: 'inject', z: 'tab1', wires: [['n2']] }
                ]
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns(mockFlows)
                mockRED.nodes.workspace = sinon.stub().withArgs('tab1').returns(mockTab)
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                // tab is summarized via _summarizeWorkspace
                result.flows[0].should.have.property('id', 'tab1')
                result.flows[0].should.have.property('label', 'Flow 1')
                result.flows[0].should.have.property('disabled', false)
                result.flows[0].should.have.property('hidden', false)
                result.flows[0].should.have.property('isActiveWorkspace', false)
                result.flows[0].should.not.have.property('type')
                result.flows[1].should.deepEqual({ id: 'n1', type: 'inject', z: 'tab1', wires: [['n2']] })
                mockRED.nodes.createCompleteNodeSet.calledOnce.should.be.true()
                mockRED.nodes.createCompleteNodeSet.firstCall.args[0].should.deepEqual({ credentials: false })
            })
            it('should include links in slim summaries for link-type nodes', async () => {
                const mockTab = { id: 'tab1', type: 'tab', label: 'Flow 1' }
                const mockFlows = [
                    mockTab,
                    { id: 'lo1', type: 'link out', z: 'tab1', wires: [[]], links: ['li1'] }
                ]
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns(mockFlows)
                mockRED.nodes.workspace = sinon.stub().withArgs('tab1').returns(mockTab)
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.flows[1].should.have.property('links').which.deepEqual(['li1'])
                result.flows[1].should.have.property('wires').which.deepEqual([[]])
            })
            it('should include node ids in group summaries', async () => {
                const nodeA = { id: 'n1', type: 'inject', z: 'tab1' }
                const nodeB = { id: 'n2', type: 'function', z: 'tab1' }
                const mockTab = { id: 'tab1', type: 'tab', label: 'Flow 1' }
                const mockFlows = [
                    mockTab,
                    { id: 'g1', type: 'group', z: 'tab1', nodes: [nodeA, nodeB] }
                ]
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns(mockFlows)
                mockRED.nodes.workspace = sinon.stub().withArgs('tab1').returns(mockTab)
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.flows[1].should.have.property('nodes').which.deepEqual(['n1', 'n2'])
            })
            it('should return full data when params.full is true', async () => {
                const mockFlows = [
                    { id: 'tab1', type: 'tab', label: 'Flow 1' },
                    { id: 'n1', type: 'inject', z: 'tab1', wires: [['n2']] }
                ]
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns(mockFlows)
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: { full: true } }, result)
                result.should.have.property('success', true)
                result.should.have.property('flows').which.deepEqual(mockFlows)
            })
            it('should return empty array when no flows exist', async () => {
                mockRED.nodes.createCompleteNodeSet = sinon.stub().returns([])
                const result = {}
                await expertAutomations.invokeAction('automation/get-workspace-nodes', { params: {} }, result)
                result.should.have.property('success', true)
                result.should.have.property('flows').which.deepEqual([])
            })
        })
        describe('updateNodes action', () => {
            it('should update node properties with history and changed flag', async () => {
                const mockNode = { id: 'n1', name: 'old', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [{ property: 'name', op: 'replace', content: 'new' }] }] }
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
                mockRED.view.updateActive.calledOnce.should.be.true()
                mockRED.view.redraw.calledOnce.should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Array()
                result.data[0].should.have.property('id', 'n1')
                result.data[0].should.have.property('name', 'new')
                result.data[0].should.have.property('validation').which.deepEqual({ valid: true })
            })
            it('should return validation errors after update', async () => {
                const mockNode = { id: 'n1', repeat: 'bad', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = false; n.validationErrors = ['repeat'] }) }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [{ property: 'repeat', op: 'replace', content: 'bad' }] }] }
                }, result)
                result.should.have.property('success', true)
                result.data[0].should.have.property('validation').which.deepEqual({ valid: false, validationErrors: ['repeat'] })
            })
            it('should capture old values correctly before applying changes', async () => {
                const mockNode = { id: 'n1', name: 'original', x: 100, changed: true }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [{ property: 'name', op: 'replace', content: 'updated' }, { property: 'x', op: 'replace', content: 200 }] }] }
                }, result)
                const historyArg = mockRED.history.push.firstCall.args[0]
                historyArg.changes.should.deepEqual({ name: 'original', x: 100 })
                historyArg.changed.should.be.true()
                mockNode.name.should.equal('updated')
                mockNode.x.should.equal(200)
            })
            it('should throw if updates is empty array', async () => {
                const mockNode = { id: 'n1', changed: false }
                mockRED.nodes.node.withArgs('n1').returns(mockNode)
                const result = {}
                await should(expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [] }] }
                }, result)).rejectedWith(/At least one of/)
            })
            it('should throw if node not found', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'missing', updates: [{ property: 'name', op: 'replace', content: 'x' }] }] }
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
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 2, end: 2, content: 'B' }] }] }
                    }, result)
                    mockNode.func.should.equal('a\nB\nc')
                    result.should.have.property('success', true)
                })
                it('should replace a range with fewer lines', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc\nd' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 2, end: 3, content: 'X' }] }] }
                    }, result)
                    mockNode.func.should.equal('a\nX\nd')
                })
                it('should replace a range with more lines', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 2, end: 2, content: 'X\nY\nZ' }] }] }
                    }, result)
                    mockNode.func.should.equal('a\nX\nY\nZ\nc')
                })
                it('should delete lines with op delete', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc\nd' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'delete', start: 2, end: 3 }] }] }
                    }, result)
                    mockNode.func.should.equal('a\nd')
                })
                it('should apply multiple non-overlapping patches bottom-up', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'func', op: 'replace', start: 1, end: 1, content: 'TOP' },
                                    { property: 'func', op: 'replace', start: 4, end: 5, content: 'BOTTOM' }
                                ]
                            }]
                        }
                    }, result)
                    mockNode.func.should.equal('TOP\nline2\nline3\nBOTTOM')
                })
                it('should patch different properties independently', async () => {
                    const mockNode = setupPatchNode({ template: 'h1\nh2\nh3' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'func', op: 'replace', start: 1, end: 1, content: 'FUNC' },
                                    { property: 'template', op: 'replace', start: 2, end: 2, content: 'H2' }
                                ]
                            }]
                        }
                    }, result)
                    mockNode.func.should.equal('FUNC\nline2\nline3\nline4\nline5')
                    mockNode.template.should.equal('h1\nH2\nh3')
                })
                it('should support full replacement and line edits in the same node', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'name', op: 'replace', content: 'Patched' },
                                    { property: 'func', op: 'replace', start: 1, end: 1, content: 'FIRST' }
                                ]
                            }]
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
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'new' }] }] }
                    }, result)
                    mockNode.func.should.equal('new\ncode')
                    const historyArg = mockRED.history.push.firstCall.args[0]
                    historyArg.changes.should.have.property('func', 'old\ncode')
                })
                it('should insert lines after the last line (append)', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'insert', start: 3, content: 'c\nd' }] }] }
                    }, result)
                    mockNode.func.should.equal('a\nb\nc\nd')
                })
                it('should insert lines before the first line (prepend)', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'insert', start: 1, content: 'z' }] }] }
                    }, result)
                    mockNode.func.should.equal('z\na\nb')
                })
                it('should insert lines between existing lines', async () => {
                    const mockNode = setupPatchNode({ func: 'a\nb\nc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'insert', start: 3, content: 'inserted' }] }] }
                    }, result)
                    mockNode.func.should.equal('a\nb\ninserted\nc')
                })
                it('should replace last line and append new lines in one call', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'func', op: 'replace', start: 5, end: 5, content: 'return [msg, null];' },
                                    { property: 'func', op: 'insert', start: 6, content: '// appended' }
                                ]
                            }]
                        }
                    }, result)
                    mockNode.func.should.equal('line1\nline2\nline3\nline4\nreturn [msg, null];\n// appended')
                })
                it('should prepend new lines and replace first line in one call', async () => {
                    const mockNode = setupPatchNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'func', op: 'insert', start: 1, content: '// header' },
                                    { property: 'func', op: 'replace', start: 1, end: 1, content: 'FIRST' }
                                ]
                            }]
                        }
                    }, result)
                    mockNode.func.should.equal('// header\nFIRST\nline2\nline3\nline4\nline5')
                })
                it('should patch a single-line property', async () => {
                    const mockNode = setupPatchNode({ func: 'only line' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'replaced' }] }] }
                    }, result)
                    mockNode.func.should.equal('replaced')
                })
                it('should auto-detect tab separator and preserve it', async () => {
                    const mockNode = setupPatchNode({ func: '$sum(items.price)\t* discount\t+ shipping' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 2, end: 2, content: '* (discount + loyalty)' }] }] }
                    }, result)
                    mockNode.func.should.equal('$sum(items.price)\t* (discount + loyalty)\t+ shipping')
                })
                it('should insert with tab separator when target uses tabs', async () => {
                    const mockNode = setupPatchNode({ func: 'a\tb\tc' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'insert', start: 4, content: 'd' }] }] }
                    }, result)
                    mockNode.func.should.equal('a\tb\tc\td')
                })
                it('should delete with tab separator when target uses tabs', async () => {
                    const mockNode = setupPatchNode({ func: 'a\tb\tc\td' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'delete', start: 2, end: 3 }] }] }
                    }, result)
                    mockNode.func.should.equal('a\td')
                })
                it('should use newline when value contains both tabs and newlines', async () => {
                    const mockNode = setupPatchNode({ func: 'line1\nline2\twith tab\nline3' })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 2, end: 2, content: 'replaced' }] }] }
                    }, result)
                    mockNode.func.should.equal('line1\nreplaced\nline3')
                })
                it('should patch a nested property via dot path', async () => {
                    const mockNode = setupPatchNode({
                        rules: [{ from: 'msg.payload', to: '$sum(items.price)\n* 1.0', type: 'jsonata' }]
                    })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [{ property: 'rules.0.to', op: 'replace', start: 2, end: 2, content: '* 1.2' }]
                            }]
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
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'rules.0.to', op: 'replace', start: 1, end: 1, content: 'LINE1' },
                                    { property: 'rules.1.to', op: 'replace', start: 2, end: 2, content: 'BBB' }
                                ]
                            }]
                        }
                    }, result)
                    mockNode.rules[0].to.should.equal('LINE1\nline2')
                    mockNode.rules[1].to.should.equal('aaa\nBBB')
                })
                it('should refresh sidebar info panel after update', async () => {
                    setupPatchNode()
                    mockRED.sidebar = { info: { refresh: sinon.stub() } }
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'X' }] }] }
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
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'X' }] }] }
                    }, result)
                    triggerStub.calledWith('click').should.be.true()
                    result.should.have.property('success', true)
                    delete global.$
                })
                it('should not close tray when editor is not open', async () => {
                    setupPatchNode()
                    global.$ = sinon.stub().returns({ trigger: sinon.stub() })
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'X' }] }] }
                    }, result)
                    global.$.called.should.be.false()
                    delete global.$
                })
                it('should throw if start > end for replace', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 5, end: 2, content: 'x' }] }] }
                    }, result)).rejectedWith(/Invalid patch range/)
                })
                it('should throw if end exceeds line count', async () => {
                    setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 999, content: 'x' }] }] }
                    }, result)).rejectedWith(/exceeds line count/)
                })
                it('should throw if property is not a string', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'x', op: 'replace', start: 1, end: 1, content: '100' }] }] }
                    }, result)).rejectedWith(/not a string/)
                })
                it('should throw on overlapping replace patches', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'func', op: 'replace', start: 1, end: 3, content: 'a' },
                                    { property: 'func', op: 'replace', start: 2, end: 4, content: 'b' }
                                ]
                            }]
                        }
                    }, result)).rejectedWith(/Overlapping patches/)
                })
                it('should throw if no updates provided', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1' }] }
                    }, result)).rejectedWith(/At least one of/)
                })
                it('should throw if node not found with line edits', async () => {
                    mockRED.nodes.node.returns(null)
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'missing', updates: [{ property: 'func', op: 'replace', start: 1, end: 1, content: 'x' }] }] }
                    }, result)).rejectedWith(/Node missing not found/)
                })
                it('should throw if start is not a positive integer', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 0, end: 1, content: 'x' }] }] }
                    }, result)).rejectedWith(/must be a positive integer/)
                })
                it('should throw if insert position exceeds line count + 1', async () => {
                    setupPatchNode({ func: 'a\nb' })
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'insert', start: 4, content: 'x' }] }] }
                    }, result)).rejectedWith(/exceeds line count/)
                })
                it('should throw if replace is missing end', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, content: 'x' }] }] }
                    }, result)).rejectedWith(/requires "end"/)
                })
                it('should throw if replace is missing content', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'replace', start: 1, end: 1 }] }] }
                    }, result)).rejectedWith(/requires "content"/)
                })
                it('should throw if delete is missing end', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'delete', start: 1 }] }] }
                    }, result)).rejectedWith(/requires "end"/)
                })
                it('should throw if insert is missing content', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'insert', start: 1 }] }] }
                    }, result)).rejectedWith(/requires "content"/)
                })
                it('should throw on unknown op', async () => {
                    setupPatchNode()
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'func', op: 'move', start: 1 }] }] }
                    }, result)).rejectedWith(/Unknown patch op/)
                })
                it('should throw if nested path cannot be resolved', async () => {
                    setupPatchNode({ rules: [{ to: 'value' }] })
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'rules.5.to', op: 'replace', start: 1, end: 1, content: 'x' }] }] }
                    }, result)).rejectedWith(/resolved to/)
                })
            })
            it('should reject group ID and return GROUP_OPERATION_REQUIRED error', async () => {
                mockRED.nodes.group.withArgs('g1').returns({ id: 'g1', type: 'group' })
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'g1', updates: [{ property: 'name', op: 'replace', content: 'renamed' }] }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'GROUP_OPERATION_REQUIRED')
                result.should.have.property('error').which.match(/group nodes/)
            })
            it('should reject wires property in update-nodes', async () => {
                mockRED.nodes.group.withArgs('n1').returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [{ property: 'wires', op: 'replace', content: [['n3']] }] }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/"wires" cannot be set directly/)
            })
            it('should reject links property in update-nodes for link node types', async () => {
                const node = { id: 'lo1', type: 'link out', links: ['li1'], changed: false, dirty: false }
                mockRED.nodes.node.withArgs('lo1').returns(node)
                mockRED.nodes.group.withArgs('lo1').returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'lo1', updates: [{ property: 'links', op: 'replace', content: ['li2'] }] }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/"links" cannot be set directly/)
            })
            it('should not reject links property in update-nodes for non-link node types', async () => {
                const node = { id: 'n1', type: 'inject', links: ['something'], changed: false, dirty: false }
                mockRED.nodes.node.withArgs('n1').returns(node)
                mockRED.nodes.group.withArgs('n1').returns(null)
                mockRED.nodes.dirty = sinon.stub()
                mockRED.history = { push: sinon.stub() }
                mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
                mockRED.view.redraw = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [{ property: 'links', op: 'replace', content: ['something-else'] }] }] }
                }, result)
                result.should.not.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('success', true)
            })
            it('should reject g property in update-nodes', async () => {
                mockRED.nodes.group.withArgs('n1').returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/update-nodes', {
                    params: { nodes: [{ id: 'n1', updates: [{ property: 'g', op: 'replace', content: 'grp1' }] }] }
                }, result)
                result.should.have.property('success', false)
                result.should.have.property('errorCode', 'FORBIDDEN_PROPERTY')
                result.should.have.property('error').which.match(/"g" cannot be set directly/)
            })
            describe('tab change (z update)', () => {
                function setupTabChangeNode (overrides = {}) {
                    const node = {
                        id: 'n1',
                        type: 'function',
                        z: 'tab-a',
                        x: 100,
                        y: 100,
                        wires: [],
                        changed: false,
                        dirty: false,
                        ...overrides
                    }
                    mockRED.nodes.node.withArgs('n1').returns(node)
                    mockRED.nodes.group.withArgs('n1').returns(null)
                    mockRED.nodes.workspace = sinon.stub()
                    mockRED.nodes.workspace.withArgs('tab-a').returns({ id: 'tab-a' })
                    mockRED.nodes.workspace.withArgs('tab-b').returns({ id: 'tab-b' })
                    mockRED.nodes.getNodeLinks = sinon.stub().returns([])
                    mockRED.nodes.moveNodeToTab = sinon.stub()
                    mockRED.actions = { invoke: sinon.stub() }
                    mockRED.nodes.dirty = sinon.stub()
                    mockRED.history = { push: sinon.stub() }
                    mockRED.view.redraw = sinon.stub()
                    return node
                }

                it('should move a node with no wires directly to the target tab', async () => {
                    const node = setupTabChangeNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)
                    result.should.have.property('success', true)
                    mockRED.nodes.moveNodeToTab.calledOnce.should.be.true()
                    mockRED.nodes.moveNodeToTab.firstCall.args[0].should.equal(node)
                    mockRED.nodes.moveNodeToTab.firstCall.args[1].should.equal('tab-b')
                    mockRED.actions.invoke.called.should.be.false()
                })

                it('should push a multi history event with undo/redo callback when moving a node', async () => {
                    const node = setupTabChangeNode()
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)

                    mockRED.history.push.calledOnce.should.be.true()
                    const historyArg = mockRED.history.push.firstCall.args[0]
                    historyArg.should.have.property('t', 'multi')
                    historyArg.should.have.property('events').which.is.an.Array().with.lengthOf(0)
                    historyArg.should.have.property('callback').which.is.a.Function()

                    // Simulate undo — node moves back to tab-a
                    historyArg.callback()
                    mockRED.nodes.moveNodeToTab.callCount.should.equal(2)
                    mockRED.nodes.moveNodeToTab.lastCall.args[0].should.equal(node)
                    mockRED.nodes.moveNodeToTab.lastCall.args[1].should.equal('tab-a')

                    // Simulate redo — node moves back to tab-b
                    historyArg.callback()
                    mockRED.nodes.moveNodeToTab.callCount.should.equal(3)
                    mockRED.nodes.moveNodeToTab.lastCall.args[0].should.equal(node)
                    mockRED.nodes.moveNodeToTab.lastCall.args[1].should.equal('tab-b')
                })

                it('should include link nodes in the history callback when wires are split', async () => {
                    const upstreamNode = { id: 'up1', type: 'inject', z: 'tab-a' }
                    const downstreamNode = { id: 'dn1', type: 'debug', z: 'tab-a' }
                    const node = setupTabChangeNode({ wires: [['dn1']] })
                    const linkInNode = { id: 'li1', type: 'link in', z: 'tab-a', links: [] }
                    const linkOutNode = { id: 'lo1', type: 'link out', z: 'tab-a', links: [] }

                    const inboundWire = { source: upstreamNode, sourcePort: 0, target: node }
                    const outboundWire = { source: node, sourcePort: 0, target: downstreamNode }
                    mockRED.nodes.getNodeLinks.onCall(0).returns([inboundWire])
                    mockRED.nodes.getNodeLinks.onCall(1).returns([outboundWire])
                    mockRED.nodes.getNodeLinks.onCall(2).returns([{ source: linkInNode, sourcePort: 0, target: node }])
                    mockRED.nodes.getNodeLinks.onCall(3).returns([{ source: node, sourcePort: 0, target: linkOutNode }])

                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)

                    mockRED.history.push.calledOnce.should.be.true()
                    const historyArg = mockRED.history.push.firstCall.args[0]
                    historyArg.should.have.property('t', 'multi')
                    historyArg.should.have.property('callback').which.is.a.Function()

                    // Simulate undo — all three nodes move back to tab-a
                    historyArg.callback()
                    const undoCalls = mockRED.nodes.moveNodeToTab.args.slice(-3)
                    const undoIds = undoCalls.map(a => a[0].id)
                    undoIds.should.containEql('n1')
                    undoIds.should.containEql('li1')
                    undoIds.should.containEql('lo1')
                    undoCalls.every(a => a[1] === 'tab-a').should.be.true()
                })

                it('should split wires with link nodes when single upstream and single downstream', async () => {
                    const upstreamNode = { id: 'up1', type: 'inject', z: 'tab-a' }
                    const downstreamNode = { id: 'dn1', type: 'debug', z: 'tab-a' }
                    const node = setupTabChangeNode({ wires: [['dn1']] })

                    const inboundWire = { source: upstreamNode, sourcePort: 0, target: node }
                    const outboundWire = { source: node, sourcePort: 0, target: downstreamNode }
                    const linkInNode = { id: 'li1', type: 'link in', z: 'tab-a', links: [] }
                    const linkOutNode = { id: 'lo1', type: 'link out', z: 'tab-a', links: [] }

                    // getNodeLinks calls: [inbound-before, outbound-before, inbound-after-split, outbound-after-split]
                    mockRED.nodes.getNodeLinks.onCall(0).returns([inboundWire])
                    mockRED.nodes.getNodeLinks.onCall(1).returns([outboundWire])
                    mockRED.nodes.getNodeLinks.onCall(2).returns([{ source: linkInNode, sourcePort: 0, target: node }])
                    mockRED.nodes.getNodeLinks.onCall(3).returns([{ source: node, sourcePort: 0, target: linkOutNode }])

                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)

                    result.should.have.property('success', true)
                    // No junctions needed (1 upstream, 1 downstream)
                    const junctionCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wires-with-junctions')
                    junctionCalls.length.should.equal(0)
                    // Link wire split was invoked
                    const linkCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wire-with-link-nodes')
                    linkCalls.length.should.equal(1)
                    // Wires selected before split
                    mockRED.view.select.calledWith({ links: [inboundWire, outboundWire] }).should.be.true()
                    // Node + link in + link out moved to target tab
                    mockRED.nodes.moveNodeToTab.callCount.should.equal(3)
                    const movedIds = mockRED.nodes.moveNodeToTab.args.map(a => a[0].id)
                    movedIds.should.containEql('n1')
                    movedIds.should.containEql('li1')
                    movedIds.should.containEql('lo1')
                    mockRED.nodes.moveNodeToTab.args.every(a => a[1] === 'tab-b').should.be.true()
                    // Result data includes the moved node and the created link nodes
                    const dataIds = result.data.map(n => n.id)
                    dataIds.should.containEql('n1')
                    dataIds.should.containEql('li1')
                    dataIds.should.containEql('lo1')
                })

                it('should move existing adjacent link nodes without re-splitting (second move)', async () => {
                    // Node was already moved once — it now has a link in on its input and link out on its output
                    const linkIn = { id: 'li-existing', type: 'link in', z: 'tab-a', links: ['lo-existing'] }
                    const linkOut = { id: 'lo-existing', type: 'link out', z: 'tab-a', links: ['li-existing'] }
                    const node = setupTabChangeNode()

                    // Both adjacent nodes are already link nodes
                    mockRED.nodes.getNodeLinks.onCall(0).returns([{ source: linkIn, sourcePort: 0, target: node }])
                    mockRED.nodes.getNodeLinks.onCall(1).returns([{ source: node, sourcePort: 0, target: linkOut }])

                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)

                    result.should.have.property('success', true)
                    // No new link pairs created
                    mockRED.actions.invoke.called.should.be.false()
                    // Node + existing link in + existing link out all moved to target tab
                    mockRED.nodes.moveNodeToTab.callCount.should.equal(3)
                    const movedIds = mockRED.nodes.moveNodeToTab.args.map(a => a[0].id)
                    movedIds.should.containEql('n1')
                    movedIds.should.containEql('li-existing')
                    movedIds.should.containEql('lo-existing')
                    mockRED.nodes.moveNodeToTab.args.every(a => a[1] === 'tab-b').should.be.true()
                    // Result data includes the moved node and the carried link nodes
                    const dataIds = result.data.map(n => n.id)
                    dataIds.should.containEql('n1')
                    dataIds.should.containEql('li-existing')
                    dataIds.should.containEql('lo-existing')
                })

                it('should add junctions only for fan-in wires when multiple upstream nodes share the input', async () => {
                    const up1 = { id: 'up1', type: 'inject', z: 'tab-a' }
                    const up2 = { id: 'up2', type: 'inject', z: 'tab-a' }
                    const dn1 = { id: 'dn1', type: 'debug', z: 'tab-a' }
                    const node = setupTabChangeNode({ wires: [['dn1']] })

                    const inboundWire1 = { source: up1, sourcePort: 0, target: node }
                    const inboundWire2 = { source: up2, sourcePort: 0, target: node }
                    const outboundWire = { source: node, sourcePort: 0, target: dn1 }
                    const junctionNode = { id: 'j1', type: 'junction', z: 'tab-a' }
                    const junctionWire = { source: junctionNode, sourcePort: 0, target: node }
                    const linkInNode = { id: 'li1', type: 'link in', z: 'tab-a', links: [] }
                    const linkOutNode = { id: 'lo1', type: 'link out', z: 'tab-a', links: [] }

                    // getNodeLinks calls: [inbound-before, outbound-before,
                    //   inbound-after-junctions, outbound-after-junctions,
                    //   inbound-after-split, outbound-after-split]
                    mockRED.nodes.getNodeLinks.onCall(0).returns([inboundWire1, inboundWire2])
                    mockRED.nodes.getNodeLinks.onCall(1).returns([outboundWire])
                    mockRED.nodes.getNodeLinks.onCall(2).returns([junctionWire])
                    mockRED.nodes.getNodeLinks.onCall(3).returns([outboundWire])
                    mockRED.nodes.getNodeLinks.onCall(4).returns([{ source: linkInNode, sourcePort: 0, target: node }])
                    mockRED.nodes.getNodeLinks.onCall(5).returns([{ source: node, sourcePort: 0, target: linkOutNode }])

                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)

                    result.should.have.property('success', true)
                    // Junction invoked only with the fan-in inbound wires, not the single outbound wire
                    const junctionCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wires-with-junctions')
                    junctionCalls.length.should.equal(1)
                    junctionCalls[0][1].wires.should.containEql(inboundWire1)
                    junctionCalls[0][1].wires.should.containEql(inboundWire2)
                    junctionCalls[0][1].wires.should.not.containEql(outboundWire)
                    // Link split invoked after junctions
                    const linkCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wire-with-link-nodes')
                    linkCalls.length.should.equal(1)
                    // Node moved to target tab
                    const movedIds = mockRED.nodes.moveNodeToTab.args.map(a => a[0].id)
                    movedIds.should.containEql('n1')
                    mockRED.nodes.moveNodeToTab.args.every(a => a[1] === 'tab-b').should.be.true()
                    // Result data includes the moved node and the junction created on the source tab
                    const dataIds = result.data.map(n => n.id)
                    dataIds.should.containEql('n1')
                    dataIds.should.containEql('j1')
                })

                it('should add junctions first when multiple downstream nodes exist', async () => {
                    const up1 = { id: 'up1', type: 'inject', z: 'tab-a' }
                    const dn1 = { id: 'dn1', type: 'debug', z: 'tab-a' }
                    const dn2 = { id: 'dn2', type: 'debug', z: 'tab-a' }
                    const node = setupTabChangeNode({ wires: [['dn1', 'dn2']] })

                    const inboundWire = { source: up1, sourcePort: 0, target: node }
                    const outboundWire1 = { source: node, sourcePort: 0, target: dn1 }
                    const outboundWire2 = { source: node, sourcePort: 0, target: dn2 }
                    const junctionWire = { source: node, sourcePort: 0, target: { id: 'j1', type: 'junction', z: 'tab-a' } }
                    const linkInNode = { id: 'li1', type: 'link in', z: 'tab-a', links: [] }
                    const linkOutNode = { id: 'lo1', type: 'link out', z: 'tab-a', links: [] }

                    mockRED.nodes.getNodeLinks.onCall(0).returns([inboundWire])
                    mockRED.nodes.getNodeLinks.onCall(1).returns([outboundWire1, outboundWire2])
                    mockRED.nodes.getNodeLinks.onCall(2).returns([inboundWire])
                    mockRED.nodes.getNodeLinks.onCall(3).returns([junctionWire])
                    mockRED.nodes.getNodeLinks.onCall(4).returns([{ source: linkInNode, sourcePort: 0, target: node }])
                    mockRED.nodes.getNodeLinks.onCall(5).returns([{ source: node, sourcePort: 0, target: linkOutNode }])

                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }] }
                    }, result)

                    result.should.have.property('success', true)
                    const junctionCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wires-with-junctions')
                    junctionCalls.length.should.equal(1)
                    junctionCalls[0][1].wires.should.containEql(outboundWire1)
                    junctionCalls[0][1].wires.should.containEql(outboundWire2)
                    const movedIds = mockRED.nodes.moveNodeToTab.args.map(a => a[0].id)
                    movedIds.should.containEql('n1')
                    // Result data includes the moved node and the junction created on the source tab
                    const dataIds = result.data.map(n => n.id)
                    dataIds.should.containEql('n1')
                    dataIds.should.containEql('j1')
                })

                it('should throw if target tab does not exist', async () => {
                    const node = { id: 'n1', type: 'function', z: 'tab-a', changed: false }
                    mockRED.nodes.node.withArgs('n1').returns(node)
                    mockRED.nodes.group.withArgs('n1').returns(null)
                    mockRED.nodes.workspace = sinon.stub().returns(null)
                    const result = {}
                    await should(expertAutomations.invokeAction('automation/update-nodes', {
                        params: { nodes: [{ id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'nonexistent' }] }] }
                    }, result)).rejectedWith(/Workspace nonexistent not found/)
                })

                it('should not split wires between nodes being moved to the same tab together', async () => {
                    // n1 → n2, both moving to tab-b in one batch
                    const n1 = {
                        id: 'n1',
                        type: 'function',
                        z: 'tab-a',
                        x: 100,
                        y: 100,
                        wires: [['n2']],
                        changed: false,
                        dirty: false
                    }
                    const n2 = {
                        id: 'n2',
                        type: 'debug',
                        z: 'tab-a',
                        x: 300,
                        y: 100,
                        wires: [],
                        changed: false,
                        dirty: false
                    }
                    mockRED.nodes.node.withArgs('n1').returns(n1)
                    mockRED.nodes.node.withArgs('n2').returns(n2)
                    mockRED.nodes.group.withArgs('n1').returns(null)
                    mockRED.nodes.group.withArgs('n2').returns(null)
                    mockRED.nodes.workspace = sinon.stub()
                    mockRED.nodes.workspace.withArgs('tab-a').returns({ id: 'tab-a' })
                    mockRED.nodes.workspace.withArgs('tab-b').returns({ id: 'tab-b' })
                    mockRED.nodes.moveNodeToTab = sinon.stub()
                    mockRED.actions = { invoke: sinon.stub() }
                    mockRED.nodes.dirty = sinon.stub()
                    mockRED.history = { push: sinon.stub() }
                    mockRED.view.redraw = sinon.stub()

                    const wire = { source: n1, sourcePort: 0, target: n2 }
                    // For n1: inbound=[], outbound=[n1→n2]
                    // For n2: inbound=[n1→n2], outbound=[]
                    mockRED.nodes.getNodeLinks = sinon.stub()
                    mockRED.nodes.getNodeLinks.onCall(0).returns([]) // n1 inbound
                    mockRED.nodes.getNodeLinks.onCall(1).returns([wire]) // n1 outbound (co-moving → skipped)
                    mockRED.nodes.getNodeLinks.onCall(2).returns([wire]) // n2 inbound (co-moving → skipped)
                    mockRED.nodes.getNodeLinks.onCall(3).returns([]) // n2 outbound

                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [
                                { id: 'n1', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] },
                                { id: 'n2', updates: [{ property: 'z', op: 'replace', content: 'tab-b' }] }
                            ]
                        }
                    }, result)

                    result.should.have.property('success', true)
                    // No junctions or link nodes — both ends of the wire land on the same tab
                    const junctionCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wires-with-junctions')
                    junctionCalls.length.should.equal(0)
                    const linkCalls = mockRED.actions.invoke.args.filter(a => a[0] === 'core:split-wire-with-link-nodes')
                    linkCalls.length.should.equal(0)
                    // Both nodes moved to tab-b, no extra link nodes
                    const movedIds = mockRED.nodes.moveNodeToTab.args.map(a => a[0].id)
                    movedIds.should.containEql('n1')
                    movedIds.should.containEql('n2')
                    mockRED.nodes.moveNodeToTab.callCount.should.equal(2)
                    // Result data contains both nodes
                    const dataIds = result.data.map(n => n.id)
                    dataIds.should.containEql('n1')
                    dataIds.should.containEql('n2')
                })

                it('should apply non-z updates alongside a tab change', async () => {
                    const node = setupTabChangeNode({ name: 'old-name' })
                    mockRED.history = { push: sinon.stub() }
                    mockRED.editor = { validateNode: sinon.stub().callsFake(n => { n.valid = true }) }
                    const result = {}
                    await expertAutomations.invokeAction('automation/update-nodes', {
                        params: {
                            nodes: [{
                                id: 'n1',
                                updates: [
                                    { property: 'z', op: 'replace', content: 'tab-b' },
                                    { property: 'name', op: 'replace', content: 'new-name' }
                                ]
                            }]
                        }
                    }, result)
                    result.should.have.property('success', true)
                    mockRED.nodes.moveNodeToTab.calledOnce.should.be.true()
                    node.name.should.equal('new-name')
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
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1', label: 'My Tab', type: 'tab', locked: false, disabled: false })
                mockRED.workspaces = {
                    show: sinon.stub(),
                    selection: sinon.stub().returns([]),
                    active: sinon.stub().returns('tab1'),
                    isHidden: sinon.stub().returns(false)
                }
                const result = {}
                await expertAutomations.invokeAction('automation/show-workspace', {
                    params: { id: 'tab1' }
                }, result)
                mockRED.workspaces.show.calledWith('tab1').should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('data')
                result.data.should.have.property('id', 'tab1')
                result.data.should.have.property('label', 'My Tab')
                result.data.should.have.property('isActiveWorkspace', true)
                result.data.should.have.property('locked', false)
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

        describe('automation/list-config-nodes', () => {
            beforeEach(() => {
                expertAutomations.init(mockExpertComms, mockRED)
                mockRED.nodes.eachConfig = sinon.stub()
                mockRED.nodes.createExportableNodeSet = sinon.stub().callsFake((nodes) => nodes || [])
            })

            it('should return all config nodes', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' },
                    { id: 'cfg2', type: 'ui-theme', name: 'Default Theme' },
                    { id: 'cfg3', type: 'mqtt-broker', name: 'Local MQTT' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: {}
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(3)
            })

            it('should filter config nodes by type', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' },
                    { id: 'cfg2', type: 'ui-theme', name: 'Default Theme' },
                    { id: 'cfg3', type: 'mqtt-broker', name: 'Local MQTT' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: { type: 'mqtt-broker' }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(1)
                result.data.configNodes[0].should.have.property('type', 'mqtt-broker')
            })

            it('should return empty array when no config nodes exist', async () => {
                mockRED.nodes.eachConfig.callsFake(() => {})
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: {}
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(0)
            })

            it('should return empty array when type filter matches nothing', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: { type: 'nonexistent-type' }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(0)
            })

            it('should work with no params', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {}, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(1)
            })

            it('should return only global config nodes when tabId is "global"', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' },
                    { id: 'cfg2', type: 'mqtt-broker', name: 'Scoped Broker', z: 'tab1' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: { tabId: 'global' }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(1)
                result.data.configNodes[0].should.have.property('id', 'cfg1')
            })

            it('should return only config nodes scoped to a specific tab', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' },
                    { id: 'cfg2', type: 'mqtt-broker', name: 'Scoped Broker', z: 'tab1' },
                    { id: 'cfg3', type: 'mqtt-broker', name: 'Other Broker', z: 'tab2' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: { tabId: 'tab1' }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(1)
                result.data.configNodes[0].should.have.property('id', 'cfg2')
            })

            it('should combine type and tabId filters', async () => {
                const configNodes = [
                    { id: 'cfg1', type: 'ui-base', name: 'Dashboard' },
                    { id: 'cfg2', type: 'mqtt-broker', name: 'Global Broker' },
                    { id: 'cfg3', type: 'mqtt-broker', name: 'Scoped Broker', z: 'tab1' }
                ]
                mockRED.nodes.eachConfig.callsFake(cb => configNodes.forEach(cb))
                const result = {}
                await expertAutomations.invokeAction('automation/list-config-nodes', {
                    params: { type: 'mqtt-broker', tabId: 'global' }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('configNodes').which.is.an.Array().with.lengthOf(1)
                result.data.configNodes[0].should.have.property('id', 'cfg2')
            })
        })

        describe('getNodeTypes action', () => {
            it('should return type info for installed types', async () => {
                mockRED.nodes.getType = sinon.stub()
                mockRED.nodes.getType.withArgs('function').returns({ inputs: 1, outputs: 1, category: 'function', defaults: { name: { value: '' } } })
                mockRED.nodes.getType.withArgs('inject').returns({ inputs: 0, outputs: 1, category: 'input', defaults: {} })
                const result = {}
                await expertAutomations.invokeAction('automation/get-node-types', {
                    params: { types: ['function', 'inject'] }
                }, result)
                result.should.have.property('success', true)
                result.should.have.property('data')
                result.data.should.have.property('function')
                result.data.function.should.have.property('inputs', 1)
                result.data.function.should.have.property('outputs', 1)
                result.data.function.should.have.property('category', 'function')
                result.data.function.should.have.property('defaults')
                result.data.should.have.property('inject')
                result.data.inject.should.have.property('inputs', 0)
            })
            it('should mark types not installed with installed: false', async () => {
                mockRED.nodes.getType = sinon.stub().returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/get-node-types', {
                    params: { types: ['unknown-type'] }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('unknown-type').which.deepEqual({ installed: false })
            })
            it('should handle a mix of installed and not installed types', async () => {
                mockRED.nodes.getType = sinon.stub()
                mockRED.nodes.getType.withArgs('function').returns({ inputs: 1, outputs: 1, category: 'function', defaults: {} })
                mockRED.nodes.getType.withArgs('not-installed').returns(null)
                const result = {}
                await expertAutomations.invokeAction('automation/get-node-types', {
                    params: { types: ['function', 'not-installed'] }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.property('function')
                result.data.function.should.not.have.property('installed')
                result.data.should.have.property('not-installed').which.deepEqual({ installed: false })
            })
            it('should encode function-typed label, color, and defaults using __enc__ format', async () => {
                mockRED.nodes.getType = sinon.stub().returns({
                    inputs: 1,
                    outputs: 1,
                    category: 'function',
                    defaults: {
                        name: { value: '', validate: function isValid (v) { return v.length > 0 } }
                    },
                    label: function myLabel () { return 'My Node' },
                    color: function myColor () { return '#aabbcc' }
                })
                const result = {}
                await expertAutomations.invokeAction('automation/get-node-types', {
                    params: { types: ['function'] }
                }, result)
                result.should.have.property('success', true)
                result.data.function.label.should.have.property('__enc__', true)
                result.data.function.label.should.have.property('type', 'function')
                result.data.function.label.should.have.property('data').which.is.a.String()
                result.data.function.color.should.have.property('__enc__', true)
                result.data.function.color.should.have.property('type', 'function')
                result.data.function.color.should.have.property('data').which.is.a.String()
                result.data.function.defaults.name.validate.should.have.property('__enc__', true)
                result.data.function.defaults.name.validate.should.have.property('type', 'function')
                result.data.function.defaults.name.validate.should.have.property('data').which.is.a.String()
            })
            it('should encode Set, Map, RegExp, and non-finite numbers in defaults', async () => {
                mockRED.nodes.getType = sinon.stub().returns({
                    inputs: 1,
                    outputs: 1,
                    category: 'function',
                    defaults: {
                        tags: { value: new Set(['a', 'b']) },
                        meta: { value: new Map([['k', 'v']]) },
                        pattern: { value: /foo/i },
                        ratio: { value: Infinity }
                    }
                })
                const result = {}
                await expertAutomations.invokeAction('automation/get-node-types', {
                    params: { types: ['function'] }
                }, result)
                result.should.have.property('success', true)
                result.data.function.defaults.tags.value.should.have.property('__enc__', true)
                result.data.function.defaults.tags.value.should.have.property('type', 'set')
                result.data.function.defaults.meta.value.should.have.property('__enc__', true)
                result.data.function.defaults.meta.value.should.have.property('type', 'map')
                result.data.function.defaults.pattern.value.should.have.property('__enc__', true)
                result.data.function.defaults.pattern.value.should.have.property('type', 'regexp')
                result.data.function.defaults.ratio.value.should.have.property('__enc__', true)
                result.data.function.defaults.ratio.value.should.have.property('type', 'number')
            })
        })

        describe('getPalette action', () => {
            let mockAjax
            const plugins = [
                { module: 'node-red', version: '4.1.0', enabled: true, id: 'plugin1' }
            ]
            const nodes = [
                { module: 'node-red', id: 'node1', type: 'inject', enabled: true },
                { module: 'node-red-contrib-test', id: 'node2', type: 'test', enabled: true }
            ]
            beforeEach(() => {
                mockAjax = sinon.stub()
                mockAjax.onFirstCall().resolves(plugins)
                mockAjax.onSecondCall().resolves(nodes)
                global.$ = { ajax: mockAjax }
            })
            afterEach(() => {
                delete global.$
            })
            it('should return palette without hasSchema field when typedModules not provided', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/get-palette', { params: {} }, result)
                result.should.have.property('success', true)
                result.should.have.property('palette')
                result.palette['node-red'].should.not.have.property('hasSchema')
            })
            it('should include hasSchema flag when typedModules provided', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/get-palette', {
                    params: { typedModules: ['node-red'] }
                }, result)
                result.should.have.property('success', true)
                result.palette['node-red'].should.have.property('hasSchema', true)
                result.palette['node-red-contrib-test'].should.have.property('hasSchema', false)
            })
            it('should combine plugins and nodes per module', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/get-palette', { params: {} }, result)
                result.palette['node-red'].plugins.should.have.length(1)
                result.palette['node-red'].nodes.should.have.length(1)
                result.palette['node-red-contrib-test'].nodes.should.have.length(1)
            })
        })
        describe('automation/open-palette-manager', () => {
            beforeEach(() => {
                mockRED.actions = { invoke: sinon.stub() }
            })
            it('should open palette manager with default install view when no view param given', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/open-palette-manager', { params: {} }, result)
                mockRED.actions.invoke.calledOnce.should.be.true()
                mockRED.actions.invoke.calledWith('core:manage-palette', { view: 'install', filter: '' }).should.be.true()
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should pass view param through to RED.actions.invoke', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/open-palette-manager', { params: { view: 'nodes' } }, result)
                mockRED.actions.invoke.calledWith('core:manage-palette', { view: 'nodes', filter: '' }).should.be.true()
                result.should.have.property('success', true)
            })
            it('should pass filter param through to RED.actions.invoke', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/open-palette-manager', { params: { filter: 'node-red-contrib-s7' } }, result)
                mockRED.actions.invoke.calledWith('core:manage-palette', { view: 'install', filter: 'node-red-contrib-s7' }).should.be.true()
                result.should.have.property('success', true)
            })
            it('should succeed even without params', async () => {
                const result = {}
                await expertAutomations.invokeAction('automation/open-palette-manager', {}, result)
                mockRED.actions.invoke.calledOnce.should.be.true()
                mockRED.actions.invoke.calledWith('core:manage-palette', { view: 'install', filter: '' }).should.be.true()
                result.should.have.property('success', true)
            })
        })

        describe('automation/manage-groups', () => {
            function setupGroupMocks () {
                mockRED.nodes.group = sinon.stub().returns(null)
                mockRED.nodes.eachGroup = sinon.stub()
                mockRED.nodes.dirty = sinon.stub()
                mockRED.view.select = sinon.stub()
                mockRED.view.selection = sinon.stub().callsFake(() => mockRED.view.select.lastCall?.args[0] || { nodes: [] })
                mockRED.view.redraw = sinon.stub()
                mockRED.actions = { invoke: sinon.stub() }
                mockRED.history = { push: sinon.stub() }
                mockRED.workspaces = { ...mockRED.workspaces, isLocked: sinon.stub().returns(false) }
            }

            it('should create a group from a list of nodes', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', type: 'inject', z: 'tab1' }
                const nodeB = { id: 'n2', type: 'function', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().callsFake(id => ({ n1: nodeA, n2: nodeB }[id] || null))
                const createdGroup = { id: 'g1', type: 'group', z: 'tab1', nodes: [nodeA, nodeB] }
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(fn => fn(createdGroup))
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1', 'n2'], name: 'My Group' }] }
                }, result)
                result.should.have.property('success', true)
                result.should.have.property('data').which.is.an.Array().with.lengthOf(1)
                result.data[0].should.have.property('op', 'create')
                result.data[0].should.have.property('id', 'g1')
                result.data[0].should.have.property('type', 'group')
                result.data[0].should.have.property('name', 'My Group')
                mockRED.view.select.calledOnce.should.be.true()
                mockRED.actions.invoke.calledWith('core:group-selection').should.be.true()
                mockRED.history.push.calledOnce.should.be.true()
            })

            it('should create a group with an explicit id when provided', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', type: 'inject', z: 'tab1', g: undefined }
                const nodeB = { id: 'n2', type: 'function', z: 'tab1', g: undefined }
                mockRED.nodes.node = sinon.stub().callsFake(id => ({ n1: nodeA, n2: nodeB }[id] || null))
                // group created with auto-generated id 'g-auto', nodes have g set to it
                const createdGroup = { id: 'g-auto', type: 'group', z: 'tab1', nodes: [nodeA, nodeB] }
                nodeA.g = 'g-auto'
                nodeB.g = 'g-auto'
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(fn => fn(createdGroup))
                // group() returns null for both IDs (neither exists before creation)
                mockRED.nodes.group = sinon.stub().returns(null)
                mockRED.nodes.remove = sinon.stub()
                mockRED.nodes.add = sinon.stub()
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1', 'n2'], id: 'my-group-id' }] }
                }, result)
                result.should.have.property('success', true)
                result.data[0].should.have.property('id', 'my-group-id')
                mockRED.nodes.remove.calledWith('g-auto').should.be.true()
                mockRED.nodes.add.calledOnce.should.be.true()
                createdGroup.id.should.equal('my-group-id')
                nodeA.g.should.equal('my-group-id')
                nodeB.g.should.equal('my-group-id')
            })

            it('should throw if explicit id for create is already in use', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', type: 'inject', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().callsFake(id => ({ n1: nodeA }[id] || null))
                const createdGroup = { id: 'g-auto', type: 'group', z: 'tab1', nodes: [nodeA] }
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(fn => fn(createdGroup))
                // group() returns a group for the requested ID — already in use
                mockRED.nodes.group = sinon.stub().callsFake(id => id === 'taken-id' ? { id: 'taken-id' } : null)
                mockRED.nodes.remove = sinon.stub()
                mockRED.nodes.add = sinon.stub()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1'], id: 'taken-id' }] }
                }, result)).rejectedWith(/already in use/)
            })

            it('should throw if selection does not match after select (unexpected editor state)', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().returns(nodeA)
                mockRED.nodes.eachGroup.callsFake(() => {})
                // Simulate editor ignoring the select call (returns empty selection)
                mockRED.view.selection = sinon.stub().returns({ nodes: [] })
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1'] }] }
                }, result)).rejectedWith(/Selection mismatch/)
            })

            it('should throw if workspace is locked for create', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().returns(nodeA)
                mockRED.workspaces.isLocked.withArgs('tab1').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1'] }] }
                }, result)).rejectedWith(/tab1 is locked/)
            })

            it('should throw if group creation produced no new group', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().returns(nodeA)
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(() => {})
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1'] }] }
                }, result)).rejectedWith(/did not create a new group/)
            })

            it('should throw if new group is missing some of the requested nodes', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1' }
                const nodeB = { id: 'n2', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().callsFake(id => ({ n1: nodeA, n2: nodeB }[id] || null))
                const partialGroup = { id: 'g1', type: 'group', z: 'tab1', nodes: [nodeA] }
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(fn => fn(partialGroup))
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1', 'n2'] }] }
                }, result)).rejectedWith(/missing nodes: n2/)
            })

            it('should apply style and env when creating a group', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().returns(nodeA)
                const createdGroup = { id: 'g1', type: 'group', z: 'tab1', nodes: [nodeA], style: {} }
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(fn => fn(createdGroup))
                const env = [{ name: 'HOST', value: 'localhost', type: 'str' }]
                const style = { stroke: '#ff0000', fill: 'none' }
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1'], style, env }] }
                }, result)
                result.should.have.property('success', true)
                createdGroup.style.should.have.property('stroke', '#ff0000')
                createdGroup.style.should.have.property('fill', 'none')
                createdGroup.env.should.deepEqual(env)
                mockRED.history.push.calledOnce.should.be.true()
            })

            it('should throw if nodeIds is empty for create', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: [] }] }
                }, result)).rejectedWith(/nodeIds is required/)
            })

            it('should throw if nodes are on different tabs for create', async () => {
                setupGroupMocks()
                mockRED.nodes.node = sinon.stub().callsFake(id => ({
                    n1: { id: 'n1', z: 'tab1' },
                    n2: { id: 'n2', z: 'tab2' }
                }[id] || null))
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['n1', 'n2'] }] }
                }, result)).rejectedWith(/same tab/)
            })

            it('should throw if a node is not found for create', async () => {
                setupGroupMocks()
                mockRED.nodes.node = sinon.stub().returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'create', nodeIds: ['missing'] }] }
                }, result)).rejectedWith(/Node missing not found/)
            })

            it('should update a group name', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group', z: 'tab1', name: 'Old', nodes: [], changed: false }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'update', id: 'g1', name: 'New Name' }] }
                }, result)
                result.should.have.property('success', true)
                group.name.should.equal('New Name')
                group.changed.should.be.true()
                result.data[0].should.have.property('op', 'update')
                result.data[0].should.have.property('id', 'g1')
            })

            it('should update a group style', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [], changed: false, style: { stroke: '#000' } }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'update', id: 'g1', style: { fill: '#ff0000' } }] }
                }, result)
                group.style.should.deepEqual({ stroke: '#000', fill: '#ff0000' })
                result.data[0].should.have.property('style').which.deepEqual({ stroke: '#000', fill: '#ff0000' })
            })

            it('should replace group env vars', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [], changed: false, env: [] }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                const env = [{ name: 'HOST', value: 'localhost', type: 'str' }]
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'update', id: 'g1', env }] }
                }, result)
                group.env.should.deepEqual(env)
                group.changed.should.be.true()
            })

            it('should add nodes to a group via manage-members', async () => {
                setupGroupMocks()
                const nodeC = { id: 'n3', z: 'tab1' }
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [], changed: false }
                const mergedGroup = { id: 'g2', type: 'group', z: 'tab1', nodes: [group.nodes[0], nodeC], changed: false }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                mockRED.nodes.node = sinon.stub().withArgs('n3').returns(nodeC)
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(fn => fn(group))
                    .onSecondCall().callsFake(fn => { fn(group); fn(mergedGroup) })
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'manage-members', id: 'g1', nodeIds: ['n3'], mode: 'add' }] }
                }, result)
                result.should.have.property('success', true)
                mockRED.view.select.calledOnce.should.be.true()
                mockRED.view.select.firstCall.args[0].nodes.should.deepEqual([group, nodeC])
                mockRED.actions.invoke.calledWith('core:merge-selection-to-group').should.be.true()
                result.data[0].should.have.property('op', 'manage-members')
                result.data[0].should.have.property('mode', 'add')
                result.data[0].should.have.property('id', 'g2')
            })

            it('should remove nodes from a group via manage-members', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1', g: 'g1' }
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [nodeA], changed: false }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                mockRED.nodes.node = sinon.stub().withArgs('n1').returns(nodeA)
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'manage-members', id: 'g1', nodeIds: ['n1'], mode: 'remove' }] }
                }, result)
                result.should.have.property('success', true)
                mockRED.view.select.calledOnce.should.be.true()
                mockRED.view.select.firstCall.args[0].nodes.should.deepEqual([nodeA])
                mockRED.actions.invoke.calledWith('core:remove-selection-from-group').should.be.true()
                result.data[0].should.have.property('op', 'manage-members')
                result.data[0].should.have.property('mode', 'remove')
                result.data[0].should.have.property('id', 'g1')
            })

            it('should throw if node being removed is not in the group', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1', g: 'other-group' }
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [] }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                mockRED.nodes.node = sinon.stub().withArgs('n1').returns(nodeA)
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'manage-members', id: 'g1', nodeIds: ['n1'], mode: 'remove' }] }
                }, result)).rejectedWith(/n1 is not in group g1/)
            })

            it('should throw if workspace is locked for update', async () => {
                setupGroupMocks()
                const group = { id: 'g1', z: 'tab1' }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                mockRED.workspaces.isLocked.withArgs('tab1').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'update', id: 'g1', name: 'X' }] }
                }, result)).rejectedWith(/tab1 is locked/)
            })

            it('should throw if group not found for update', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'update', id: 'missing' }] }
                }, result)).rejectedWith(/Group missing not found/)
            })

            it('should throw if id is missing for update', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'update' }] }
                }, result)).rejectedWith(/id is required for update/)
            })

            it('should throw if node being added is on a different tab', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [] }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                mockRED.nodes.node = sinon.stub().withArgs('n99').returns({ id: 'n99', z: 'tab2' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'manage-members', id: 'g1', nodeIds: ['n99'], mode: 'add' }] }
                }, result)).rejectedWith(/tab2/)
            })

            it('should throw if id is missing for manage-members', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'manage-members', nodeIds: ['n1'], mode: 'add' }] }
                }, result)).rejectedWith(/id is required for manage-members/)
            })

            it('should throw if mode is invalid for manage-members', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group', z: 'tab1', nodes: [] }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'manage-members', id: 'g1', nodeIds: ['n1'], mode: 'remove-all' }] }
                }, result)).rejectedWith(/mode must be "add" or "remove"/)
            })

            it('should delete a group', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group' }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'delete', id: 'g1' }] }
                }, result)
                result.should.have.property('success', true)
                result.data[0].should.deepEqual({ op: 'delete', deleted: 'g1' })
                mockRED.history.push.called.should.be.false()
                mockRED.view.select.calledOnce.should.be.true()
                mockRED.actions.invoke.calledWith('core:ungroup-selection').should.be.true()
            })

            it('should throw if workspace is locked for delete', async () => {
                setupGroupMocks()
                const group = { id: 'g1', type: 'group', z: 'tab1' }
                mockRED.nodes.group = sinon.stub().withArgs('g1').returns(group)
                mockRED.workspaces.isLocked.withArgs('tab1').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'delete', id: 'g1' }] }
                }, result)).rejectedWith(/tab1 is locked/)
            })

            it('should throw if group not found for delete', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'delete', id: 'missing' }] }
                }, result)).rejectedWith(/Group missing not found/)
            })

            it('should throw if id is missing for delete', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'delete' }] }
                }, result)).rejectedWith(/id is required for delete/)
            })

            it('should throw on unknown op', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [{ op: 'explode' }] }
                }, result)).rejectedWith(/Unknown manage-groups op: explode/)
            })

            it('should throw if operations array is empty', async () => {
                setupGroupMocks()
                const result = {}
                await should(expertAutomations.invokeAction('automation/manage-groups', {
                    params: { operations: [] }
                }, result)).rejectedWith(/operations array is required/)
            })

            it('should execute multiple operations sequentially', async () => {
                setupGroupMocks()
                const nodeA = { id: 'n1', z: 'tab1' }
                const nodeB = { id: 'n2', z: 'tab1' }
                mockRED.nodes.node = sinon.stub().callsFake(id => ({ n1: nodeA, n2: nodeB }[id] || null))
                const createdGroup = { id: 'g1', type: 'group', z: 'tab1', nodes: [nodeA, nodeB] }
                const existingGroup = { id: 'g2', type: 'group', z: 'tab1', nodes: [], changed: false }
                mockRED.nodes.eachGroup
                    .onFirstCall().callsFake(() => {})
                    .onSecondCall().callsFake(fn => fn(createdGroup))
                mockRED.nodes.group = sinon.stub().callsFake(id => ({ g2: existingGroup }[id] || null))
                const result = {}
                await expertAutomations.invokeAction('automation/manage-groups', {
                    params: {
                        operations: [
                            { op: 'create', nodeIds: ['n1', 'n2'] },
                            { op: 'update', id: 'g2', name: 'Renamed' }
                        ]
                    }
                }, result)
                result.should.have.property('success', true)
                result.data.should.have.lengthOf(2)
                result.data[0].should.have.property('op', 'create')
                result.data[1].should.have.property('op', 'update')
                existingGroup.name.should.equal('Renamed')
            })
        })
        describe('alignSelection action', () => {
            beforeEach(() => {
                mockRED.actions = { invoke: sinon.stub() }
                mockRED.view.select = sinon.stub()
                mockRED.view.reveal = sinon.stub()
                mockRED.view.selection = sinon.stub().callsFake(() => mockRED.view.select.lastCall?.args[0] || { nodes: [] })
                mockRED.workspaces = { ...mockRED.workspaces, isLocked: sinon.stub().returns(false) }
                mockRED.nodes.workspace = sinon.stub().returns({ id: 'tab1' })
                mockRED.nodes.getType = sinon.stub().returns({ category: 'function' })
            })
            it('should reveal, select, and invoke core:align-selection-to-grid', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 13, y: 27, z: 'tab1' }
                const n2 = { id: 'n2', type: 'debug', x: 45, y: 60, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                const result = {}
                await expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['n1', 'n2'], direction: 'grid' }
                }, result)
                mockRED.view.reveal.calledWith('n1', false).should.be.true()
                mockRED.view.reveal.calledBefore(mockRED.view.select).should.be.true()
                mockRED.view.select.calledWith({ nodes: [n1, n2] }).should.be.true()
                mockRED.actions.invoke.calledWith('core:align-selection-to-grid').should.be.true()
                result.should.have.property('success', true)
                result.data.alignedNodes.should.have.lengthOf(2)
                result.data.excludedConfigNodes.should.have.lengthOf(0)
            })
            it('should invoke the correct core action for each direction', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'debug', x: 30, y: 40, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                const directions = ['left', 'right', 'top', 'bottom', 'middle', 'center']
                for (const direction of directions) {
                    mockRED.actions.invoke.resetHistory()
                    const result = {}
                    await expertAutomations.invokeAction('automation/align-selection', {
                        params: { ids: ['n1', 'n2'], direction }
                    }, result)
                    mockRED.actions.invoke.calledWith(`core:align-selection-to-${direction}`).should.be.true()
                    result.should.have.property('success', true)
                }
            })
            it('should throw if ids array is empty', async () => {
                const result = {}
                await should(expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: [], direction: 'grid' }
                }, result)).rejectedWith(/ids array must not be empty/)
            })
            it('should throw if a node ID does not exist', async () => {
                mockRED.nodes.node.returns(null)
                const result = {}
                await should(expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['nonexistent'], direction: 'grid' }
                }, result)).rejectedWith(/Node nonexistent not found/)
            })
            it('should throw if non-grid direction is used with a single node', async () => {
                const node = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(node)
                const result = {}
                await should(expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['n1'], direction: 'left' }
                }, result)).rejectedWith(/requires at least 2 non-config nodes/)
            })
            it('should allow grid alignment with a single node', async () => {
                const node = { id: 'n1', type: 'inject', x: 13, y: 27, z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(node)
                const result = {}
                await expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['n1'], direction: 'grid' }
                }, result)
                mockRED.view.reveal.calledWith('n1', false).should.be.true()
                mockRED.actions.invoke.calledWith('core:align-selection-to-grid').should.be.true()
                result.should.have.property('success', true)
            })
            it('should throw for an invalid direction', async () => {
                const node = { id: 'n1', type: 'inject', x: 10, y: 20 }
                mockRED.nodes.node.withArgs('n1').returns(node)
                const result = {}
                await should(expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['n1'], direction: 'diagonal' }
                }, result)).rejectedWith(/Invalid alignment direction/)
            })
            it('should throw if workspace is locked', async () => {
                const node = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'locked-tab' }
                mockRED.nodes.node.withArgs('n1').returns(node)
                mockRED.workspaces.isLocked = sinon.stub().withArgs('locked-tab').returns(true)
                const result = {}
                await should(expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['n1'], direction: 'grid' }
                }, result)).rejectedWith(/Workspace locked-tab is locked/)
            })
            it('should exclude config nodes from the selection', async () => {
                const n1 = { id: 'n1', type: 'inject', x: 10, y: 20, z: 'tab1' }
                const n2 = { id: 'n2', type: 'debug', x: 30, y: 40, z: 'tab1' }
                const cfg = { id: 'cfg1', type: 'mqtt-broker', z: 'tab1' }
                mockRED.nodes.node.withArgs('n1').returns(n1)
                mockRED.nodes.node.withArgs('n2').returns(n2)
                mockRED.nodes.node.withArgs('cfg1').returns(cfg)
                mockRED.nodes.getType.withArgs('mqtt-broker').returns({ category: 'config' })
                const result = {}
                await expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['n1', 'cfg1', 'n2'], direction: 'grid' }
                }, result)
                mockRED.view.select.calledWith({ nodes: [n1, n2] }).should.be.true()
                mockRED.actions.invoke.calledWith('core:align-selection-to-grid').should.be.true()
                result.should.have.property('success', true)
                result.data.alignedNodes.should.have.lengthOf(2)
                result.data.excludedConfigNodes.should.have.lengthOf(1)
                result.data.excludedConfigNodes[0].should.deepEqual({ id: 'cfg1', type: 'mqtt-broker' })
            })
            it('should throw if all nodes are config nodes', async () => {
                const cfg = { id: 'cfg1', type: 'mqtt-broker', z: 'tab1' }
                mockRED.nodes.node.withArgs('cfg1').returns(cfg)
                mockRED.nodes.getType.withArgs('mqtt-broker').returns({ category: 'config' })
                const result = {}
                await should(expertAutomations.invokeAction('automation/align-selection', {
                    params: { ids: ['cfg1'], direction: 'grid' }
                }, result)).rejectedWith(/No non-config nodes to align/)
            })
        })
    })
})
