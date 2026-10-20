/// <reference types="should" />
'use strict'
const should = require('should')
const { tryJsonParse, hasProperty, isObject, summarizeMsg } = require('../../../lib/utils')

describe('utils', function () {
    describe('tryJsonParse', function () {
        it('should parse valid JSON string', function () {
            tryJsonParse('{"a":1}').should.deepEqual({ a: 1 })
        })

        it('should return defaultValue for invalid JSON', function () {
            should(tryJsonParse('not json', 'default')).equal('default')
        })

        it('should return undefined for invalid JSON if no defaultValue is provided', function () {
            should(tryJsonParse('not json')).equal(undefined)
        })

        it('should parse JSON arrays', function () {
            tryJsonParse('[1,2,3]').should.deepEqual([1, 2, 3])
        })

        it('should parse JSON null', function () {
            should(tryJsonParse('null')).equal(null)
        })

        it('should not throw on bad JSON', function () {
            should(() => tryJsonParse('{ inv:alid:json, """')).not.throw()
        })
    })

    describe('isObject', function () {
        it('should return true for plain objects', function () {
            isObject({ a: 1 }).should.be.true()
        })

        it('should return false for arrays', function () {
            isObject([1, 2, 3]).should.be.false()
        })

        it('should return false for null', function () {
            isObject(null).should.be.false()
        })

        it('should return false for strings', function () {
            isObject('string').should.be.false()
        })

        it('should return false for numbers', function () {
            isObject(123).should.be.false()
        })

        it('should return false for functions', function () {
            isObject(function () {}).should.be.false()
        })
    })

    describe('hasProperty', function () {
        it('should return true if object has property', function () {
            hasProperty({ a: 1 }, 'a').should.be.true()
        })

        it('should return false if object does not have property', function () {
            hasProperty({ a: 1 }, 'b').should.be.false()
        })

        it('should return false if not an object', function () {
            hasProperty(null, 'a').should.be.false()
            hasProperty('string', 'a').should.be.false()
            hasProperty([1, 2, 3], 'length').should.be.false()
        })

        it('should return false for inherited properties', function () {
            function Test () {}
            Test.prototype.foo = 123
            hasProperty(new Test(), 'foo').should.be.false()
        })

        it('should return true for own property even if value is undefined', function () {
            hasProperty({ a: undefined }, 'a').should.be.true()
        })
    })

    describe('summarizeMsg', function () {
        it('should record top-level property names and types but no values', function () {
            const msg = { _msgid: 'abc', payload: 42, topic: 'sensors/line1', parts: { index: 0 }, list: [1], nothing: null, flag: true, buf: Buffer.from('x') }
            const summary = summarizeMsg(msg)
            summary.properties.should.eql({ payload: 'number', topic: 'string', parts: 'object', list: 'array', nothing: 'null', flag: 'boolean', buf: 'buffer' })
            summary.topic.should.equal('sensors/line1')
            summary.size.should.equal(Buffer.byteLength(JSON.stringify(msg)))
            should(summary.truncated).be.undefined()
            JSON.stringify(summary).should.not.containEql('index')
        })

        it('should include a numeric topic', function () {
            summarizeMsg({ topic: 7 }).topic.should.equal(7)
        })

        it('should leave out a topic that is not a string or number', function () {
            summarizeMsg({ topic: { secret: 'x' } }).should.not.have.property('topic')
        })

        it('should truncate a long topic to 100 characters', function () {
            summarizeMsg({ topic: 't'.repeat(250) }).topic.should.have.length(100)
        })

        it('should cap the number of properties and flag the truncation', function () {
            const msg = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`p${i}`, i]))
            const summary = summarizeMsg(msg)
            Object.keys(summary.properties).should.have.length(20)
            summary.truncated.should.be.true()
        })

        it('should handle an empty or missing msg', function () {
            summarizeMsg({}).should.eql({ properties: {}, size: 2 })
            summarizeMsg(undefined).properties.should.eql({})
        })

        it('should leave out size when the msg cannot be serialised', function () {
            const msg = { payload: 1 }
            msg.self = msg
            summarizeMsg(msg).should.not.have.property('size')
        })
    })
})
