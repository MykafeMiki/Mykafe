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
  price?: number | null; // prezzo come aggiunta in cents, inserito a mano
  categoryIds?: string[]; // categorie del menu in cui l'ingrediente e' ammesso
  hideDishes?: boolean; // se true, i piatti con questo ingrediente spariscono dal menu
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
  // Voci del piatto che sono altri ingredienti col nome simile (normalizzate):
  // con il Pomodoro esaurito i "Pomodorini ciliegia" restano
  similarNames?: string[];
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
  priceTakeawayRemote?: number; // prezzo takeaway da remoto /ordina, alla consegna (in cents) - se null usa priceTakeaway o price
  priceTakeawayCard?: number; // prezzo takeaway da remoto /ordina, con carta (in cents) - se null usa priceTakeawayRemote + 3%
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

// Ingrediente esaurito e il sostituto servito al suo posto (nomi in italiano,
// per scontrino e schermo cucina)
export interface IngredientSubstitution {
  from: string;
  to: string;
}

// Ingrediente tolto dal cliente: in italiano per la cucina, e come l'ha visto lui
export interface RemovedIngredient {
  name: string;
  label: string;
}

// Cambi alla ricetta scelti nel dettaglio del piatto
export interface DishChanges {
  substitutions?: IngredientSubstitution[];
  removedIngredients?: RemovedIngredient[];
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
  substitutions?: IngredientSubstitution[] | null;
  removedIngredients?: string[] | null; // nomi in italiano
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
    substitutions?: IngredientSubstitution[];
    removedIngredients?: string[]; // nomi in italiano
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

export interface CartItem extends DishChanges {
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
