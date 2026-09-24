export * from './pricing';
import type { PriceContext } from './pricing';

// Enums
export enum TableStatus {
  AVAILABLE = "AVAILABLE",
  OCCUPIED = "OCCUPIED",
  RESERVED = "RESERVED",
}

export enum OrderStatus {
  PENDING = "PENDING",
  PREPARING = "PREPARING",
  READY = "READY",
  SERVED = "SERVED",
  CANCELLED = "CANCELLED",
}

export enum ConsumeMode {
  DINE_IN = "DINE_IN",
  TAKEAWAY = "TAKEAWAY",
}

export enum OrderType {
  DINE_IN = "DINE_IN",
  TAKEAWAY = "TAKEAWAY",
  COUNTER = "COUNTER", // In-store counter ordering
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
}

// Types
export type MenuType = "CLASSIC" | "SUSHI";

export interface Ingredient {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
  inStock: boolean;
  menuType: MenuType; // CLASSIC o SUSHI - per separare gli stock
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemIngredient {
  id: string;
  menuItemId: string;
  ingredientId: string;
  ingredient?: Ingredient;
  isPrimary: boolean; // Se true, piatto non disponibile quando ingrediente finisce
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  qrCode: string;
  status: TableStatus;
  isCounter: boolean; // true = banco (richiede customerName)
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
  description?: string;
  descriptionEn?: string;
  descriptionFr?: string;
  descriptionEs?: string;
  descriptionHe?: string;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
  items?: MenuItem[];
}

// Ingrediente non disponibile (per mostrare barrato nella descrizione)
export interface UnavailableIngredient {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
  substitute?: {
    id: string;
    name: string;
    nameEn?: string;
    nameFr?: string;
    nameEs?: string;
    nameHe?: string;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
  description?: string;
  descriptionEn?: string;
  descriptionFr?: string;
  descriptionEs?: string;
  descriptionHe?: string;
  price: number; // prezzo consumazione al tavolo (in cents)
  priceTakeaway?: number; // prezzo takeaway in loco/banco (in cents) - se null usa price
  priceTakeawayRemote?: number; // prezzo takeaway da remoto /ordina (in cents) - se null usa priceTakeaway o price
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
  categoryId: string;
  modifierGroups?: ModifierGroup[];
  ingredients?: MenuItemIngredient[]; // Ingredienti del piatto
  unavailableIngredients?: UnavailableIngredient[]; // Ingredienti secondari esauriti (da mostrare barrati)
}

export interface ModifierGroup {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect: number;
  menuItemId: string;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameEs?: string;
  nameHe?: string;
  price: number; // in cents
  available: boolean;
  modifierGroupId: string;
  ingredientId?: string; // Collegamento opzionale a ingrediente
  ingredient?: Ingredient;
}

export interface Order {
  id: string;
  tableId: string;
  table?: Table;
  items: OrderItem[];
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod?: PaymentMethod;
  subtotal: number; // in cents (senza sovrapprezzo)
  surcharge: number; // sovrapprezzo carta in cents
  totalAmount: number; // in cents (totale finale)
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  // Colonna legacy: PartySession e' deprecata (vedi migration 20260113) ma la
  // tabella resta per gli ordini storici che la referenziano.
  partySessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem?: MenuItem;
  quantity: number;
  notes?: string;
  consumeMode: ConsumeMode;
  modifiers?: OrderItemModifier[];
}

export interface OrderItemModifier {
  id: string;
  orderItemId: string;
  modifierId: string;
  modifier?: Modifier;
}

// API Request/Response types
export interface CreateOrderRequest {
  tableId: string;
  tableSessionId?: string; // ID sessione per tavoli uniti
  items: {
    menuItemId: string;
    quantity: number;
    notes?: string;
    modifierIds?: string[];
    consumeMode?: ConsumeMode;
  }[];
  notes?: string;
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
  customerName?: string;
  customerPhone?: string;
  /**
   * Listino usato dal carrello. Senza questo il server ricalcolerebbe tutto
   * sul prezzo base e registrerebbe un totale diverso da quello mostrato.
   */
  priceContext?: PriceContext;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  selectedModifiers: Modifier[];
  consumeMode: ConsumeMode;
}

// Socket events
export interface ServerToClientEvents {
  "order:new": (order: Order) => void;
  "order:updated": (order: Order) => void;
}

export interface ClientToServerEvents {
  "join:kitchen": () => void;
  "join:table": (tableId: string) => void;
}
