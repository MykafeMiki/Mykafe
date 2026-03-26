/**
 * menuTimers — re-export everything for backward compatibility.
 *
 * Existing imports like:
 *   import { isSushiTimeActive } from '@/lib/menuTimers'
 *   import { fetchClosureConfig } from '@/lib/menuTimers'
 * continue to work if the alias points here, or update them to the specific module.
 */

export * from './config.js'
export * from './availability.js'
export * from './closure.js'
