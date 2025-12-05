/**
 * Menu Timers & Availability Logic
 *
 * This module handles time-based menu filtering:
 * - Sushi: Available Tuesday 18:00 to Wednesday 17:00 (can be disabled by admin)
 * - Panini: Hidden on BAR menu before 11:00 (always visible on takeaway/ordina)
 */

import type { Category, MenuItem } from '@shared/types'

// Menu context types
export type MenuContext = 'bar' | 'takeaway' | 'table'

/**
 * Check if current time is within sushi availability window
 * Tuesday 18:00 to Wednesday 17:00
 */
export function isSushiTimeActive(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday
  const hour = now.getHours()

  // Tuesday from 18:00 onwards
  if (day === 2 && hour >= 18) {
    return true
  }

  // Wednesday until 17:00
  if (day === 3 && hour < 17) {
    return true
  }

  return false
}

/**
 * Check if panini should be visible based on current time
 * Panini are hidden before 11:00 on BAR menu
 */
export function isPaniniTimeActive(): boolean {
  const now = new Date()
  const hour = now.getHours()

  // Available from 11:00 onwards
  return hour >= 11
}

/**
 * Check if a category should be visible based on time and context
 *
 * For Sushi: visible only when BOTH timer is active AND category.active is true
 * - Timer window: Tuesday 18:00 to Wednesday 17:00
 * - Admin can disable sushi early by setting category.active = false
 *
 * For Panini: hidden before 11:00 on bar/table, always visible on takeaway
 */
export function isCategoryVisible(
  category: Category,
  context: MenuContext
): boolean {
  const categoryNameLower = category.name.toLowerCase()

  // Sushi categories - must pass BOTH timer check AND be active
  if (categoryNameLower.includes('sushi')) {
    // Category must be active (admin toggle) AND within time window
    // Note: category.active is already checked by the API, but we also check timer
    return category.active && isSushiTimeActive()
  }

  // Panini categories - only apply time restriction on bar and table (QR at counter)
  if (categoryNameLower.includes('panin')) {
    // Takeaway (ordina page) always shows panini
    if (context === 'takeaway') {
      return true
    }
    // Bar and table (QR code at counter) hide panini before 11:00
    return isPaniniTimeActive()
  }

  return true
}

/**
 * Filter categories based on time and context
 * Returns only categories that should be visible
 */
export function filterCategoriesByTime(
  categories: Category[],
  context: MenuContext
): Category[] {
  return categories.filter(category => {
    // Check time-based visibility (includes active check for sushi)
    return isCategoryVisible(category, context)
  })
}

/**
 * Get sushi availability status for admin display
 */
export function getSushiStatus(): {
  isTimeWindow: boolean
  nextWindowStart: Date | null
  nextWindowEnd: Date | null
  statusText: string
} {
  const now = new Date()
  const isActive = isSushiTimeActive()

  // Calculate next Tuesday 18:00
  const nextTuesday = new Date(now)
  const daysUntilTuesday = (2 - now.getDay() + 7) % 7
  nextTuesday.setDate(now.getDate() + (daysUntilTuesday === 0 && now.getHours() >= 18 ? 7 : daysUntilTuesday))
  nextTuesday.setHours(18, 0, 0, 0)

  // Calculate next Wednesday 17:00
  const nextWednesday = new Date(nextTuesday)
  nextWednesday.setDate(nextTuesday.getDate() + 1)
  nextWednesday.setHours(17, 0, 0, 0)

  let statusText: string
  if (isActive) {
    const day = now.getDay()
    if (day === 2) {
      statusText = 'Attivo fino a domani ore 17:00'
    } else {
      statusText = 'Attivo fino alle 17:00'
    }
  } else {
    const day = now.getDay()
    if (day === 2 && now.getHours() < 18) {
      statusText = 'Si attiva oggi alle 18:00'
    } else if (day === 3 && now.getHours() >= 17) {
      statusText = 'Si attiva martedi alle 18:00'
    } else {
      statusText = 'Si attiva martedi alle 18:00'
    }
  }

  return {
    isTimeWindow: isActive,
    nextWindowStart: isActive ? null : nextTuesday,
    nextWindowEnd: isActive ? nextWednesday : null,
    statusText
  }
}

/**
 * Get panini availability status
 */
export function getPaniniStatus(): {
  isAvailable: boolean
  statusText: string
} {
  const isActive = isPaniniTimeActive()
  const now = new Date()

  return {
    isAvailable: isActive,
    statusText: isActive
      ? 'Panini disponibili'
      : `Panini disponibili dalle 11:00 (tra ${11 - now.getHours()} ore)`
  }
}
