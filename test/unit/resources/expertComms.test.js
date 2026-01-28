/// <reference types="should" />
'use strict'
// eslint-disable-next-line no-unused-vars
const should = require('should')
const sinon = require('sinon')
const EventEmitter = require('events')

describe('expertComms', () => {
    let ExpertComms
    let expertComms
    let mockWindow
    let mockRED
    let mockJQuery
    let addEventListenerStub
    let parentPostMessageStub

    beforeEach(() => {
        // Mock jQuery
        mockJQuery = sinon.stub()
        mockJQuery.ajax = sinon.stub()

        // Mock window object
        mockWindow = {
            parent: {
                postMessage: sinon.stub()
            },
            self: {},
            location: {
                origin: 'http://localhost:1880'
            },
            addEventListener: sinon.stub()
        }
        // Make window.self !== window.parent for testing
        Object.defineProperty(mockWindow, 'self', {
            value: mockWindow,
            writable: true,
            configurable: true
        })
        Object.defineProperty(mockWindow, 'top', {
            value: {},
            writable: true,
            configurable: true
        })

        // Store references to stubs
        addEventListenerStub = mockWindow.addEventListener
        parentPostMessageStub = mockWindow.parent.postMessage

        // Mock global objects
        global.window = mockWindow
        global.$ = mockJQuery
        global.self = mockWindow

        // Mock RED instance
        mockRED = {
            events: new EventEmitter(),
            actions: {
                invoke: sinon.stub()
            },
            view: {
                importNodes: sinon.stub(),
                selection: sinon.stub()
            },
            nodes: {
                createExportableNodeSet: sinon.stub().callsFake((nodes) => nodes || [])
            },
            notify: sinon.stub(),
            _: sinon.stub().callsFake((key, params) => {
                // Simple i18n mock
                if (key === 'clipboard.invalidFlow') {
                    return `Invalid flow: ${params?.message || ''}`
                }
                if (key === 'clipboard.import.errors.notArray') {
                    return 'Flow must be an array'
                }
                if (key === 'clipboard.import.errors.itemNotObject') {
                    return `Item at index ${params?.index} is not an object`
                }
                if (key === 'clipboard.import.errors.missingId') {
                    return `Item at index ${params?.index} is missing required property "id"`
                }
                if (key === 'clipboard.import.errors.missingType') {
                    return `Item at index ${params?.index} is missing required property "type"`
                }
                return key
            }),
            nrAssistant: {
                DEBUG: false
            }
        }

        // Clear require cache to get fresh module
        delete require.cache[require.resolve('../../../resources/expertComms.js')]
        ExpertComms = require('../../../resources/expertComms.js')
        expertComms = ExpertComms
    })

    afterEach(() => {
        sinon.restore()
        delete global.window
        delete global.$
        delete global.self
        delete require.cache[require.resolve('../../../resources/expertComms.js')]
    })

    describe('initialization', () => {
        it('should initialize with RED instance and options', () => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }

            expertComms.init(mockRED, assistantOptions)

            expertComms.RED.should.equal(mockRED)
            expertComms.assistantOptions.should.equal(assistantOptions)
        })

        it('should set up message listeners when parent window exists', () => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }

            expertComms.init(mockRED, assistantOptions)

            addEventListenerStub.calledOnce.should.be.true()
            addEventListenerStub.firstCall.args[0].should.equal('message')
            addEventListenerStub.firstCall.args[1].should.be.a.Function()
            addEventListenerStub.firstCall.args[2].should.equal(false)
        })

        it('should set up Node-RED event listeners', () => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }

            expertComms.init(mockRED, assistantOptions)

            // Check that event listeners were registered
            const eventNames = Object.keys(expertComms.nodeRedEventsMap)
            eventNames.forEach(eventName => {
                const listeners = mockRED.events.listeners(eventName)
                listeners.length.should.be.above(0)
            })
        })

        it('should notify parent when assistant is ready', () => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }

            expertComms.init(mockRED, assistantOptions)

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('assistant-ready')
            message.version.should.equal('1.0.0')
            message.source.should.equal('nr-assistant')
            message.target.should.equal('flowfuse-expert')
            message.scope.should.equal('flowfuse-expert')
        })

        it('should warn and return early if parent window does not exist', () => {
            const consoleWarnStub = sinon.stub(console, 'warn')
            mockWindow.parent = null

            const assistantOptions = {
                assistantVersion: '1.0.0'
            }

            expertComms.init(mockRED, assistantOptions)

            consoleWarnStub.calledOnce.should.be.true()
            consoleWarnStub.restore()
        })

        it('should warn and return early if window.self === window.top', () => {
            const consoleWarnStub = sinon.stub(console, 'warn')
            mockWindow.top = mockWindow.self

            const assistantOptions = {
                assistantVersion: '1.0.0'
            }

            expertComms.init(mockRED, assistantOptions)

            consoleWarnStub.calledOnce.should.be.true()
            consoleWarnStub.restore()
        })
    })

    describe('message handling', () => {
        let messageHandler

        beforeEach(() => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }
            expertComms.init(mockRED, assistantOptions)
            messageHandler = addEventListenerStub.firstCall.args[1]
        })

        it('should ignore messages from self', () => {
            const event = {
                source: mockWindow.self,
                data: {
                    type: 'get-assistant-version',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            // Should not process the message
            parentPostMessageStub.calledOnce.should.be.true() // Only the initial 'assistant-ready' message
        })

        it('should ignore messages with wrong target', () => {
            const event = {
                source: {},
                origin: 'http://example.com',
                data: {
                    type: 'get-assistant-version',
                    target: 'wrong-target',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            parentPostMessageStub.calledOnce.should.be.true() // Only the initial 'assistant-ready' message
        })

        it('should ignore messages with wrong source', () => {
            const event = {
                source: {},
                origin: 'http://example.com',
                data: {
                    type: 'get-assistant-version',
                    target: 'nr-assistant',
                    source: 'wrong-source',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            parentPostMessageStub.calledOnce.should.be.true() // Only the initial 'assistant-ready' message
        })

        it('should ignore messages with wrong scope', () => {
            const event = {
                source: {},
                origin: 'http://example.com',
                data: {
                    type: 'get-assistant-version',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'wrong-scope'
                }
            }

            messageHandler(event)

            parentPostMessageStub.calledOnce.should.be.true() // Only the initial 'assistant-ready' message
        })

        it('should set targetOrigin from event.origin when initially "*"', () => {
            const event = {
                source: {},
                origin: 'http://example.com',
                data: {
                    type: 'get-assistant-version',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            expertComms.targetOrigin.should.equal('*')
            messageHandler(event)
            expertComms.targetOrigin.should.equal('http://example.com')
        })

        it('should handle get-assistant-version request', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'get-assistant-version',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('get-assistant-version')
            reply.version.should.equal('1.0.0')
            reply.success.should.be.true()
            reply.source.should.equal('nr-assistant')
            reply.target.should.equal('flowfuse-expert')
            reply.scope.should.equal('flowfuse-expert')
        })

        it('should handle get-supported-actions request', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'get-supported-actions',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('get-supported-actions')
            reply.supportedActions.should.equal(expertComms.supportedActions)
            reply.success.should.be.true()
        })

        it('should handle get-palette request', async () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'get-palette',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            // Mock AJAX responses
            mockJQuery.ajax
                .onFirstCall().resolves([
                    { module: 'node-red', version: '1.0.0', enabled: true, id: 'plugin1' }
                ])
                .onSecondCall().resolves([
                    { module: 'node-red', id: 'node1', type: 'inject', enabled: true }
                ])

            await messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('set-palette')
            reply.success.should.be.true()
            reply.palette.should.be.an.Object()
            reply.palette['node-red'].should.be.an.Object()
            reply.palette['node-red'].plugins.should.be.an.Array()
            reply.palette['node-red'].nodes.should.be.an.Array()
        })

        it('should handle unknown message type', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'unknown-type',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('error')
            reply.error.should.equal('unknown-type')
            reply.data.should.equal(event.data)
        })

        it('should handle get-selection request with selected nodes', () => {
            const eventSource = { postMessage: sinon.stub() }
            const selectedNodes = [{ id: 'n1', type: 'inject' }, { id: 'n2', type: 'debug' }]
            mockRED.view.selection.returns(selectedNodes)
            mockRED.nodes.createExportableNodeSet.returns([{ id: 'n1', type: 'inject' }, { id: 'n2', type: 'debug' }])
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'get-selection',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('set-selection')
            reply.selection.should.eql([{ id: 'n1', type: 'inject' }, { id: 'n2', type: 'debug' }])
            mockRED.view.selection.calledTwice.should.be.true()
            mockRED.nodes.createExportableNodeSet.calledOnce.should.be.true()
            mockRED.nodes.createExportableNodeSet.firstCall.args[0].should.equal(selectedNodes)
        })

        it('should handle get-selection request when no nodes are selected', () => {
            const eventSource = { postMessage: sinon.stub() }
            mockRED.view.selection.returns(null)
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'get-selection',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('set-selection')
            reply.selection.should.eql([])
            mockRED.view.selection.called.should.be.true()
            mockRED.nodes.createExportableNodeSet.called.should.be.false()
        })

        it('should handle get-selection request when selection is empty array', () => {
            const eventSource = { postMessage: sinon.stub() }
            mockRED.view.selection.returns([])
            mockRED.nodes.createExportableNodeSet.returns([])
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'get-selection',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert'
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.type.should.equal('set-selection')
            reply.selection.should.eql([])
        })
    })

    describe('Node-RED event handling', () => {
        beforeEach(() => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }
            expertComms.init(mockRED, assistantOptions)
        })

        it('should notify parent on editor:open event', () => {
            parentPostMessageStub.resetHistory()

            mockRED.events.emit('editor:open')

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('editor:open')
        })

        it('should notify parent on editor:close event', () => {
            parentPostMessageStub.resetHistory()

            mockRED.events.emit('editor:close')

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('editor:close')
        })

        it('should notify parent of palette changes on registry events', async () => {
            parentPostMessageStub.resetHistory()

            // Mock getPalette
            expertComms.getPalette = sinon.stub().resolves({})

            mockRED.events.emit('registry:node-set-added')

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10))

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('set-palette')
        })

        it('should notify parent of selection when view:selection-changed fires with nodes array', () => {
            parentPostMessageStub.resetHistory()
            const mockNodes = [{ id: 'n1', type: 'inject' }, { id: 'n2', type: 'debug' }]
            mockRED.nodes.createExportableNodeSet.returns([{ id: 'n1', type: 'inject' }, { id: 'n2', type: 'debug' }])

            mockRED.events.emit('view:selection-changed', { nodes: mockNodes })

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('set-selection')
            message.selection.should.eql([{ id: 'n1', type: 'inject' }, { id: 'n2', type: 'debug' }])
            mockRED.nodes.createExportableNodeSet.calledOnce.should.be.true()
            mockRED.nodes.createExportableNodeSet.firstCall.args[0].should.equal(mockNodes)
            mockRED.nodes.createExportableNodeSet.firstCall.args[1].should.eql({ includeModuleConfig: true })
        })

        it('should notify parent with empty selection when view:selection-changed fires without nodes array', () => {
            parentPostMessageStub.resetHistory()

            mockRED.events.emit('view:selection-changed', { nodes: null })

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('set-selection')
            message.selection.should.eql([])
            mockRED.nodes.createExportableNodeSet.called.should.be.false()
        })

        it('should notify parent with empty selection when view:selection-changed fires with non-array nodes', () => {
            parentPostMessageStub.resetHistory()

            mockRED.events.emit('view:selection-changed', { nodes: {} })

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('set-selection')
            message.selection.should.eql([])
        })
    })

    describe('action invocation', () => {
        let messageHandler

        beforeEach(() => {
            const assistantOptions = {
                assistantVersion: '1.0.0'
            }
            expertComms.init(mockRED, assistantOptions)
            messageHandler = addEventListenerStub.firstCall.args[1]
        })

        it('should reject action invocation without action string', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    params: {}
                }
            }

            messageHandler(event)

            // Should not send any reply
            eventSource.postMessage.called.should.be.false()
        })

        it('should reject unknown action', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    action: 'unknown-action',
                    params: {}
                }
            }

            const consoleWarnStub = sinon.stub(console, 'warn')

            messageHandler(event)

            consoleWarnStub.calledOnce.should.be.true()
            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.error.should.equal('unknown-action')

            consoleWarnStub.restore()
        })

        it('should reject action with invalid parameters', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    action: 'core:manage-palette',
                    params: {} // Missing required 'filter' parameter
                }
            }

            const consoleWarnStub = sinon.stub(console, 'warn')

            messageHandler(event)

            consoleWarnStub.calledOnce.should.be.true()
            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.error.should.equal('Data is missing required parameter "filter"')

            consoleWarnStub.restore()
        })

        it('should handle valid core:manage-palette action', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    action: 'core:manage-palette',
                    params: {
                        filter: 'node-red-contrib-test',
                        view: 'install'
                    }
                }
            }

            mockRED.actions.invoke.returns(true)

            messageHandler(event)

            mockRED.actions.invoke.calledOnce.should.be.true()
            mockRED.actions.invoke.firstCall.args[0].should.equal('core:manage-palette')
            mockRED.actions.invoke.firstCall.args[1].should.eql({
                filter: 'node-red-contrib-test',
                view: 'install'
            })

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.success.should.be.true()
            reply.action.should.equal('core:manage-palette')
        })

        it('should handle custom:import-flow action', () => {
            const eventSource = { postMessage: sinon.stub() }
            const flowJson = JSON.stringify([{ id: 'n1', type: 'inject' }])
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    action: 'custom:import-flow',
                    params: {
                        flow: flowJson,
                        addFlow: false
                    }
                }
            }

            mockRED.view.importNodes.returns(true)

            messageHandler(event)

            mockRED.view.importNodes.calledOnce.should.be.true()
            mockRED.view.importNodes.firstCall.args[0].should.eql([{ id: 'n1', type: 'inject' }])
            mockRED.view.importNodes.firstCall.args[1].should.eql({
                generateIds: true,
                addFlow: false
            })

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.success.should.be.true()
        })

        it('should handle errors in action invocation', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    action: 'core:manage-palette',
                    params: {
                        filter: 'test'
                    }
                }
            }

            const error = new Error('Action failed')
            mockRED.actions.invoke.throws(error)

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.error.should.equal('Action failed')
        })

        it('should handle errors in custom:import-flow action', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = {
                source: eventSource,
                origin: 'http://example.com',
                data: {
                    type: 'invoke-action',
                    target: 'nr-assistant',
                    source: 'flowfuse-expert',
                    scope: 'flowfuse-expert',
                    action: 'custom:import-flow',
                    params: {
                        flow: 'invalid json'
                    }
                }
            }

            messageHandler(event)

            eventSource.postMessage.calledOnce.should.be.true()
            const reply = eventSource.postMessage.firstCall.args[0]
            reply.error.should.be.a.String()
        })
    })

    describe('getPalette', () => {
        it('should fetch and combine plugins and nodes', async () => {
            const plugins = [
                { module: 'node-red', version: '1.0.0', enabled: true, id: 'plugin1' },
                { module: 'node-red-contrib-test', version: '2.0.0', enabled: true, id: 'plugin2' }
            ]
            const nodes = [
                { module: 'node-red', id: 'node1', type: 'inject', enabled: true },
                { module: 'node-red', id: 'node2', type: 'debug', enabled: true },
                { module: 'node-red-contrib-test', id: 'node3', type: 'test-node', enabled: true }
            ]

            mockJQuery.ajax
                .onFirstCall().resolves(plugins)
                .onSecondCall().resolves(nodes)

            const palette = await expertComms.getPalette()

            mockJQuery.ajax.calledTwice.should.be.true()
            mockJQuery.ajax.firstCall.args[0].url.should.equal('plugins')
            mockJQuery.ajax.secondCall.args[0].url.should.equal('nodes')

            palette.should.be.an.Object()
            palette['node-red'].should.be.an.Object()
            palette['node-red'].plugins.should.have.length(1)
            palette['node-red'].nodes.should.have.length(2)
            palette['node-red-contrib-test'].should.be.an.Object()
            palette['node-red-contrib-test'].plugins.should.have.length(1)
            palette['node-red-contrib-test'].nodes.should.have.length(1)
        })

        it('should handle multiple plugins for same module', async () => {
            const plugins = [
                { module: 'node-red', version: '1.0.0', enabled: true, id: 'plugin1' },
                { module: 'node-red', version: '1.0.0', enabled: true, id: 'plugin2' }
            ]
            const nodes = []

            mockJQuery.ajax
                .onFirstCall().resolves(plugins)
                .onSecondCall().resolves(nodes)

            const palette = await expertComms.getPalette()

            palette['node-red'].plugins.should.have.length(2)
        })

        it('should handle nodes without existing module entry', async () => {
            const plugins = []
            const nodes = [
                { module: 'node-red', id: 'node1', type: 'inject', enabled: true }
            ]

            mockJQuery.ajax
                .onFirstCall().resolves(plugins)
                .onSecondCall().resolves(nodes)

            const palette = await expertComms.getPalette()

            palette['node-red'].should.be.an.Object()
            palette['node-red'].nodes.should.have.length(1)
            palette['node-red'].plugins.should.have.length(0)
        })
    })

    describe('validateSchema', () => {
        it('should validate object type', () => {
            const schema = { type: 'object' }
            const valid = { foo: 'bar' }
            const invalid = 'not an object'
            const invalidArray = []

            expertComms.validateSchema(valid, schema).valid.should.be.true()
            expertComms.validateSchema(invalid, schema).valid.should.be.false()
            expertComms.validateSchema(invalidArray, schema).valid.should.be.false()
        })

        it('should check required properties', () => {
            const schema = {
                type: 'object',
                required: ['foo', 'bar'],
                properties: {
                    foo: { type: 'string' },
                    bar: { type: 'string' }
                }
            }

            const valid = { foo: 'value1', bar: 'value2' }
            const missing = { foo: 'value1' }

            expertComms.validateSchema(valid, schema).valid.should.be.true()
            const result = expertComms.validateSchema(missing, schema)
            result.valid.should.be.false()
            result.error.should.containEql('bar')
        })

        it('should check property types', () => {
            const schema = {
                type: 'object',
                properties: {
                    foo: { type: 'string' },
                    bar: { type: 'number' }
                }
            }

            const valid = { foo: 'test', bar: 123 }
            const invalid = { foo: 123, bar: 'test' }

            expertComms.validateSchema(valid, schema).valid.should.be.true()
            expertComms.validateSchema(invalid, schema).valid.should.be.false()
        })

        it('should check enum values', () => {
            const schema = {
                type: 'object',
                properties: {
                    view: {
                        type: 'string',
                        enum: ['nodes', 'install']
                    }
                }
            }

            const valid = { view: 'install' }
            const invalid = { view: 'invalid' }

            expertComms.validateSchema(valid, schema).valid.should.be.true()
            const result = expertComms.validateSchema(invalid, schema)
            result.valid.should.be.false()
            result.error.should.containEql('invalid')
        })

        it('should apply default values', () => {
            const schema = {
                type: 'object',
                properties: {
                    view: {
                        type: 'string',
                        enum: ['nodes', 'install'],
                        default: 'install'
                    }
                }
            }

            const data = {}
            const result = expertComms.validateSchema(data, schema)

            result.valid.should.be.true()
            data.view.should.equal('install')
        })
    })

    describe('validateFlowString', () => {
        beforeEach(() => {
            expertComms.RED = mockRED
        })

        it('should validate valid flow JSON string', () => {
            const flowString = JSON.stringify([
                { id: 'n1', type: 'inject' },
                { id: 'n2', type: 'debug' }
            ])

            const result = expertComms.validateFlowString(flowString)

            result.should.be.an.Array()
            result.should.have.length(2)
        })

        it('should reject non-array JSON', () => {
            const flowString = JSON.stringify({ id: 'n1', type: 'inject' })

            should(() => {
                expertComms.validateFlowString(flowString)
            }).throw()
        })

        it('should reject array with non-object items', () => {
            const flowString = JSON.stringify(['not an object'])

            should(() => {
                expertComms.validateFlowString(flowString)
            }).throw()
        })

        it('should reject nodes without id', () => {
            const flowString = JSON.stringify([{ type: 'inject' }])

            should(() => {
                expertComms.validateFlowString(flowString)
            }).throw()
        })

        it('should reject nodes without type', () => {
            const flowString = JSON.stringify([{ id: 'n1' }])

            should(() => {
                expertComms.validateFlowString(flowString)
            }).throw()
        })
    })

    describe('importNodes', () => {
        beforeEach(() => {
            expertComms.RED = mockRED
        })

        it('should import valid flow string', () => {
            const flowString = JSON.stringify([{ id: 'n1', type: 'inject' }])
            mockRED.view.importNodes.returns(true)

            expertComms.importNodes(flowString, false)

            mockRED.view.importNodes.calledOnce.should.be.true()
            mockRED.view.importNodes.firstCall.args[0].should.eql([{ id: 'n1', type: 'inject' }])
            mockRED.view.importNodes.firstCall.args[1].should.eql({
                generateIds: true,
                addFlow: false
            })
        })

        it('should handle addFlow parameter', () => {
            const flowString = JSON.stringify([{ id: 'n1', type: 'inject' }])
            mockRED.view.importNodes.returns(true)

            expertComms.importNodes(flowString, true)

            mockRED.view.importNodes.firstCall.args[1].addFlow.should.be.true()
        })

        it('should handle empty string', () => {
            expertComms.importNodes('', false)

            mockRED.view.importNodes.called.should.be.false()
        })

        it('should handle whitespace-only string', () => {
            expertComms.importNodes('   ', false)

            mockRED.view.importNodes.called.should.be.false()
        })

        it('should throw error for invalid flow string', () => {
            const flowString = 'invalid json'

            should(() => {
                expertComms.importNodes(flowString, false)
            }).throw()
        })

        it('should handle import conflict errors', () => {
            const flowString = JSON.stringify([{ id: 'n1', type: 'inject' }])
            const error = new Error('import_conflict')
            mockRED.view.importNodes.throws(error)

            should(() => {
                expertComms.importNodes(flowString, false)
            }).throw()

            mockRED.notify.calledOnce.should.be.true()
            mockRED.notify.firstCall.args[0].should.containEql('Import failed')
        })

        it('should handle non-string input (already parsed)', () => {
            const nodes = [{ id: 'n1', type: 'inject' }]
            mockRED.view.importNodes.returns(true)

            expertComms.importNodes(nodes, false)

            mockRED.view.importNodes.calledOnce.should.be.true()
            mockRED.view.importNodes.firstCall.args[0].should.equal(nodes)
        })
    })

    describe('debug', () => {
        beforeEach(() => {
            expertComms.RED = mockRED
        })

        it('should not log when DEBUG is false', () => {
            const consoleLogStub = sinon.stub(console, 'log')
            expertComms.RED.nrAssistant.DEBUG = false

            expertComms.debug('test message')

            consoleLogStub.called.should.be.false()
            consoleLogStub.restore()
        })

        it('should log when DEBUG is true', () => {
            const consoleLogStub = sinon.stub(console, 'log')
            expertComms.RED.nrAssistant.DEBUG = true

            expertComms.debug('test message', 'arg1', 'arg2')

            consoleLogStub.calledOnce.should.be.true()
            consoleLogStub.firstCall.args[0].should.equal('[nr-assistant]')
            consoleLogStub.firstCall.args[1].should.equal('test message')
            consoleLogStub.firstCall.args[2].should.equal('arg1')
            consoleLogStub.firstCall.args[3].should.equal('arg2')
            consoleLogStub.restore()
        })
    })

    describe('postParent and postReply', () => {
        beforeEach(() => {
            expertComms.RED = mockRED
            expertComms.targetOrigin = 'http://example.com'
        })

        it('should post message to parent window', () => {
            const payload = { type: 'test-message', data: 'test' }

            expertComms.postParent(payload)

            parentPostMessageStub.calledOnce.should.be.true()
            const message = parentPostMessageStub.firstCall.args[0]
            message.type.should.equal('test-message')
            message.data.should.equal('test')
            message.source.should.equal('nr-assistant')
            message.target.should.equal('flowfuse-expert')
            message.scope.should.equal('flowfuse-expert')
            parentPostMessageStub.firstCall.args[1].should.equal('http://example.com')
        })

        it('should post reply to event source', () => {
            const eventSource = { postMessage: sinon.stub() }
            const event = { source: eventSource }
            const payload = { type: 'reply', data: 'test' }

            expertComms.postReply(payload, event)

            eventSource.postMessage.calledOnce.should.be.true()
            const message = eventSource.postMessage.firstCall.args[0]
            message.type.should.equal('reply')
            message.data.should.equal('test')
            eventSource.postMessage.firstCall.args[1].should.equal('http://example.com')
        })

        it('should warn when target window is not available', () => {
            const consoleWarnStub = sinon.stub(console, 'warn')
            mockWindow.parent = null

            expertComms.postParent({ type: 'test' })

            consoleWarnStub.calledOnce.should.be.true()
            consoleWarnStub.restore()
        })
    })
})
