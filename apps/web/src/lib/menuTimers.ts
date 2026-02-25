/**
 * Menu Timers & Availability Logic
 *
 * This module handles time-based menu filtering:
 * - Sushi: Configurable days and hours (default: Tuesday 18:00 to Wednesday 17:00)
 * - Panini: Hidden on BAR menu before configurable hour (default: 11:00)
 *
 * Configuration is stored in localStorage and can be modified by admin
 */

import type { Category } from '@shared/types'

// Menu context types
export type MenuContext = 'bar' | 'takeaway' | 'table'

// Day names for UI
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedi' },
  { value: 2, label: 'Martedi' },
  { value: 3, label: 'Mercoledi' },
  { value: 4, label: 'Giovedi' },
  { value: 5, label: 'Venerdi' },
  { value: 6, label: 'Sabato' },
]

// Timer configuration interface
export interface TimerConfig {
  sushi: {
    enabled: boolean
    startDay: number // 0-6 (Sunday-Saturday)
    startHour: number // 0-23
    endDay: number // 0-6
    endHour: number // 0-23
  }
  panini: {
    enabled: boolean
    startHour: number // Hour from which panini are visible (default 11)
  }
  takeaway: {
    enabled: boolean // Toggle to enable/disable takeaway completely
    openingHour: number // Earliest pickup hour (default 11)
    closingHour: number // Latest pickup hour (default 20)
    closedDays: number[] // Array of day numbers (0-6) when restaurant is closed
  }
}

// Default configuration
const DEFAULT_CONFIG: TimerConfig = {
  sushi: {
    enabled: true,
    startDay: 2, // Tuesday
    startHour: 18, // 18:00
    endDay: 3, // Wednesday
    endHour: 17, // 17:00
  },
  panini: {
    enabled: true,
    startHour: 11, // 11:00
  },
  takeaway: {
    enabled: true, // Takeaway enabled by default
    openingHour: 11, // Pickup from 11:00
    closingHour: 20, // Until 20:00
    closedDays: [], // No closed days by default
  },
}

const CONFIG_STORAGE_KEY = 'mykafe-timer-config'

/**
 * Get timer configuration from localStorage
 */
export function getTimerConfig(): TimerConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG
  }

  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to ensure all fields exist
      return {
        sushi: { ...DEFAULT_CONFIG.sushi, ...parsed.sushi },
        panini: { ...DEFAULT_CONFIG.panini, ...parsed.panini },
        takeaway: {
          ...DEFAULT_CONFIG.takeaway,
          ...parsed.takeaway,
          // Ensure closedDays is always an array
          closedDays: Array.isArray(parsed.takeaway?.closedDays)
            ? parsed.takeaway.closedDays
            : DEFAULT_CONFIG.takeaway.closedDays
        },
      }
    }
  } catch (e) {
    console.error('Error reading timer config:', e)
  }

  return DEFAULT_CONFIG
}

/**
 * Save timer configuration to localStorage
 */
export function saveTimerConfig(config: TimerConfig): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Error saving timer config:', e)
  }
}

/**
 * Check if current time is within sushi availability window
 */
export function isSushiTimeActive(): boolean {
  const config = getTimerConfig()

  if (!config.sushi.enabled) {
    return true // If timer disabled, sushi always available (controlled by category.active)
  }

  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours()

  const { startDay, startHour, endDay, endHour } = config.sushi

  // Same day range
  if (startDay === endDay) {
    return day === startDay && hour >= startHour && hour < endHour
  }

  // Cross-day range (e.g., Tuesday 18:00 to Wednesday 17:00)
  if (startDay < endDay) {
    // Start day from startHour onwards
    if (day === startDay && hour >= startHour) {
      return true
    }
    // End day until endHour
    if (day === endDay && hour < endHour) {
      return true
    }
    // Days in between (if any)
    if (day > startDay && day < endDay) {
      return true
    }
  }

  // Wrap around week (e.g., Saturday to Monday)
  if (startDay > endDay) {
    if (day === startDay && hour >= startHour) {
      return true
    }
    if (day === endDay && hour < endHour) {
      return true
    }
    if (day > startDay || day < endDay) {
      return true
    }
  }

  return false
}

