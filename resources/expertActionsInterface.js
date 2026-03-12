// abstract class for other classes to implement invokable actions
export class ExpertActionsInterface {
    /** @type {import('node-red').NodeRedInstance} - Node RED client API */
    RED = null
    /** @type {import('./expertComms.js').ExpertComms} - Owner Instance for comms to Expert */
    expertComms = null

    init (expertComms, RED) {
        this.expertComms = expertComms
        this.RED = RED
    }

    get supportedActions () {
        throw new Error('supportedActions getter not implemented')
    }

    hasAction (actionName) {
        throw new Error('hasAction method not implemented')
    }

    invokeAction (actionName, { event, params } = {}, result = {}) {
        throw new Error('invokeAction method not implemented')
    }
}
