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
            supportedActions.should.only.have.keys('automation/get-nodes', 'automation/select-nodes')
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
    })

    describe('invokeAction', () => {
        beforeEach(() => {
            expertAutomations.init(mockExpertComms, mockRED)
            sinon.spy(expertAutomations, 'getNodes')
            sinon.spy(expertAutomations, 'selectNodes')
            sinon.spy(expertAutomations, '_formatNodes')
        })
        it('should throw an error if action is not found (bad namespace)', () => {
            (() => expertAutomations.invokeAction('bad-namespace/get-nodes')).should.throw(/Action .* not found/)
        })
        it('should throw an error if action is not found (bad action name)', () => {
            (() => expertAutomations.invokeAction('automation/nonexistent-action')).should.throw(/Action .* not found/)
        })
        describe('selectNodes action', () => {
            it('should invoke action and select nodes', () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = {}
                expertAutomations.invokeAction('automation/select-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                expertAutomations.selectNodes.calledWith(['node1', 'node2'], undefined).should.be.true()
                mockRED.view.select.calledWith({ nodes: [mockNode1, mockNode2] }).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1, mockNode2])
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should fail if no nodes found', () => {
                mockRED.nodes.node.returns(null)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = {}
                expertAutomations.invokeAction('automation/select-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', false)
                result.should.have.property('error')
            })
        })
        describe('getNodes action', () => {
            it('should invoke action and get multiple nodes using params.ids', () => {
                const mockNode1 = { id: 'node1' }
                const mockNode2 = { id: 'node2' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                mockRED.nodes.node.withArgs('node2').returns(mockNode2)
                const result = {}
                expertAutomations.invokeAction('automation/get-nodes', { params: { ids: ['node1', 'node2'] } }, result)
                expertAutomations.getNodes.calledWith(['node1', 'node2'], undefined).should.be.true()
                expertAutomations._formatNodes.calledWith([mockNode1, mockNode2], undefined).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1, mockNode2])
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should invoke action and get single node using params.id', () => {
                const mockNode1 = { id: 'node1' }
                mockRED.nodes.node.withArgs('node1').returns(mockNode1)
                const result = {}
                expertAutomations.invokeAction('automation/get-nodes', { params: { id: 'node1' } }, result)
                expertAutomations.getNodes.calledWith('node1', undefined).should.be.true()
                expertAutomations._formatNodes.calledWith([mockNode1], undefined).should.be.true()
                result.should.have.property('nodes').and.deepEqual([mockNode1])
                result.should.have.property('success', true)
                result.should.have.property('handled', true)
            })
            it('should fail if no nodes found', () => {
                mockRED.nodes.node.returns(null)
                mockRED.nodes.getAllFlowNodes.returns([])
                const result = {}
                expertAutomations.invokeAction('automation/get-nodes', { params: { id: 'node1' } }, result)
                result.should.have.property('success', false)
                result.should.have.property('error')
            })
        })
    })
})
