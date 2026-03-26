/**
 * @deprecated Import direttamente da '@/lib/timers' o dai sottomoduli:
 *   - '@/lib/timers/config'      → TimerConfig, getTimerConfig, saveTimerConfig
 *   - '@/lib/timers/availability' → isSushiTimeActive, isCategoryVisible, ...
 *   - '@/lib/timers/closure'     → ClosureConfig, fetchClosureConfig, ...
 *
 * Questo file esiste solo per compatibilità backward — tutti gli import
 * esistenti tipo `import { X } from '@/lib/menuTimers'` continuano a funzionare.
 */

export * from './timers/index.js'
