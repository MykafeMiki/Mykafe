'use client'

import { useEffect } from 'react'

// Rende la pagina inutilizzabile per uscire dal menu: niente zoom/gesti,
// selezione, menu contestuale, pull-to-refresh, tasto indietro; schermo
// sempre acceso. Il blocco vero dell'iPad (uscita dall'app) resta a carico di
// Accesso Guidato / MDM: il web non puo' impedirlo da solo.
export function useKioskLockdown() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const prev = {
      rootOverscroll: root.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      userSelect: body.style.userSelect,
      callout: body.style.getPropertyValue('-webkit-touch-callout'),
      touchAction: body.style.touchAction,
    }

    root.style.overscrollBehavior = 'none'
    body.style.overscrollBehavior = 'none'
    body.style.userSelect = 'none'
    body.style.setProperty('-webkit-touch-callout', 'none')
    body.style.touchAction = 'manipulation'

    const block = (e: Event) => e.preventDefault()
    const blockMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener('contextmenu', block)
    document.addEventListener('gesturestart', block)
    document.addEventListener('gesturechange', block)
    document.addEventListener('dragstart', block)
    document.addEventListener('touchmove', blockMultiTouch, { passive: false })

    // Storia ancorata: indietro/swipe-back non lascia mai la pagina.
    const trap = () => window.history.pushState({ kiosk: true }, '', location.href)
    trap()
    window.addEventListener('popstate', trap)

    let lock: WakeLockSentinel | null = null
    const requestLock = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        lock = null
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') requestLock()
    }
    requestLock()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      root.style.overscrollBehavior = prev.rootOverscroll
      body.style.overscrollBehavior = prev.bodyOverscroll
      body.style.userSelect = prev.userSelect
      body.style.setProperty('-webkit-touch-callout', prev.callout)
      body.style.touchAction = prev.touchAction
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('gesturestart', block)
      document.removeEventListener('gesturechange', block)
      document.removeEventListener('dragstart', block)
      document.removeEventListener('touchmove', blockMultiTouch)
      window.removeEventListener('popstate', trap)
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])
}
