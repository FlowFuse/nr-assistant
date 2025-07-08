/// <reference types="should" />
'use strict'
require('should')
const { CompletionsLabeller } = require('../../../../lib/completions/Labeller.js')

describe('CompletionsLabeller', function () {
    const inputFeatureLabels = ['A', 'B', 'C']
    const classifierLabels = ['X', 'Y', 'Z']
    const nodeLabels = ['A', 'B', 'C']
    let labeller

    beforeEach(function () {
        labeller = new CompletionsLabeller({ inputFeatureLabels, classifierLabels, nodeLabels })
    })

    describe('ohe', function () {
        it('should return one-hot encoding for a node', function () {
            labeller.ohe('A').should.deepEqual([1, 0, 0])
            labeller.ohe('B').should.deepEqual([0, 1, 0])
            labeller.ohe('C').should.deepEqual([0, 0, 1])
        })
    })

    describe('countNodes', function () {
        it('should count occurrences of each node label in a sequence', function () {
            const sequence = ['A', 'B', 'A', 'C', 'B', 'A']
            labeller.countNodes(sequence).should.deepEqual([3, 2, 1])
        })
    })

    describe('encode_sequence', function () {
        it('should encode a sequence into a feature vector', function () {
            const sequence = ['A', 'B', 'A', 'C']
            // sequenceLength = 4
            // inputOhe = [1, 0, 0] (A)
            // recentOhe = [0, 0, 1] (C)
            // counts = [2, 1, 1] (A=2, B=1, C=1)
            labeller.encode_sequence(sequence).should.deepEqual([
                4, 1, 0, 0, 0, 0, 1, 2, 1, 1
            ])
        })
    })

    describe('decode_predictions', function () {
        it('should decode predictions into sorted class labels', function () {
            const predictions = new Float32Array([0.27, 0.05, 0.75])
            const result = labeller.decode_predictions(predictions, 2)
            result.should.deepEqual([
                { confidence: predictions[2], classIndex: 2, className: 'Z' },
                { confidence: predictions[0], classIndex: 0, className: 'X' }
            ])
        })
        it('should return all predictions if topN > predictions.length', function () {
            const predictions = new Float32Array([0.3, 0.4, 0.3])
            const result = labeller.decode_predictions(predictions, 5)
            result.length.should.equal(3)
        })
    })
})
