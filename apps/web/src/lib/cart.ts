"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, Modifier, CartItem, DishChanges, IngredientSubstitution } from "@shared/types";
import { ConsumeMode } from "@shared/types";
import { getItemPrice, type PriceContext } from "./utils";
import { getDishChanges, getDishIngredients } from "./menuDescription";

interface CartStore {
  items: CartItem[];
  tableId: string | null;
  tableSessionId: string | null;
  pickupTime: string | null;
  customerName: string | null;
  priceContext: PriceContext; // contesto prezzo corrente
  lastActivity: number | null; // timestamp of last activity
  setTableId: (tableId: string) => void;
  setTableSessionId: (sessionId: string | null) => void;
  setPickupTime: (time: string | null) => void;
  setCustomerName: (name: string | null) => void;
  setPriceContext: (context: PriceContext) => void;
  addItem: (
    item: MenuItem,
    quantity: number,
    modifiers: Modifier[],
    notes?: string,
    consumeMode?: ConsumeMode,
    changes?: DishChanges
  ) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updateConsumeMode: (index: number, consumeMode: ConsumeMode) => void;
  clearCart: () => void;
  clearAll: () => void; // Clear cart AND table info
  checkAndClearStale: () => void; // Clear if stale (>1 hour)
  getTotal: () => number;
  getItemCount: () => number;
}

const CART_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Cosa va scritto per la cucina su un articolo dell'ordine: i sostituti degli
// ingredienti esauriti e quelli tolti dal cliente (nomi in italiano)
export function kitchenChanges(item: CartItem): {
  substitutions?: IngredientSubstitution[];
  removedIngredients?: string[];
} {
  const changes: { substitutions?: IngredientSubstitution[]; removedIngredients?: string[] } = {};
  if (item.substitutions?.length) changes.substitutions = item.substitutions;
  if (item.removedIngredients?.length) changes.removedIngredients = item.removedIngredients.map((r) => r.name);
  return changes;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      tableSessionId: null,
      pickupTime: null,
      customerName: null,
      priceContext: "dine-in" as PriceContext,
      lastActivity: null,

      setTableId: (tableId) => {
        const state = get();
        // If changing to a different table, clear the cart
        if (state.tableId && state.tableId !== tableId) {
          set({
            items: [],
            tableId,
            tableSessionId: null,
            customerName: null,
            lastActivity: Date.now(),
          });
        } else {
          set({ tableId, lastActivity: Date.now() });
        }
      },
      setTableSessionId: (tableSessionId) => set({ tableSessionId, lastActivity: Date.now() }),
      setPickupTime: (pickupTime) => set({ pickupTime, lastActivity: Date.now() }),
      setCustomerName: (customerName) => set({ customerName, lastActivity: Date.now() }),
      setPriceContext: (priceContext) => set({ priceContext, lastActivity: Date.now() }),

      addItem: (
        menuItem,
        quantity,
        selectedModifiers,
        notes,
        consumeMode = ConsumeMode.DINE_IN,
        // Senza il dettaglio del piatto restano comunque i sostituti degli esauriti
        changes = getDishChanges(getDishIngredients(menuItem, "it"))
      ) => {
        set((state) => ({
          items: [...state.items, { menuItem, quantity, selectedModifiers, notes, consumeMode, ...changes }],
          lastActivity: Date.now(),
        }));
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
          lastActivity: Date.now(),
        }));
      },

      updateQuantity: (index, quantity) => {
        if (quantity <= 0) {
          get().removeItem(index);
          return;
        }
        set((state) => ({
          items: state.items.map((item, i) => (i === index ? { ...item, quantity } : item)),
          lastActivity: Date.now(),
        }));
      },

      updateConsumeMode: (index, consumeMode) => {
        set((state) => ({
          items: state.items.map((item, i) => (i === index ? { ...item, consumeMode } : item)),
          lastActivity: Date.now(),
        }));
      },

      clearCart: () => set({ items: [], lastActivity: Date.now() }),

      clearAll: () =>
        set({
          items: [],
          tableId: null,
          tableSessionId: null,
          pickupTime: null,
          customerName: null,
          priceContext: "dine-in" as PriceContext,
          lastActivity: null,
        }),

      checkAndClearStale: () => {
        const state = get();
        if (state.lastActivity && Date.now() - state.lastActivity > CART_EXPIRY_MS) {
          // Cart is stale, clear everything
          set({
            items: [],
            tableId: null,
            tableSessionId: null,
            pickupTime: null,
            customerName: null,
            priceContext: "dine-in" as PriceContext,
            lastActivity: null,
          });
        }
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => {
          const itemPrice = getItemPrice(item.menuItem, state.priceContext);
          const modifiersPrice = item.selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
          return total + (itemPrice + modifiersPrice) * item.quantity;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "mykafe-cart",
    }
  )
);
