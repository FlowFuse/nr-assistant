export class RedOps {
    RED = null

    init (RED) {
        this.RED = RED
    }

    /// Function extracted from Node-RED source `editor-client/src/js/ui/clipboard.js`
    /**
     * Validates if the provided string looks like valid flow json
     * @param {string} flowString the string to validate
     * @returns If valid, returns the node array
     */
    validateFlowString (flowString) {
        const res = JSON.parse(flowString)
        if (!Array.isArray(res)) {
            throw new Error(this.RED._('clipboard.import.errors.notArray'))
        }
        for (let i = 0; i < res.length; i++) {
            if (typeof res[i] !== 'object') {
                throw new Error(this.RED._('clipboard.import.errors.itemNotObject', { index: i }))
            }
            if (!Object.hasOwn(res[i], 'id')) {
                throw new Error(this.RED._('clipboard.import.errors.missingId', { index: i }))
            }
            if (!Object.hasOwn(res[i], 'type')) {
                throw new Error(this.RED._('clipboard.import.errors.missingType', { index: i }))
            }
        }
        return res
    }

    /**
     * Invokes a Node-RED action by ID with the provided data.
     * @param {String} action - The action ID to invoke, e.g. 'core:add-flows'
     * @param {*} actionData - Data to pass to the action, e.g. { flow: [...] }
     */
    invoke (action, actionData) {
        if (!this.RED) {
            throw new Error('RedOps is not initialized with RED instance')
        }
        this.RED.actions.invoke(action, actionData)
    }

    /**
     * Invokes a Node-RED action and waits for a specific event to occur before resolving.
     * The event can be validated with an optional resolveValidator function to ensure it is the expected response for the action.
     * Event data (if any) will be returned when the promise resolves.
     * @param {string} action - The action ID to invoke.
     * @param {object} actionData - Data to pass to the action.
     * @param {string} event - The event name to listen for.
     * @param {object} [options] - Options for the invocation.
     * @param {number} [options.timeout] - Max time to wait in milliseconds (default 2s).
     * @param {function} [options.resolveValidator] - Optional function to validate that the event/eventData is ours before resolving.
     * @returns {Promise<any>} Resolves with eventData.
     */
    async invokeActionAndWait (action, actionData, event, { timeout = 2000, resolveValidator = null } = {}) {
        const command = () => {
            this.invoke(action, actionData)
        }
        return this.commandAndWait(command, event, { timeout, resolveValidator })
    }

    /**
     * Run a command then wait for a specific event response to occur before resolving.
     * The event can be validated with an optional resolveValidator function to ensure it is the expected response for the command.
     * Event data (if any) will be returned when the promise resolves.
     * @param {function} command - The command function to execute.
     * @param {string} event - The event name to listen for.
     * @param {object} [options] - Options for the invocation.
     * @param {number} [options.timeout] - Max time to wait in milliseconds (default 2s).
     * @param {function} [options.resolveValidator] - Optional function to validate that the event/eventData is ours before resolving.
     * @returns {Promise<any>} Resolves with eventData.
     */
    async commandAndWait (command, event, { timeout = 2000, resolveValidator = null } = {}) {
        if (!this.RED) {
            throw new Error('RedOps is not initialized with RED instance')
        }
        resolveValidator = resolveValidator || ((data) => true)
        return new Promise((resolve, reject) => {
            let timer = null

            // 1. Define handler
            const handler = (eventData) => {
                if (resolveValidator(eventData)) {
                    clearTimeout(timer)
                    this.RED.events.off(event, handler) // Clean up listener
                    resolve(eventData)
                }
            }

            // 2. Monitor for timeout
            timer = setTimeout(() => {
                this.RED.events.off(event, handler) // Clean up listener
                reject(new Error(`Timeout waiting for event '${event}'`))
            }, timeout)

            // 3. Listen for response
            this.RED.events.on(event, handler)

            // 4. Trigger command
            try {
                command()
            } catch (err) {
                clearTimeout(timer)
                this.RED.events.off(event, handler)
                reject(err)
            }
        })
    }
}
