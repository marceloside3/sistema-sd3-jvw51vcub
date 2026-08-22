/**
 * Global View Transitions for the app's declarative React Router setup.
 *
 * React Router v7's `<BrowserRouter>` (declarative mode) does not expose the
 * `viewTransition` Link prop, so we wrap `history.pushState` / `replaceState`
 * and the `popstate` event ourselves. Each navigation is performed
 * synchronously (so the router/history library stay consistent) and then a
 * `document.startViewTransition()` is started around the React render that
 * follows, producing a smooth cross-fade + slide between screens.
 *
 * Browsers without the View Transitions API are left untouched and fall back
 * to the `.animate-page-enter` CSS animation applied in `AppShell`.
 *
 * Everything is feature-detected and idempotent: navigation always works even
 * if the API misbehaves, because the original history method is invoked first.
 */

type PatchableHistory = History & {
  __vtPatched?: boolean
  __vtActive?: boolean
}

function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' && typeof (document as any).startViewTransition === 'function'
  )
}

const twoAnimationFrames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )

/**
 * Install the global patch. Returns a cleanup function (mainly for HMR).
 * Safe to call multiple times — it no-ops if already installed or unsupported.
 */
export function installViewTransitions(): () => void {
  if (!supportsViewTransitions()) return () => {}

  const h = window.history as PatchableHistory
  if (h.__vtPatched) return () => {}
  h.__vtPatched = true

  const doc = document as any

  // Start a view transition around `cb` (which should await React's commit).
  // `__vtActive` guards against overlapping/nested transitions.
  const start = (cb: () => Promise<void>) => {
    if (h.__vtActive) {
      // A transition is already running — just let React update normally.
      void cb()
      return
    }
    h.__vtActive = true
    let transition: any
    try {
      transition = doc.startViewTransition(cb)
    } catch {
      h.__vtActive = false
      void cb()
      return
    }
    const finished = transition?.finished
    if (finished && typeof finished.then === 'function') {
      finished.then(
        () => {
          h.__vtActive = false
        },
        () => {
          h.__vtActive = false
        },
      )
    } else {
      // Fallback if `finished` is unavailable.
      setTimeout(() => {
        h.__vtActive = false
      }, 800)
    }
  }

  // Wrap push/replace: apply the real call synchronously (keeps the router &
  // history library consistent), then start a transition around React's
  // subsequent render. The old DOM snapshot is captured synchronously here,
  // before the router notifies React, so the "old" page is captured correctly.
  const wrap = (orig: (...args: any[]) => void) =>
    function (this: History, ...args: any[]) {
      orig.apply(this, args)
      start(async () => {
        await twoAnimationFrames()
      })
    }

  const origPush = h.pushState ? h.pushState.bind(h) : undefined
  const origReplace = h.replaceState ? h.replaceState.bind(h) : undefined
  if (origPush) h.pushState = wrap(origPush) as any
  if (origReplace) h.replaceState = wrap(origReplace) as any

  // Back/forward navigation: capture-phase listener so we snapshot the old DOM
  // before React Router's own popstate listener re-renders.
  const onPopState = () =>
    start(async () => {
      await twoAnimationFrames()
    })
  window.addEventListener('popstate', onPopState, true)

  return () => {
    if (origPush) h.pushState = origPush as any
    if (origReplace) h.replaceState = origReplace as any
    window.removeEventListener('popstate', onPopState, true)
    try {
      delete h.__vtPatched
    } catch {
      /* ignore */
    }
  }
}

export function viewTransitionsSupported(): boolean {
  return supportsViewTransitions()
}