/**
 * Check if panini should be visible based on current time
 */
export function isPaniniTimeActive(): boolean {
  const config = getTimerConfig()

  if (!config.panini.enabled) {
    return true // If timer disabled, panini always available
  }

  const now = new Date()
  const hour = now.getHours()

  return hour >= config.panini.startHour
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

  return {
    isTimeWindow: isActive,
    statusText,
    config: config.sushi
  }
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

  return {
    isAvailable: isActive,
    statusText,
    config: config.panini
  }
}

/**
 * Get takeaway pickup hours config
 */
export function getTakeawayConfig(): TimerConfig['takeaway'] {
  const config = getTimerConfig()
  return config.takeaway
}

/**
 * Check if takeaway service is currently available
 */
export function isTakeawayAvailable(): boolean {
  const config = getTimerConfig()

  if (!config.takeaway.enabled) {
    return false
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  if (config.takeaway.closedDays.includes(currentDay)) {
    return false
  }

  if (currentHour < config.takeaway.openingHour || currentHour >= config.takeaway.closingHour) {
    return false
  }

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
    return {
      isAvailable: false,
      reason: 'disabled',
      message: 'Il servizio takeaway è temporaneamente sospeso.'
    }
  }

  if (config.takeaway.closedDays.includes(currentDay)) {
    const dayName = DAYS_OF_WEEK.find(d => d.value === currentDay)?.label || ''
    return {
      isAvailable: false,
      reason: 'closed_day',
      message: `Oggi (${dayName}) siamo chiusi. Riprova un altro giorno.`
    }
  }

  if (currentHour < config.takeaway.openingHour) {
    return {
      isAvailable: false,
      reason: 'outside_hours',
      message: `Gli ordini takeaway aprono alle ${config.takeaway.openingHour.toString().padStart(2, '0')}:00.`
    }
  }

  if (currentHour >= config.takeaway.closingHour) {
    return {
      isAvailable: false,
      reason: 'outside_hours',
      message: `Gli ordini takeaway chiudono alle ${config.takeaway.closingHour.toString().padStart(2, '0')}:00. Riprova domani!`
    }
  }

  return {
    isAvailable: true,
    reason: 'available',
    message: ''
  }
}

/**
 * Get available dates for takeaway pickup (excludes closed days)
 */
export function getAvailableDates(daysAhead: number = 7): Date[] {
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
export function getAvailableTimeSlots(
  date: Date,
  openingHour: number,
  closingHour: number
): string[] {
  const slots: string[] = []
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  let startHour = openingHour
  if (isToday) {
    startHour = Math.max(openingHour, now.getHours() + 1)
  }

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

  const now = new Date()
  const diffMs = pickupTime.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)

  return diffMinutes <= 30 && diffMinutes > 0
}

// ============================================
// CLOSURE SCHEDULE - Calendario Chiusure
// ============================================

export interface DaySchedule {
  enabled: boolean      // Se il giorno è abilitato per ordini online
  openHour: number      // Ora apertura (0-23)
  openMinute: number    // Minuto apertura (0, 15, 30, 45)
  closeHour: number     // Ora chiusura (0-23)
  closeMinute: number   // Minuto chiusura (0, 15, 30, 45)
}

export interface ClosureConfig {
  enabled: boolean                       // Master switch per abilitare/disabilitare tutto
  schedule: Record<number, DaySchedule>  // 0=Domenica, 1=Lunedi, ... 6=Sabato
  temporaryClosure: {
    active: boolean
    until?: string  // ISO date string
    message?: string
  }
}

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: true,
  openHour: 11,
  openMinute: 0,
  closeHour: 21,
  closeMinute: 0
}

export const DEFAULT_CLOSURE_CONFIG: ClosureConfig = {
  enabled: true,
  schedule: {
    0: { ...DEFAULT_DAY_SCHEDULE, enabled: false }, // Domenica chiuso
    1: { ...DEFAULT_DAY_SCHEDULE }, // Lunedi
    2: { ...DEFAULT_DAY_SCHEDULE }, // Martedi
    3: { ...DEFAULT_DAY_SCHEDULE }, // Mercoledi
    4: { ...DEFAULT_DAY_SCHEDULE }, // Giovedi
    5: { ...DEFAULT_DAY_SCHEDULE }, // Venerdi
    6: { ...DEFAULT_DAY_SCHEDULE }, // Sabato
  },
  temporaryClosure: {
    active: false
  }
}

