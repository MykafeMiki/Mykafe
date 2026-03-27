/**
 * NEW FILE: apps/web/src/components/menu/MenuSkeleton.tsx
 * 
 * Skeleton loader per il menu - migliora UX percepita
 */

'use client'

export function MenuSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Category tabs skeleton */}
      <div className="sticky top-0 bg-white z-10 border-b">
        <div className="flex gap-2 p-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-gray-200 rounded-full flex-shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Menu items skeleton */}
      <div className="p-4 space-y-6">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            {/* Section title */}
            <div className="h-6 w-32 bg-gray-200 rounded" />

            {/* Items */}
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex gap-4 p-4 bg-white rounded-xl shadow-sm"
                >
                  {/* Image placeholder */}
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-gray-200 rounded" />
                    <div className="h-4 w-full bg-gray-100 rounded" />
                    <div className="h-4 w-1/2 bg-gray-100 rounded" />
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-5 w-16 bg-gray-200 rounded" />
                      <div className="h-8 w-8 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Compact skeleton for section grid
export function SectionGridSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6 mx-auto" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded-2xl"
          />
        ))}
      </div>
    </div>
  )
}

// Single item skeleton (for lazy loading)
export function MenuItemSkeleton() {
  return (
    <div className="animate-pulse flex gap-4 p-4 bg-white rounded-xl shadow-sm">
      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
