'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  brand: string
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  onBack?: () => void
  backAriaLabel?: string
  rightSlot?: React.ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  brandHref?: string
}

export function AppHeader({
  brand,
  title,
  description,
  icon,
  onBack,
  backAriaLabel = 'Back',
  rightSlot,
  className,
  titleClassName,
  descriptionClassName,
  brandHref = '/',
}: AppHeaderProps) {
  return (
    <header className={cn('bg-primary-500 text-white p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-primary-400 transition"
              aria-label={backAriaLabel}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {icon}
            <h1 className={cn('text-xl font-bold', titleClassName)}>
              <Link href={brandHref} className="hover:underline underline-offset-4">
                {brand}
              </Link>
              {title ? <> - {title}</> : null}
            </h1>
          </div>
        </div>
        {rightSlot}
      </div>
      {description ? (
        <p className={cn('text-primary-100 text-sm mt-1', onBack ? 'ml-10' : '', descriptionClassName)}>
          {description}
        </p>
      ) : null}
    </header>
  )
}

