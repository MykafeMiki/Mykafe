// ============================================
// PATCH PER ordina/page.tsx - BLOCCO ORDINI QUANDO CHIUSO
// File: apps/web/src/app/ordina/page.tsx
// ============================================

// 1. AGGIUNGI QUESTO IMPORT IN CIMA AL FILE:
import { isOnlineOrderingOpen } from '@/lib/menuTimers'

// 2. AGGIUNGI QUESTO SUBITO DOPO GLI useState NEL COMPONENTE:
const orderingStatus = isOnlineOrderingOpen()

// 3. AGGIUNGI QUESTO BLOCCO PRIMA DEL RETURN PRINCIPALE
//    (dopo i check di loading e error, prima di "if (step === 'datetime')")

// Check if online ordering is closed
if (!orderingStatus.isOpen) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
      <div className="text-center max-w-md">
        {/* Clock Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
          <svg 
            className="w-12 h-12 text-orange-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Ordini Online Non Disponibili
        </h1>
        
        {/* Reason */}
        <p className="text-gray-600 mb-4 text-lg">
          {orderingStatus.reason}
        </p>
        
        {/* Next open time */}
        {orderingStatus.nextOpenTime && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-orange-600 font-medium">
              🕐 Riapriamo {orderingStatus.nextOpenTime}
            </p>
          </div>
        )}
        
        {/* Alternative actions */}
        <div className="space-y-3">
          <a
            href="/"
            className="block w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-medium"
          >
            Torna alla Home
          </a>
          
          <a
            href="tel:+39XXXXXXXXXX" // Sostituisci con numero reale
            className="block w-full px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            📞 Chiama per Informazioni
          </a>
        </div>
        
        {/* Schedule hint */}
        <p className="text-sm text-gray-400 mt-6">
          Per conoscere i nostri orari, visita la pagina principale
        </p>
      </div>
    </div>
  )
}


// ============================================
// ESEMPIO COMPLETO DELLA STRUTTURA DEL FILE
// ============================================

/*
'use client'

import { useState, useEffect, useRef } from 'react'
// ... altri import ...
import { isOnlineOrderingOpen } from '@/lib/menuTimers'

export default function OrdinaPage() {
  // ... useState ...
  
  const orderingStatus = isOnlineOrderingOpen()

  // ... useEffect ...

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{tc('loading')}</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            {tc('retry')}
          </button>
        </div>
      </div>
    )
  }

  // === NUOVO: Check if closed ===
  if (!orderingStatus.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-orange-50 to-white">
        {/* ... closed page content ... */}
      </div>
    )
  }

  // Step 2: Date/Time Selection
  if (step === 'datetime') {
    // ... existing code ...
  }

  // Step 3: Menu
  return (
    // ... existing menu code ...
  )
}
*/
