/// <reference types="should" />
'use strict'
// eslint-disable-next-line no-unused-vars
const should = require('should')
const sinon = require('sinon')

const auth = require('../../../lib/auth/index.js')

describe('auth callback', () => {
    let callback

    before(() => {
        const routes = {}
        const RED = {
            httpAdmin: {
                get: (path, handler) => { routes[path] = handler },
                post: sinon.stub(),
                use: sinon.stub()
            },
            auth: { needsPermission: () => () => {} }
        }
        auth.setupRoutes({}, RED)
        callback = routes['/nr-assistant/auth/callback']
    })

    async function callError (query) {
        const response = { send: sinon.stub() }
        await callback({ query }, response)
        return response.send.firstCall.args[0]
    }

    function postedMessage (body) {
        const arg = body.match(/postMessage\((.*), '\*'\)/)[1]
        // eslint-disable-next-line no-new-func
        return new Function('return ' + arg)()
    }

    const markup = 'a</script><b>&c'

    it('encodes markup characters in errorDescription', async () => {
        const body = await callError({ error: 'x', errorDescription: markup })
        body.should.not.containEql(markup)
        body.split('</script>').should.have.length(2)
    })

    it('encodes markup characters in error', async () => {
        const body = await callError({ error: markup })
        body.should.not.containEql(markup)
        body.split('</script>').should.have.length(2)
    })

    it('posts the error as a JSON string the editor can parse', async () => {
        const body = await callError({ error: 'x', errorDescription: markup })
        const message = postedMessage(body)
        message.should.be.a.String()
        JSON.parse(message).should.eql({ code: 'flowfuse-auth-error', error: 'x', message: markup })
    })

    it('handles quotes and backslashes in the error', async () => {
        const error = 'x\'y"z\\w'
        const body = await callError({ error })
        JSON.parse(postedMessage(body)).should.have.property('error', error)
    })
})
