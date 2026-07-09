import { fetchApiAuth } from './core'

// ============ REPORTS ============

export interface TopProduct {
  menuItemId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

export interface TopProductsReport {
  period: string
  startDate: string
  endDate: string
  products: TopProduct[]
}

export interface HourlyData {
  hour: number
  orderCount: number
  revenue: number
}

export interface PeakHoursReport {
  period: string
  startDate: string
  endDate: string
  hourlyData: HourlyData[]
  peakHours: number[]
  totalOrders: number
  totalRevenue: number
}

export interface SummaryReport {
  period: string
  startDate: string
  endDate: string
  totalOrders: number
  completedOrders: number
  totalRevenue: number
  totalItems: number
  ordersByType: {
    DINE_IN: number
    TAKEAWAY: number
    COUNTER: number
  }
  averageOrderValue: number
}

export const getTopProducts = async (period: 'week' | 'month' = 'week'): Promise<TopProductsReport> => {
  return fetchApiAuth<TopProductsReport>(`/reports/top-products?period=${period}`)
}

export const getPeakHours = async (period: 'week' | 'month' = 'week'): Promise<PeakHoursReport> => {
  return fetchApiAuth<PeakHoursReport>(`/reports/peak-hours?period=${period}`)
}

export const getSummaryReport = async (period: 'week' | 'month' = 'week'): Promise<SummaryReport> => {
  return fetchApiAuth<SummaryReport>(`/reports/summary?period=${period}`)
}
