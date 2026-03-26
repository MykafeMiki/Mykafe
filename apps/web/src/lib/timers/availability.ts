/**
 * Menu Availability Checks
 *
 * Time-based visibility logic for sushi, panini, and takeaway categories.
 */

import type { Category } from '@shared/types'
import { getTimerConfig, type MenuContext, type TimerConfig } from './config.js'
import { DAYS_OF_WEEK } from './config.js'

/**
 * Check if current time is within sushi availability window
 */
export function isSushiTimeActive(): boolean {
  const config = getTimerConfig()

  if (!config.sushi.enabled) {
    return true // Timer disabled → sushi always available (admin uses category.active)
  }

  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const { startDay, startHour, endDay, endHour } = config.sushi

  // Same-day range
  if (startDay === endDay) {
    return day === startDay && hour >= startHour && hour < endHour
  }

  // Cross-day range (e.g., Tuesday 18:00 to Wednesday 17:00)
  if (startDay < endDay) {
    if (day === startDay && hour >= startHour) return true
    if (day === endDay && hour < endHour) return true
    if (day > startDay && day < endDay) return true
  }

  // Wrap-around week (e.g., Saturday to Monday)
  if (startDay > endDay) {
    if (day === startDay && hour >= startHour) return true
    if (day === endDay && hour < endHour) return true
    if (day > startDay || day < endDay) return true
  }

  return false
}

/**
 * Check if panini should be visible based on current time
 */
export function isPaniniTimeActive(): boolean {
  const config = getTimerConfig()

  if (!config.panini.enabled) {
    return true // Timer disabled → panini always visible
  }

  return new Date().getHours() >= config.panini.startHour
}

/**
 * Check if a category should be visible based on time and context.
 *
 * Sushi: visible only when timer is active AND category.active is true.
 * Panini/Toast: hidden before startHour on bar/table context.
 */
export function isCategoryVisible(category: Category, context: MenuContext): boolean {
  const categoryNameLower = category.name.toLowerCase()

  if (categoryNameLower.includes('sushi')) {
    return category.active && isSushiTimeActive()
  }

  const TOAST_CATEGORIES = new Set([
    'panini', 'panino', 'toast', 'bagel',
    'focaccia farcita', 'ciabatte', 'ciabatta',
    'club sandwich', 'piadina', 'piadine',
  ])
  if (TOAST_CATEGORIES.has(categoryNameLower)) {
    if (context === 'takeaway') return true
    return isPaniniTimeActive()
  }

  return true
}

/**
 * Filter categories based on time and context
 */
export function filterCategoriesByTime(categories: Category[], context: MenuContext): Category[] {
  return categories.filter(category => isCategoryVisible(category, context))
}

/**
 * Get sushi availability status for admin display
 */
export function getSushiStatus(): {
  isTimeWindow: boolean
  statusText: string
  config: TimerConfig['sushi']
} {
  const config = getTimerConfig()
  const isActive = isSushiTimeActive()
  const startDayName = DAYS_OF_WEEK.find(d => d.value === config.sushi.startDay)?.label || ''
  const endDayName = DAYS_OF_WEEK.find(d => d.value === config.sushi.endDay)?.label || ''

  let statusText: string
  if (!config.sushi.enabled) {
    statusText = 'Timer disabilitato'
  } else if (isActive) {
    statusText = `Attivo fino a ${endDayName} ore ${config.sushi.endHour}:00`
  } else {
    statusText = `Si attiva ${startDayName} alle ${config.sushi.startHour}:00`
  }

  return { isTimeWindow: isActive, statusText, config: config.sushi }
}

/**
 * Get panini availability status
 */
export function getPaniniStatus(): {
  isAvailable: boolean
  statusText: string
  config: TimerConfig['panini']
} {
  const config = getTimerConfig()
  const isActive = isPaniniTimeActive()
  const now = new Date()

  let statusText: string
  if (!config.panini.enabled) {
    statusText = 'Timer disabilitato - sempre visibili'
  } else if (isActive) {
    statusText = 'Panini disponibili'
  } else {
    const hoursLeft = config.panini.startHour - now.getHours()
    statusText = `Disponibili dalle ${config.panini.startHour}:00 (tra ${hoursLeft} ore)`
  }

  return { isAvailable: isActive, statusText, config: config.panini }
}

/**
 * Get takeaway config shorthand
 */
export function getTakeawayConfig(): TimerConfig['takeaway'] {
  return getTimerConfig().takeaway
}

/**
 * Check if takeaway service is currently available
 */
export function isTakeawayAvailable(): boolean {
  const config = getTimerConfig()
  if (!config.takeaway.enabled) return false

  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  if (config.takeaway.closedDays.includes(currentDay)) return false
  if (currentHour < config.takeaway.openingHour || currentHour >= config.takeaway.closingHour) return false

  return true
}

/**
 * Get takeaway availability status with detailed message
 */
export function getTakeawayStatus(): {
  isAvailable: boolean
  reason: 'disabled' | 'closed_day' | 'outside_hours' | 'available'
  message: string
} {
  const config = getTimerConfig()
  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  if (!config.takeaway.enabled) {
    return { isAvailable: false, reason: 'disabled', message: 'Il servizio takeaway è temporaneamente sospeso.' }
  }

  if (config.takeaway.closedDays.includes(currentDay)) {
    const dayName = DAYS_OF_WEEK.find(d => d.value === currentDay)?.label || ''
    return { isAvailable: false, reason: 'closed_day', message: `Oggi (${dayName}) siamo chiusi. Riprova un altro giorno.` }
  }

  if (currentHour < config.takeaway.openingHour) {
    return { isAvailable: false, reason: 'outside_hours', message: `Gli ordini takeaway aprono alle ${config.takeaway.openingHour.toString().padStart(2, '0')}:00.` }
  }

  if (currentHour >= config.takeaway.closingHour) {
    return { isAvailable: false, reason: 'outside_hours', message: `Gli ordini takeaway chiudono alle ${config.takeaway.closingHour.toString().padStart(2, '0')}:00. Riprova domani!` }
  }

  return { isAvailable: true, reason: 'available', message: '' }
}

/**
 * Get available dates for takeaway pickup (excludes closed days)
 */
export function getAvailableDates(daysAhead = 7): Date[] {
  const config = getTimerConfig()
  const dates: Date[] = []
  const today = new Date()

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    if (!config.takeaway.closedDays.includes(date.getDay())) {
      dates.push(date)
    }
  }

  return dates
}

/**
 * Get available time slots for a specific date
 */
export function getAvailableTimeSlots(date: Date, openingHour: number, closingHour: number): string[] {
  const slots: string[] = []
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const startHour = isToday ? Math.max(openingHour, now.getHours() + 1) : openingHour

  for (let hour = startHour; hour < closingHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    slots.push(`${hour.toString().padStart(2, '0')}:30`)
  }

  return slots
}

/**
 * Check if pickup time is within 30 minutes
 */
export function isPickupWithin30Minutes(date: Date, time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number)
  const pickupTime = new Date(date)
  pickupTime.setHours(hours, minutes, 0, 0)

  const diffMinutes = (pickupTime.getTime() - Date.now()) / (1000 * 60)
  return diffMinutes <= 30 && diffMinutes > 0
}
