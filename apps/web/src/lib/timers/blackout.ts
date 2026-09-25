/**
 * Finestra di stop degli ordini online: dal venerdi alle 15:00 al sabato alle 22:30.
 * In quel periodo il locale non accetta ordini e non ne prepara per il ritiro.
 * Stessa regola replicata nell'edge function `orders`, che e' quella che fa fede.
 */

export const BLACKOUT_START = { day: 5, minutes: 15 * 60 }
export const BLACKOUT_END = { day: 6, minutes: 22 * 60 + 30 }

/** day: 0=domenica..6=sabato; minutes: minuti dalla mezzanotte */
export function isBlackoutAt(day: number, minutes: number): boolean {
  if (day === BLACKOUT_START.day) return minutes >= BLACKOUT_START.minutes
  if (day === BLACKOUT_END.day) return minutes < BLACKOUT_END.minutes
  return false
}

/** Giorno e minuti nel fuso italiano, indipendenti dall'orologio del dispositivo */
function romeDayAndMinutes(d: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    day: days.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/** Il momento in cui si sta ordinando cade nella finestra di stop? */
export function isOrderingBlackoutNow(now: Date = new Date()): boolean {
  const { day, minutes } = romeDayAndMinutes(now)
  return isBlackoutAt(day, minutes)
}

/** Un orario di ritiro (ora locale del dispositivo) cade nella finestra di stop? */
export function isPickupInBlackout(pickup: Date): boolean {
  return isBlackoutAt(pickup.getDay(), pickup.getHours() * 60 + pickup.getMinutes())
}
