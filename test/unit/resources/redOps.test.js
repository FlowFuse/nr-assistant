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
    console.debug(`Skipping redOps frontend tests since Node v${process.versions.node} does not support ES modules! These will be covered in another CI run.`)
    skipTests = true
}

const describeMain = skipTests ? describe.skip : describe

describeMain('redOps', () => {
    /** @type {import('../../../resources/redOps.js').RedOps} */
    let redOps
    /** @type {ReturnType<typeof createMockRed>} */
    let mockRED

    function createMockRed () {
        return {
            actions: {
                invoke: sinon.stub()
            },
            events: new (require('events').EventEmitter)(),
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

        const RedOpsModule = import('../../../resources/redOps.js')
        redOps = new (await RedOpsModule).RedOps()
        redOps.init(mockRED)
    })

    afterEach(() => {
        sinon.restore()
        delete require.cache[require.resolve('../../../resources/redOps.js')]
    })

    describe('initialization', () => {
        it('should initialize with RED instance and options', () => {
            redOps.init(mockRED)
            redOps.RED.should.equal(mockRED)
        })
    })

    describe('validateFlowString', () => {
        it('should validate valid flow JSON string', () => {
            const flowString = JSON.stringify([
                { id: 'n1', type: 'inject' },
                { id: 'n2', type: 'debug' }
            ])

            const result = redOps.validateFlowString(flowString)

            result.should.be.an.Array()
            result.should.have.length(2)
        })

        it('should reject non-array JSON', () => {
            const flowString = JSON.stringify({ id: 'n1', type: 'inject' })

            should(() => {
                redOps.validateFlowString(flowString)
            }).throw()
        })

        it('should reject array with non-object items', () => {
            const flowString = JSON.stringify(['not an object'])

            should(() => {
                redOps.validateFlowString(flowString)
            }).throw()
        })

        it('should reject nodes without id', () => {
            const flowString = JSON.stringify([{ type: 'inject' }])

            should(() => {
                redOps.validateFlowString(flowString)
            }).throw()
        })

        it('should reject nodes without type', () => {
            const flowString = JSON.stringify([{ id: 'n1' }])

            should(() => {
                redOps.validateFlowString(flowString)
            }).throw()
        })
    })

    describe('invoke', () => {
        beforeEach(() => {
            sinon.spy(redOps, 'commandAndWait')
        })
        it('should throw an error not initialised', () => {
            redOps.RED = null;
            (() => redOps.invoke('core:add-flows')).should.throw(/not initialized/)
        })
        it('should invoke RED action', () => {
            redOps.invoke('core:add-flows', { foo: 'bar' })
            mockRED.actions.invoke.called.should.be.true()
            const args = mockRED.actions.invoke.getCall(0).args
            args[0].should.equal('core:add-flows')
            args[1].should.deepEqual({ foo: 'bar' })
        })
    })

    describe('invokeActionAndWait', () => {
        beforeEach(() => {
            sinon.spy(redOps, 'invoke')
        })
        it('should call commandAndWait', async () => {
            const eventData = { success: true }
            sinon.stub(redOps, 'commandAndWait').resolves(eventData)
            const result = await redOps.invokeActionAndWait('core:add-flows', { foo: 'bar' }, 'test-event')
            result.should.deepEqual({ success: true })
        })
        it('should call invoke', async () => {
            const eventData = { success: true }
            setTimeout(() => {
                mockRED.events.emit('test-event', eventData)
            }, 100)
            const result = await redOps.invokeActionAndWait('core:add-flows', { foo: 'bar' }, 'test-event')
            redOps.invoke.called.should.be.true()
            const args = redOps.invoke.getCall(0).args
            args[0].should.equal('core:add-flows')
            args[1].should.deepEqual({ foo: 'bar' })
            result.should.deepEqual({ success: true })
        })
    })

    describe('commandAndWait', () => {
        it('should execute command and wait for event', async () => {
            const eventData = { success: true }
            setTimeout(() => {
                mockRED.events.emit('test-event', eventData)
            }, 100)
            const command = sinon.stub().callsFake(() => {
                // Simulate some command action
            })
            const result = await redOps.commandAndWait(command, 'test-event')
            command.called.should.be.true()
            result.should.deepEqual({ success: true })
        })
        it('should timeout if event not received', async () => {
            const command = sinon.stub().callsFake(() => {
                // Simulate some command action
            })
            try {
                await redOps.commandAndWait(command, 'test-event', { timeout: 100 })
                should.fail('Expected to throw timeout error')
            } catch (err) {
                err.message.should.match(/timeout/i)
            }
        })
        it('should use resolveValidator to validate event is the one we want before resolving', async () => {
            const eventData = { success: true, id: 123 }
            setTimeout(() => {
                mockRED.events.emit('test-event', { id: 999 }) // Emit unwanted event first
            }, 100)
            setTimeout(() => {
                mockRED.events.emit('test-event', eventData) // Emit desired event after
            }, 200)
            const command = sinon.stub().callsFake(() => {
                // Simulate some command action
            })
            const resolveValidator = sinon.stub().callsFake((data) => data.id === 123)
            const result = await redOps.commandAndWait(command, 'test-event', { resolveValidator })
            resolveValidator.calledTwice.should.be.true()
            command.called.should.be.true()
            result.should.deepEqual({ success: true, id: 123 })
        })
    })
})
