/// <reference types="should" />
'use strict'

const should = require('should')
const settings = require('../../lib/settings')

describe('settings', function () {
    let RED

    beforeEach(function () {
        RED = { settings: { flowforge: {} } }
    })

    describe('getSettings', function () {
        it('should be disabled if assistant is not enabled', function () {
            RED.settings.flowforge.assistant = { enabled: false }
            const result = settings.getSettings(RED)
            result.enabled.should.be.false()
        })

        it('should be enabled with defaults', function () {
            RED.settings.flowforge.assistant = { enabled: true }
            const result = settings.getSettings(RED)
            result.enabled.should.be.true()
            result.completions.should.be.an.Object()
            result.completions.enabled.should.be.true()
            should(result.completions.modelUrl).be.null()
            should(result.completions.vocabularyUrl).be.null()
        })

        it('should preserve completions if provided and enabled', function () {
            RED.settings.flowforge.assistant = {
                enabled: true,
                completions: {
                    enabled: false,
                    modelUrl: 'http://model',
                    vocabularyUrl: 'http://vocab'
                }
            }
            const result = settings.getSettings(RED)
            result.completions.enabled.should.be.false()
            result.completions.modelUrl.should.equal('http://model')
            result.completions.vocabularyUrl.should.equal('http://vocab')
        })

        it('should set tables.enabled true if tables token exists', function () {
            RED.settings.flowforge.tables = { token: 'abc' }
            RED.settings.flowforge.assistant = { enabled: true }
            const result = settings.getSettings(RED)
            result.tables.enabled.should.be.true()
        })

        it('should set mcp.enabled true by default', function () {
            RED.settings.flowforge.assistant = { enabled: true }
            const result = settings.getSettings(RED)
            result.mcp.should.be.an.Object()
            result.mcp.enabled.should.be.true()
        })

        it('should not throw if flowforge or assistant is missing', function () {
            RED = { settings: {} }
            const result = settings.getSettings(RED)
            result.enabled.should.be.false()
        })
    })
})
