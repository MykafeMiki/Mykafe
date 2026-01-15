'use client'

import { useRef, useState } from 'react'
import { Image as ImageIcon, Upload, Loader2 } from 'lucide-react'

interface ImageUploadInputProps {
  onFileSelect: (file: File) => void
  uploading: boolean
  currentImageUrl?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ImageUploadInput({
  onFileSelect,
  uploading,
  currentImageUrl,
  className = '',
  size = 'md'
}: ImageUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validazione tipo file
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']

      // Su iOS, HEIC potrebbe avere type vuoto
      const isValidType = validTypes.includes(file.type) ||
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)

      if (!isValidType) {
        alert('Formato non supportato. Usa JPG, PNG, GIF o WebP.')
        return
      }

      // Validazione dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Immagine troppo grande. Massimo 5MB.')
        return
      }

      onFileSelect(file)
    }
    // Reset input per permettere re-upload stesso file
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Carica immagine"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={`
          ${sizeClasses[size]}
          rounded-lg overflow-hidden relative
          border-2 border-dashed transition-all
          ${dragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'cursor-wait opacity-70' : 'cursor-pointer'}
          flex items-center justify-center
          group
        `}
      >
        {/* Immagine esistente */}
        {currentImageUrl && !uploading && (
          <img
            src={currentImageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        )}

        {/* Placeholder quando non c'è immagine */}
        {!currentImageUrl && !uploading && (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="w-6 h-6 mb-1" />
            <span className="text-xs">Carica</span>
          </div>
        )}

        {/* Overlay hover */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Upload className="w-6 h-6 text-white" />
          </div>
        )}

        {/* Loading spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        )}
      </button>
    </div>
  )
}

interface SimpleImageUploadProps {
  onFileSelect: (file: File) => void
  uploading: boolean
  buttonText?: string
  uploadingText?: string
}

export function SimpleImageUpload({
  onFileSelect,
  uploading,
  buttonText = 'Carica immagine',
  uploadingText = 'Caricamento...'
}: SimpleImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validazione estesa per iOS
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
      const isValidType = validTypes.includes(file.type) ||
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)

      if (!isValidType) {
        alert('Formato non supportato. Usa JPG, PNG, GIF o WebP.')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Immagine troppo grande. Massimo 5MB.')
        return
      }

      onFileSelect(file)
    }
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Carica immagine"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 transition"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? uploadingText : buttonText}
      </button>
    </>
  )
}
