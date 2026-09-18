// A fresh Node-RED editor load can show up to two blocking modal dialogs: a telemetry
// opt-in prompt and a first-run welcome tour. A human dismisses these without thinking;
// an automated onboarding session (e.g. FlowFuse Expert writing flows into a brand-new
// instance) has nothing watching to click them away, so they block forever.
//
// The welcome tour is handled here: pre-empt the setting that would have triggered it
// (best case - it never renders), and reactively dismiss it if it's already open
// (fallback - it renders anyway because our pre-empt lost the race against Node-RED's
// own first-run check).
//
// The telemetry dialog is deliberately left alone. FlowFuse-hosted instances already set
// a real `telemetry.enabled` value server-side (nr-launcher), so Node-RED's own check
// never shows it there. On a standalone install where it can show, Node-RED's dialog has
// no neutral dismiss path - `closeButton: false`, no Escape handler, and both of its
// buttons record a permanent telemetryEnabled choice before closing (red.js's
// checkTelemetry). Clicking one on the user's behalf would be answering a privacy
// question for them, not just clearing a nag screen, so if it's ever open it stays open
// for a human to answer.

/**
 * Set `key` to `value` only if it has never been set before, so an already-recorded
 * choice (the user's own, or ours from an earlier call) is never overwritten.
 */
function setDefaultIfUnset (RED, key, value) {
    if (RED.settings.get(key) === undefined) {
        RED.settings.set(key, value)
    }
}

/**
 * Welcome tour dialog (`checkFirstRun` / `RED.tourGuide` in Node-RED core): pre-empt via
 * the existing "Show welcome tours" user setting, and, if the tour is already showing,
 * dismiss it with the same Escape keypress its own popover listens for - the tour's
 * `done` callback then self-heals into a future pre-empt by recording the seen version.
 */
function dismissWelcomeTourDialog (RED) {
    setDefaultIfUnset(RED, 'editor.view.view-show-welcome-tours', false)

    if ($('.red-ui-tourGuide-popover').length) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    }
}

/**
 * Pre-empt and/or reactively dismiss Node-RED's first-run welcome tour dialog. Safe to
 * call repeatedly - every step here is a no-op once the tour has already been dealt
 * with. Deliberately does not touch the telemetry dialog - see the file header.
 * @param {import('node-red').NodeRedInstance} RED
 */
export function dismissOnboardingDialogs (RED) {
    if (!RED || !RED.settings) {
        return
    }
    // This runs ahead of every dispatched action, valid or not - it must never itself be
    // the reason an unrelated action fails, so any error here is swallowed rather than
    // propagated.
    try {
        dismissWelcomeTourDialog(RED)
    } catch (err) {
        console.warn('Failed to dismiss onboarding dialogs', err)
    }
}
