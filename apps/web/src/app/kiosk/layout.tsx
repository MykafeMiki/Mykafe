import type { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/kiosk.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyKafe',
  },
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return children
}
