// ============================================
// PATCH PER ItemModal.tsx - AGGIUNGERE FOTO
// File: apps/web/src/components/menu/ItemModal.tsx
// ============================================

// 1. AGGIUNGI QUESTO IMPORT IN CIMA AL FILE:
import Image from 'next/image'

// 2. TROVA QUESTO BLOCCO (circa riga 60-75):
/*
{/* Header *}
<div className="flex items-center justify-between p-4 border-b">
  <h2 className="text-lg font-bold text-gray-900">{translatedName}</h2>
  <button
    onClick={onClose}
    className="p-2 rounded-full hover:bg-gray-100 transition"
  >
    <X className="w-5 h-5" />
  </button>
</div>
*/

// 3. SOSTITUISCI CON QUESTO:

        {/* Image Header (se presente) */}
        {item.imageUrl && (
          <div className="relative w-full h-52 bg-gray-100 flex-shrink-0">
            <Image
              src={item.imageUrl}
              alt={translatedName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            {/* Close button overlay */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition shadow-lg"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{translatedName}</h2>
            {/* Prezzo base sotto il nome */}
            <p className="text-primary-600 font-semibold mt-0.5">
              {formatPrice(baseItemPrice)}
            </p>
          </div>
          {/* Close button solo se non c'è immagine */}
          {!item.imageUrl && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>


// ============================================
// CODICE COMPLETO DELLA PARTE SUPERIORE DEL MODAL (per riferimento)
// ============================================

/*
export function ItemModal({ item, onClose, onAdd, defaultConsumeMode = ConsumeMode.DINE_IN, priceMultiplier = 1, priceContext = 'dine-in', hideConsumeModeSelector = false }: ItemModalProps) {
  const locale = useLocale()
  const t = useTranslations('menuItem')
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Modifier[]>>({})
  const [notes, setNotes] = useState('')
  const [consumeMode, setConsumeMode] = useState<ConsumeMode>(defaultConsumeMode)

  const translatedName = getTranslatedName(item, locale)
  const translatedDescription = getTranslatedDescription(item, locale)
  const baseItemPrice = getItemPrice(item, priceContext)

  // ... resto delle funzioni ...

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        
        {/* === NUOVA SEZIONE IMMAGINE === */}
        {item.imageUrl && (
          <div className="relative w-full h-52 bg-gray-100 flex-shrink-0">
            <Image
              src={item.imageUrl}
              alt={translatedName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition shadow-lg"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        )}

        {/* === HEADER AGGIORNATO === */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{translatedName}</h2>
            <p className="text-primary-600 font-semibold mt-0.5">
              {formatPrice(baseItemPrice)}
            </p>
          </div>
          {!item.imageUrl && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content - resto del modal invariato */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {translatedDescription && (
            <p className="text-gray-600">{translatedDescription}</p>
          )}
          
          {/* ... resto del contenuto ... */}
        </div>
      </div>
    </div>
  )
}
*/
