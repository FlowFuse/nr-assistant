/// <reference types="should" />
'use strict'
// eslint-disable-next-line no-unused-vars
const should = require('should')
const sinon = require('sinon')
const EventEmitter = require('events')

const RED = {
    comms: {
        publish: sinon.stub().callsFake((topic, msg, retain) => {
            // Simulate the front end receiving the message
            if (topic === 'nr-assistant/mcp/ready') {
                // front end would normally call RED.events.emit('nr-assistant/completions/load', msg)
                // simulate that here with a suitable FE->BE delay
                setTimeout(() => {
                    RED.events.emit('comms:message:nr-assistant/completions/load', {
                        enabled: msg._fakeEnabled || false,
                        mcpReady: !!msg?.enabled
                    })
                }, 20)
            }
            RED.events.emit(`test-echo:${topic}`, msg)
        })
    },
    events: new EventEmitter(),
    log: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub()
    },
    settings: {
        flowforge: {
            tables: {
                token: 'test-token'
            },
            assistant: {
                enabled: true,
                url: 'http://localhost:8080/assistant',
                token: 'test-token',
                mcp: {
                    enabled: true
                },
                completions: {
                    enabled: true,
                    modelUrl: 'http://localhost:8081/v1/api/assets/completions/model.onnx',
                    vocabularyUrl: 'http://localhost:8081/v1/api/assets/completions/vocabulary.json'
                }
            }
        }
    },
    httpAdmin: {
        _getEndpoints: {},
        _postEndpoints: {},
        get: function (path, permissions, handler) {
            this._getEndpoints[path] = { permissions, handler }
            return (req, res) => {
                if (req.url === path) {
                    handler(req, res)
                } else {
                    res.status(404).send({ error: 'Not Found' })
                }
            }
        },
        post: function (path, permissions, handler) {
            this._postEndpoints[path] = { permissions, handler }
            return (req, res) => {
                if (req.url === path) {
                    handler(req, res)
                } else {
                    res.status(404).send({ error: 'Not Found' })
                }
            }
        }
    },
    auth: {
        needsPermission: (permission) => {
            return (req, res, next) => {
                // Simulate permission checking
                if (permission === 'write') {
                    next()
                } else {
                    res.status(403).send({ error: 'Forbidden' })
                }
            }
        }
    },
    version () {
        return '4.1.0'
    }
}

