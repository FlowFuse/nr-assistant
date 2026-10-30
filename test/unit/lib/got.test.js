/// <reference types="should" />
'use strict'
// eslint-disable-next-line no-unused-vars
const should = require('should')
const http = require('node:http')
const sinon = require('sinon')

// These tests use the real `got` module (no injected stub) against a local server, so that a
// change in how `got` is loaded or in the shape of its responses is caught.
describe('got integration', () => {
    /** @type {import('../../../lib/assistant.js')} */
    let assistant
    let server
    let baseUrl
    let lastRequest

    const RED = {
        log: { debug: sinon.stub(), error: sinon.stub(), info: sinon.stub(), warn: sinon.stub() },
        comms: { publish: sinon.stub() }
    }

    before(async () => {
        server = http.createServer((req, res) => {
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', () => {
                lastRequest = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }
                if (req.url === '/vocabulary.json') {
                    res.writeHead(200, { 'content-type': 'application/json' })
                    return res.end(JSON.stringify({ input_features: ['A', 'B'], classifications: ['X'], core_nodes: ['A'] }))
                }
                if (req.url === '/model.onnx') {
                    res.writeHead(200, { 'content-type': 'application/octet-stream' })
                    return res.end(Buffer.from([1, 2, 3, 4]))
                }
                if (req.url === '/fail') {
                    res.writeHead(503, { 'content-type': 'application/json' })
                    return res.end(JSON.stringify({ error: 'unavailable' }))
                }
                res.writeHead(200, { 'content-type': 'application/json' })
                res.end(JSON.stringify({ received: lastRequest.body }))
            })
        })
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
        baseUrl = `http://127.0.0.1:${server.address().port}`
    })

    after(async () => {
        await new Promise(resolve => server.close(resolve))
    })

    beforeEach(async () => {
        delete require.cache[require.resolve('../../../lib/assistant.js')]
        assistant = require('../../../lib/assistant.js')
        // no `got` option, so init loads the real module
        await assistant.init(RED, { enabled: false })
    })

    afterEach(async () => {
        await assistant.dispose()
        sinon.restore()
    })

    it('loads a callable got when none is injected', () => {
        assistant.got.should.be.a.Function()
        assistant.got.post.should.be.a.Function()
    })

    it('loads got with retries disabled', () => {
        assistant.got.defaults.options.retry.limit.should.equal(0)
    })

    it('rejects without an uncaught error when the server cannot be reached', async () => {
        // find a port nothing is listening on
        const closed = http.createServer()
        await new Promise(resolve => closed.listen(0, '127.0.0.1', resolve))
        const port = closed.address().port
        await new Promise(resolve => closed.close(resolve))

        const error = await assistant.got(`http://127.0.0.1:${port}/settings`, { timeout: { request: 2000 } }).then(() => null, e => e)
        should(error).be.ok()
        // give a got retry timer the chance to fire, which would throw an uncaught error
        await new Promise(resolve => setTimeout(resolve, 1500))
    }).timeout(5000)

    it('loads the completions vocabulary as parsed JSON', async () => {
        await assistant._loadCompletionsLabels(`${baseUrl}/vocabulary.json`)
        assistant.labeller.should.be.ok()
    })

    it('loads the completions model as binary data', async () => {
        const create = sinon.stub().resolves({ release: sinon.stub().resolves() })
        assistant._ort = { InferenceSession: { create } }
        await assistant._loadCompletionsModel(`${baseUrl}/model.onnx`)
        create.calledOnce.should.be.true()
        const data = create.firstCall.args[0]
        data.should.be.instanceof(Uint8Array)
        Array.from(data).should.eql([1, 2, 3, 4])
    })

    it('posts a JSON body and returns the response body as a string', async () => {
        const response = await assistant.got.post(`${baseUrl}/post`, {
            headers: { 'Content-Type': 'application/json' },
            json: { hello: 'world' }
        })
        response.statusCode.should.equal(200)
        response.body.should.be.a.String()
        lastRequest.method.should.equal('POST')
        lastRequest.headers['content-type'].should.equal('application/json')
        JSON.parse(JSON.parse(response.body).received).should.eql({ hello: 'world' })
    })

    it('rejects non-2xx responses with the status code and body on the error', async () => {
        const error = await assistant.got(`${baseUrl}/fail`, { retry: { limit: 0 } }).then(() => null, e => e)
        should(error).be.ok()
        error.response.statusCode.should.equal(503)
        JSON.parse(error.response.body).should.eql({ error: 'unavailable' })
    })

    it('loads the auth module without error', () => {
        // auth/index.js requires got at module load
        delete require.cache[require.resolve('../../../lib/auth/index.js')]
        should.doesNotThrow(() => require('../../../lib/auth/index.js'))
    })
})