/**
 * Fetch closure configuration from server
 */
export async function fetchClosureConfig(): Promise<ClosureConfig> {
  try {
    const res = await fetch('/api/settings/closure', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      enabled: data.enabled ?? true,
      schedule: { ...DEFAULT_CLOSURE_CONFIG.schedule, ...data.schedule },
      temporaryClosure: { ...DEFAULT_CLOSURE_CONFIG.temporaryClosure, ...data.temporaryClosure }
    }
  } catch (e) {
    console.error('Error fetching closure config:', e)
    return DEFAULT_CLOSURE_CONFIG
  }
}

/**
 * Save closure configuration to server
 */
export async function saveClosureConfigToServer(config: ClosureConfig): Promise<void> {
  const res = await fetch('/api/settings/closure', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
}

/**
 * Check if online ordering is currently available
 */
export function isOnlineOrderingOpen(config: ClosureConfig): {
  isOpen: boolean
  reason?: string
  nextOpenTime?: string
} {
  // Master switch off
  if (!config.enabled) {
    return { isOpen: false, reason: 'Menu online disabilitato' }
  }

  // Temporary closure active
  if (config.temporaryClosure.active) {
    if (config.temporaryClosure.until) {
      const untilDate = new Date(config.temporaryClosure.until)
      if (new Date() < untilDate) {
        return {
          isOpen: false,
          reason: config.temporaryClosure.message || 'Chiusura temporanea',
          nextOpenTime: new Date(config.temporaryClosure.until).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      }
      // Chiusura scaduta, ignora
      config.temporaryClosure.active = false
    } else {
      return {
        isOpen: false,
        reason: config.temporaryClosure.message || 'Chiusura temporanea'
      }
    }
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const todaySchedule = config.schedule[dayOfWeek] ?? DEFAULT_CLOSURE_CONFIG.schedule[dayOfWeek]

  // Day not enabled (closed)
  if (!todaySchedule?.enabled) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule?.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return {
          isOpen: false,
          reason: 'Chiuso oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  const openTime = todaySchedule.openHour * 60 + todaySchedule.openMinute
  const closeTime = todaySchedule.closeHour * 60 + todaySchedule.closeMinute

  // Before opening time
  if (currentTime < openTime) {
    return {
      isOpen: false,
      reason: 'Non ancora aperto',
      nextOpenTime: `oggi alle ${todaySchedule.openHour.toString().padStart(2, '0')}:${todaySchedule.openMinute.toString().padStart(2, '0')}`
    }
  }

  // After closing time
  if (currentTime >= closeTime) {
    // Find next open time
    for (let i = 1; i <= 7; i++) {
      const nextDay = (dayOfWeek + i) % 7
      const nextSchedule = config.schedule[nextDay]
      if (nextSchedule?.enabled) {
        const dayName = DAYS_OF_WEEK.find(d => d.value === nextDay)?.label || ''
        return {
          isOpen: false,
          reason: 'Chiuso per oggi',
          nextOpenTime: `${dayName} alle ${nextSchedule.openHour.toString().padStart(2, '0')}:${nextSchedule.openMinute.toString().padStart(2, '0')}`
        }
      }
    }
    return { isOpen: false, reason: 'Chiuso' }
  }

  // Currently open!
  return { isOpen: true }
}

/**
 * Get formatted schedule for display
 */
export function getFormattedSchedule(config: ClosureConfig): { day: string, schedule: string }[] {
  return DAYS_OF_WEEK.map(day => {
    const daySchedule = config.schedule[day.value]

    if (!daySchedule.enabled) {
      return { day: day.label, schedule: 'Chiuso' }
    }

    const open = `${daySchedule.openHour.toString().padStart(2, '0')}:${daySchedule.openMinute.toString().padStart(2, '0')}`
    const close = `${daySchedule.closeHour.toString().padStart(2, '0')}:${daySchedule.closeMinute.toString().padStart(2, '0')}`

    return { day: day.label, schedule: `${open} - ${close}` }
  })
}
