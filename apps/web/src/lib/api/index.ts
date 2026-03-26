// Re-export core utilities
export { setAuthToken, getAuthToken, API_URL } from './core'

// Re-export auth functions
export { adminLogin, verifyToken } from './auth'

// Re-export menu functions and types
export {
  getMenu,
  getMenuItem,
  getMenuCached,
  fetchMenuDirect,
  clearMenuCache,
  getMenuISR,
  preloadMenu,
  getAdminCategories,
  createCategory,
  updateCategory,
  createMenuItem,
  updateMenuItem,
  updateItemAvailability,
  addModifierGroup,
  addModifier,
  updateModifier,
  deleteModifier,
  deleteModifierGroup,
  uploadItemImage,
  uploadCategoryImage,
  uploadSectionImage,
  deleteImage,
  type UploadResult,
} from './menu'

// Re-export order functions and types
export {
  getActiveOrders,
  createOrder,
  updateOrderStatus,
  type OrderResponse,
} from './orders'

// Re-export table functions and types
export {
  getTables,
  getTableByQr,
  getTable,
  getTableByQrWithCustomers,
  addCustomerToTable,
  getTableCustomers,
  getTableHost,
  clearTableCustomers,
  updateTableStatus,
  resetTable,
  type TableCustomer,
  type TableWithCustomers,
} from './tables'

// Re-export ingredient functions
export {
  getIngredients,
  createIngredient,
  updateIngredient,
  setIngredientStock,
  setMenuItemIngredients,
  getMenuItemIngredients,
} from './ingredients'

// Re-export party functions
export {
  createParty,
  getPartyByCode,
  joinParty,
  getPartyBill,
  closeParty,
} from './party'

// Re-export table session functions and types
export {
  createTableSession,
  getTableSessionByTable,
  getTableSessionByCode,
  closeTableSession,
  type TableSession,
} from './table-sessions'

// Re-export report functions and types
export {
  getTopProducts,
  getPeakHours,
  getSummaryReport,
  type TopProduct,
  type TopProductsReport,
  type HourlyData,
  type PeakHoursReport,
  type SummaryReport,
} from './reports'

// Re-export cashier functions and types
export {
  getCashierTables,
  getTableOrders,
  payOrder,
  payTable,
  getCashierHistory,
  type TableWithOrders,
  type CashierTablesResponse,
  type TableOrdersResponse,
  type PayTableResponse,
  type CashierHistoryResponse,
} from './cashier'
