import { fetchApi, fetchApiAuth } from './core'
import type { PartySession, PartyBillResponse } from '@shared/types'

export const createParty = (data: { tableId: string; name?: string }) =>
  fetchApi<PartySession>('/party', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getPartyByCode = (code: string) =>
  fetchApi<PartySession>(`/party/${code}`)

export const joinParty = (code: string, tableId: string) =>
  fetchApi<PartySession>(`/party/${code}/join`, {
    method: 'POST',
    body: JSON.stringify({ tableId }),
  })

export const getPartyBill = (code: string) =>
  fetchApi<PartyBillResponse>(`/party/${code}/bill`)

export const closeParty = (code: string) =>
  fetchApiAuth<PartySession>(`/party/${code}/close`, {
    method: 'PATCH',
  })
