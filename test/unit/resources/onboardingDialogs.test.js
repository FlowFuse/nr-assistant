/// <reference types="should" />
'use strict'
const should = require('should')
const sinon = require('sinon')

// These tests are for frontend only code.
// Since the tests run in a node Env CI and node versions below 20 do not support ES modules,
// we will skip these FE tests if we detect an older node version that doesn't support ESM.
const [major] = process.versions.node.split('.').map(Number)
let skipTests = false
if (major < 20) {
    console.debug(`Skipping onboardingDialogs frontend tests since Node v${process.versions.node} does not support ES modules! These will be covered in another CI run.`)
    skipTests = true
}

const describeMain = skipTests ? describe.skip : describe

describeMain('onboardingDialogs', function () {
    /** @type {import('../../../resources/onboardingDialogs.js').dismissOnboardingDialogs} */
    let dismissOnboardingDialogs
    let mockRED
    let mockJQuery
    let tourPopover

    function createButtonSet (length) {
        return { length, click: sinon.stub() }
    }

    beforeEach(async () => {
        tourPopover = createButtonSet(0)

        mockJQuery = sinon.stub().callsFake((selector) => {
            if (selector === '.red-ui-tourGuide-popover') {
                return tourPopover
            }
            return createButtonSet(0)
        })

        global.$ = mockJQuery
        global.document = { dispatchEvent: sinon.stub() }
        global.KeyboardEvent = function (type, opts) {
            this.type = type
            Object.assign(this, opts)
        }

        const settingsStore = {}
        mockRED = {
            settings: {
                get: sinon.stub().callsFake((key) => settingsStore[key]),
                set: sinon.stub().callsFake((key, value) => { settingsStore[key] = value })
            }
        }

        const module = await import('../../../resources/onboardingDialogs.js')
        dismissOnboardingDialogs = module.dismissOnboardingDialogs
    })

    afterEach(() => {
        sinon.restore()
        delete global.$
        delete global.document
        delete global.KeyboardEvent
        delete require.cache[require.resolve('../../../resources/onboardingDialogs.js')]
    })

    it('does nothing when RED or RED.settings is missing', () => {
        should(() => dismissOnboardingDialogs(null)).not.throw()
        should(() => dismissOnboardingDialogs({})).not.throw()
    })

    it('pre-empts the welcome tour when it has never been set before', () => {
        dismissOnboardingDialogs(mockRED)
        mockRED.settings.set.calledWith('editor.view.view-show-welcome-tours', false).should.be.true()
    })

    it('does not overwrite an already-recorded welcome tour preference', () => {
        mockRED.settings.get.withArgs('editor.view.view-show-welcome-tours').returns(true)
        dismissOnboardingDialogs(mockRED)
        mockRED.settings.set.calledWith('editor.view.view-show-welcome-tours', sinon.match.any).should.be.false()
    })

    it('is a no-op when the tour is not open', () => {
        should(() => dismissOnboardingDialogs(mockRED)).not.throw()
        global.document.dispatchEvent.called.should.be.false()
    })

    it('reactively dismisses an already-open welcome tour with an Escape keydown', () => {
        tourPopover.length = 1
        dismissOnboardingDialogs(mockRED)
        global.document.dispatchEvent.called.should.be.true()
        const evt = global.document.dispatchEvent.getCall(0).args[0]
        evt.key.should.equal('Escape')
    })

    it('swallows errors so a broken RED.settings interface can never block the caller', () => {
        mockRED.settings.get = sinon.stub().throws(new Error('boom'))
        const warnStub = sinon.stub(console, 'warn')
        should(() => dismissOnboardingDialogs(mockRED)).not.throw()
        warnStub.called.should.be.true()
    })
})
