import { fetchApi, fetchApiAuth } from './core'
import type { Ingredient } from '@shared/types'

export const getIngredients = () => fetchApi<Ingredient[]>('/ingredients')

export const createIngredient = (data: {
  name: string
  nameEn?: string
  nameFr?: string
  nameEs?: string
  nameHe?: string
  menuType?: string
}) =>
  fetchApiAuth<Ingredient>('/ingredients', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateIngredient = (id: string, data: {
  name?: string
  nameEn?: string
  nameFr?: string
  nameEs?: string
  nameHe?: string
  inStock?: boolean
  menuType?: string
}) =>
  fetchApiAuth<Ingredient>(`/ingredients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const setIngredientStock = (id: string, inStock: boolean) =>
  fetchApiAuth<Ingredient>(`/ingredients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ inStock }),
  })

// ============ MENU ITEM INGREDIENTS ============

export const setMenuItemIngredients = (menuItemId: string, ingredients: { id: string }[]) =>
  fetchApiAuth<{ success: boolean }>(`/menu/items/${menuItemId}/ingredients`, {
    method: 'PUT',
    body: JSON.stringify({ ingredients }),
  })

export const getMenuItemIngredients = (menuItemId: string) =>
  fetchApiAuth<{ ingredientId: string }[]>(`/menu/items/${menuItemId}/ingredients`)
