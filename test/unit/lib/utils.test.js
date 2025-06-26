/// <reference types="should" />
'use strict'
const should = require('should')
const { tryJsonParse, hasProperty, isObject } = require('../../../lib/utils')

describe('utils.js', function () {
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
})