describe('assistant', () => {
    /** @type {import('../../../lib/assistant.js')} */
    let assistant
    /** @type {import('got').Got} */
    let fakeGot

    beforeEach(() => {
        // first, delete the cached assistant module
        delete require.cache[require.resolve('../../../lib/assistant.js')]
        // then, require it again to reset its state
        assistant = require('../../../lib/assistant.js')

        // mock things that are not needed for these tests
        sinon.stub(assistant, '_loadMlRuntime').callsFake(() => {
            assistant._ort = {
                InferenceSession: {
                    create: sinon.stub().resolves({
                        run: sinon.stub().resolves({
                            probabilities: {
                                cpuData: () => new Float32Array([0.1, 0.9, 0.8]) // mock probabilities
                            }
                        })
                    })
                },
                Tensor: sinon.stub().callsFake((type, data, shape) => {
                    return {
                        type,
                        data,
                        shape,
                        cpuData: () => data // simulate cpuData returning the original data
                    }
                })
            }
            return Promise.resolve(assistant._ort)
        })

        fakeGot = sinon.stub().callsFake((url, options) => {
            let value = null
            if (url.endsWith('vocabulary.json')) {
                value = {
                    input_features: ['A', 'B', 'C'],
                    classifications: ['X', 'Y', 'Z'],
                    core_nodes: ['A', 'B', 'C']
                }
                if (options.responseType === 'buffer') {
                    value = Buffer.from(JSON.stringify(value)) // simulate a valid vocabulary file
                }
            } else if (url.endsWith('model.onnx')) {
                value = Buffer.from('fake model data') // simulate a valid model file
            } else {
                throw new Error(`Unexpected URL: ${url}`)
            }
            return {
                body: value
            }
        })
        fakeGot.get = fakeGot // simulate the got module's get method

        // spies
        sinon.spy(assistant, 'loadMCP')
        sinon.spy(assistant, 'loadCompletions')
        sinon.spy(assistant, '_loadCompletionsLabels')
    })

    afterEach(() => {
        // restore the original module state
        assistant.dispose()
        sinon.restore()
        RED.comms.publish.resetHistory()
        RED.log.info.resetHistory()
        RED.log.error.resetHistory()
        RED.events.removeAllListeners() // clear any event listeners
        RED.httpAdmin._getEndpoints = {}
        RED.httpAdmin._postEndpoints = {}
        assistant = null
    })

    it('should be constructed', async () => {
        assistant.should.be.ok()
        assistant.init.should.be.a.Function()
        assistant.isInitialized.should.be.false()
        assistant.isLoading.should.be.false()
    })

    it('should initialize with valid default settings', async () => {
        const options = { ...RED.settings.flowforge.assistant }
        delete options.mcp // simulate MCP settings not being present - to test defaulting to enabled
        delete options.completions // simulate completions settings not being present - to test defaulting to enabled
        options.got = fakeGot // use the mocked got function
        const waitForCompletionsReady = new Promise(resolve => {
            RED.events.on('test-echo:nr-assistant/completions/ready', (msg) => resolve())
        })

        await assistant.init(RED, options)

        // simulate the frontend calling RED.comms.send('nr-assistant/completions/load', {})
        RED.events.emit('comms:message:nr-assistant/completions/load', {})
        await waitForCompletionsReady

        assistant.isInitialized.should.be.true()
        assistant.isLoading.should.be.false()

        assistant._loadMlRuntime.calledOnce.should.be.true()
        assistant._ort.InferenceSession.create.calledOnce.should.be.true()
        assistant._completionsSession.should.be.an.Object()
        assistant._completionsSession.run.should.be.a.Function()

        assistant._loadCompletionsLabels.calledOnce.should.be.true()
        assistant.labeller.should.be.an.Object()
        assistant.labeller.inputFeatureLabels.should.be.an.Array()
        assistant.labeller.classifierLabels.should.be.an.Array()
        assistant.labeller.nodeLabels.should.be.an.Array()

        RED.comms.publish.calledThrice.should.be.true()
        RED.comms.publish.firstCall.args[0].should.equal('nr-assistant/initialise')
        RED.comms.publish.firstCall.args[1].should.eql({
            enabled: true,
            tablesEnabled: false,
            requestTimeout: 60000
        })

        RED.comms.publish.secondCall.args[0].should.equal('nr-assistant/mcp/ready')
        RED.comms.publish.secondCall.args[1].should.eql({
            enabled: true,
            tablesEnabled: false,
            requestTimeout: 60000
        })

        RED.comms.publish.thirdCall.args[0].should.equal('nr-assistant/completions/ready')
        RED.comms.publish.thirdCall.args[1].should.eql({ enabled: true })

        // check MCP
        assistant.mcpReady.should.be.true()
        assistant._mcpClient.should.be.an.Object()
        assistant._mcpServer.should.be.an.Object()

        RED.log.info.calledWith('FlowFuse Assistant Model Context Protocol (MCP) loaded').should.be.true()
        RED.log.info.calledWith('FlowFuse Assistant Completions Loaded').should.be.true()
        RED.log.info.calledWith('FlowFuse Assistant Plugin loaded').should.be.true()

        RED.log.error.called.should.be.false()

    it('should initialize with inlineCompletionsEnabled', async () => {
        const options = { ...RED.settings.flowforge.assistant }
        // mock /settings to return { inlineCompletionsEnabled: true }
        const resp = { body: { inlineCompletions: true } }
        options.got = sinon.stub().returns(Promise.resolve(resp))
        options.got.get = options.got // simulate the got module's get method
        await assistant.init(RED, options)
        RED.comms.publish.called.should.be.true()
        RED.comms.publish.firstCall.args[0].should.equal('nr-assistant/initialise')
        RED.comms.publish.firstCall.args[1].should.eql({
            enabled: true,
            tablesEnabled: false,
            inlineCompletionsEnabled: true,
            requestTimeout: 60000
        })
        // ensure the admin endpoint was created
        RED.httpAdmin._postEndpoints.should.have.property('/nr-assistant/fim/:nodeModule/:nodeType')
        RED.httpAdmin._postEndpoints['/nr-assistant/fim/:nodeModule/:nodeType'].permissions.should.be.a.Function()
        RED.httpAdmin._postEndpoints['/nr-assistant/fim/:nodeModule/:nodeType'].handler.should.be.a.Function()
    })

    it('should not re-initialize if already initialized', async () => {
        const options = { ...RED.settings.flowforge.assistant }
        const pending = assistant.init(RED, options) // call without to simulate "busy loading"
        assistant.isLoading.should.be.true()
        // 2nd call should log to debug log "Assistant is already loading"
        await assistant.init(RED, options)

        assistant.isInitialized.should.be.true() // should still be initialized
        assistant.isLoading.should.be.true() // but still loading
        RED.log.debug.calledWith('FlowFuse Assistant is busy loading').should.be.true()

        // lets finish the first call
        await pending // wait for the first call to finish
        assistant.isInitialized.should.be.true()
        assistant.isLoading.should.be.false()
    })

    it('should not be enabled if disabled in settings', async () => {
        const options = { ...RED.settings.flowforge.assistant, enabled: false }
        await assistant.init(RED, options)

        RED.log.info.calledWith('FlowFuse Assistant Plugin is not enabled').should.be.true()
        RED.comms.publish.called.should.be.false() // should not be telling the frontend anything
        assistant.isInitialized.should.be.true()
        assistant.isLoading.should.be.false()
        assistant.isEnabled.should.be.false()

        assistant.loadMCP.called.should.be.false()
        assistant.loadCompletions.called.should.be.false()
    })

    it('should not be enabled if required url option is missing', async () => {
        const options = { ...RED.settings.flowforge.assistant, enabled: true }
        delete options.url // simulate missing URL
        await assistant.init(RED, options).should.be.rejectedWith('Plugin configuration is missing required options')
        RED.log.warn.calledWith('FlowFuse Assistant Plugin configuration is missing required options').should.be.true()
        // should not have called any methods

        RED.comms.publish.called.should.be.false() // should not be telling the frontend anything
        assistant.isLoading.should.be.false()
        assistant.isEnabled.should.be.false()

        assistant.loadMCP.called.should.be.false()
        assistant.loadCompletions.called.should.be.false()
    })

    it('should not be enabled if required token option is missing', async () => {
        const options = { ...RED.settings.flowforge.assistant, enabled: true }
        delete options.token // simulate missing token
        await assistant.init(RED, options).should.be.rejectedWith('Plugin configuration is missing required options')
        RED.log.warn.calledWith('FlowFuse Assistant Plugin configuration is missing required options').should.be.true()
        // should not have called any methods

        RED.comms.publish.called.should.be.false() // should not be telling the frontend anything
        assistant.isLoading.should.be.false()
        assistant.isEnabled.should.be.false()

        assistant.loadMCP.called.should.be.false()
        assistant.loadCompletions.called.should.be.false()
    })

    it('should skip loading completions for node-red < 4.1', async () => {
        const options = { ...RED.settings.flowforge.assistant, enabled: true }
        const fakeRED = {
            ...RED,
            version: () => '4.0.0' // simulate an older Node-RED version
        }
        await assistant.init(fakeRED, options)

        assistant.isInitialized.should.be.true()
        assistant.isLoading.should.be.false()
        assistant.isEnabled.should.be.true()

        // the RED.comms.publish('nr-assistant/completions/ready') should not be called
        RED.comms.publish.calledTwice.should.be.true()
        RED.comms.publish.firstCall.args[0].should.equal('nr-assistant/initialise')
        RED.comms.publish.secondCall.args[0].should.equal('nr-assistant/mcp/ready')

        assistant.loadCompletions.called.should.be.false() // Completions should not be loaded
    })

    it('should continue to finish loading but with degraded functionality if MCP fails to load', async () => {
        const options = { ...RED.settings.flowforge.assistant, enabled: true }
        // stub the loadMCP method to simulate a failure
        assistant.loadMCP.restore() // restore the original method
        sinon.stub(assistant, 'loadMCP').rejects(new Error('MCP Load Failed'))
        await assistant.init(RED, options)
        assistant.loadMCP.calledOnce.should.be.true()
        should.not.exist(assistant._mcpClient)
        should.not.exist(assistant._mcpServer)
        RED.log.warn.calledWith('FlowFuse Assistant MCP could not be loaded. Assistant features that require MCP will not be available').should.be.true()
        RED.log.info.calledWith('FlowFuse Assistant Plugin loaded (reduced functionality)').should.be.true()
        // Only 1 RED.comms.publish for 'nr-assistant/mcp/ready') should have been be called
        RED.comms.publish.calledOnce.should.be.true()
        RED.comms.publish.firstCall.args[0].should.equal('nr-assistant/initialise')
        // completions should not be loaded since they depend on MCP
        assistant.loadCompletions.called.should.be.false()
    })

    it('should continue to finish loading but with degraded functionality if the model is unavailable', async () => {
        const options = { ...RED.settings.flowforge.assistant, enabled: true }
        options.got = sinon.stub().rejects(new Error('ECONNREFUSED'))
        options.got.get = options.got // simulate the got module's get method
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

        assistant._loadCompletionsLabels.resetHistory()
        await assistant.init(RED, options)
        // simulate the frontend calling RED.comms.send('nr-assistant/completions/load', {})
        RED.events.emit('comms:message:nr-assistant/completions/load', {})
        // wait long enough for loadCompletions to fail due to the above mocked ECONNREFUSED error
        await sleep(100)
        RED.log.warn.calledWith('FlowFuse Assistant Advanced Completions could not be loaded.').should.be.true()

        assistant.loadCompletions.calledOnce.should.be.true()
        should.not.exist(assistant.labeller)

        // the RED.comms.publish('nr-assistant/completions/ready') should not be called
        RED.comms.publish.calledTwice.should.be.true()
        RED.comms.publish.firstCall.args[0].should.equal('nr-assistant/initialise')
        RED.comms.publish.secondCall.args[0].should.equal('nr-assistant/mcp/ready')
    })
})
