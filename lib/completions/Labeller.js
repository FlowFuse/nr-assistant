class CompletionsLabeller {
    constructor ({ inputFeatureLabels, classifierLabels, nodeLabels }) {
        this.inputFeatureLabels = inputFeatureLabels
        this.classifierLabels = classifierLabels
        this.nodeLabels = nodeLabels
    }

    ohe (node) {
        return this.inputFeatureLabels.map(cat => (cat === node ? 1 : 0))
    }

    countNodes (sequence) {
        return this.nodeLabels.map(cat => sequence.filter(n => n === cat).length)
    }

    /**
     * Encode a sequence of nodes into a feature vector.
     * @param {string[]} userInput - Array of node type names.
     * @returns {number[]} Encoded feature vector.
     */
    encode_sequence (userInput) {
        const inputNode = userInput[0]
        const recentNode = userInput[userInput.length - 1]
        const sequenceLength = userInput.length

        const inputOhe = this.ohe(inputNode)
        const recentOhe = this.ohe(recentNode)
        const counts = this.countNodes(userInput)

        // Concatenate all features (order must match training)
        // [sequence_length, ...input_ohe, ...recent_ohe, ...counts]
        return [
            sequenceLength,
            ...inputOhe,
            ...recentOhe,
            ...counts
        ]
    }

    /**
     * Decode model predictions into human-readable labels.
     * @param {Float32Array} predictions - Array of model predictions (probabilities).
     * @param {number} [topN=5] - Number of top predictions to return.
     * @returns {{ className: string, confidence: number, classIndex: number }[]}
     */
    decode_predictions (predictions, topN = 5) {
        return [...predictions]
            .map((confidence, classIndex) => {
                return { confidence, classIndex, className: this.classifierLabels[classIndex] }
            }).sort((a, b) => b.confidence - a.confidence)
            .slice(0, topN) // Get top N predictions
    }
}

module.exports.CompletionsLabeller = CompletionsLabeller
module.exports.default = CompletionsLabeller
