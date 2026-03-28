'use client'

import { useCallback } from 'react'
import { Download, Printer, QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QRCodeSVG } from 'qrcode.react'
import type { Table } from '@shared/types'

export interface QRTabProps {
  tables: Table[]
  t: ReturnType<typeof useTranslations<'admin'>>
  tc: ReturnType<typeof useTranslations<'common'>>
}

export function QRTab({ tables, t, tc }: QRTabProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const realTables = tables.filter(tbl => tbl.qrCode !== 'takeaway')

  const downloadQR = useCallback((elementId: string, filename: string) => {
    const svg = document.getElementById(elementId)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx?.scale(2, 2)
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `${filename}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const printAllQR = useCallback(() => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrCodes: { label: string; url: string }[] = [
      { label: 'Banco / Take Away', url: `${baseUrl}/banco` },
      { label: 'Ordini Online', url: `${baseUrl}/ordina` },
      ...realTables.map(table => ({
        label: `Tavolo ${table.number}`,
        url: `${baseUrl}/menu/${table.qrCode}`
      }))
    ]

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - MyKafe</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .qr-card { text-align: center; padding: 20px; border: 2px solid #e5e7eb; border-radius: 12px; page-break-inside: avoid; }
          .qr-card h3 { margin: 12px 0 4px 0; font-size: 18px; }
          .qr-card p { margin: 0; font-size: 10px; color: #6b7280; word-break: break-all; }
          @media print {
            .grid { grid-template-columns: repeat(3, 1fr); }
            .qr-card { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; margin-bottom: 30px;">MyKafe - QR Codes</h1>
        <div class="grid">
          ${qrCodes.map(qr => `
            <div class="qr-card">
              <svg id="qr-print" width="150" height="150"></svg>
              <h3>${qr.label}</h3>
              <p>${qr.url}</p>
            </div>
          `).join('')}
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
        <script>
          const qrCodes = ${JSON.stringify(qrCodes)};
          const cards = document.querySelectorAll('.qr-card');
          cards.forEach((card, i) => {
            const svg = card.querySelector('svg');
            QRCode.toString(qrCodes[i].url, { type: 'svg', width: 150 }, (err, str) => {
              if (!err) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(str, 'image/svg+xml');
                svg.replaceWith(doc.documentElement);
              }
            });
          });
          setTimeout(() => window.print(), 500);
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }, [baseUrl, realTables])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('qrCodes')}</h2>
        <button
          onClick={printAllQR}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
        >
          <Printer className="w-4 h-4" />
          {t('printAll')}
        </button>
      </div>

      {/* Special QR Codes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">{t('specialQr')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Counter/Banco QR */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border-2 border-primary-200">
            <div className="flex items-start gap-4">
              <div className="w-28 h-28 bg-white rounded-lg flex items-center justify-center shadow-sm p-2">
                <QRCodeSVG
                  id="qr-banco"
                  value={`${baseUrl}/banco`}
                  size={96}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-primary-800">{t('counterTakeaway')}</h4>
                <p className="text-sm text-primary-600 mt-1">
                  {t('counterDescription')}
                </p>
                <p className="text-xs text-primary-500 mt-2 break-all">
                  {baseUrl}/banco
                </p>
                <button
                  onClick={() => downloadQR('qr-banco', 'qr-banco-takeaway')}
                  className="mt-3 text-sm bg-primary-500 text-white px-4 py-1.5 rounded-lg hover:bg-primary-600 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadQr')}
                </button>
              </div>
            </div>
          </div>

          {/* Online Ordering Link */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
            <div className="flex items-start gap-4">
              <div className="w-28 h-28 bg-white rounded-lg flex items-center justify-center shadow-sm p-2">
                <QRCodeSVG
                  id="qr-ordina"
                  value={`${baseUrl}/ordina`}
                  size={96}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-orange-800">{t('onlineOrders')}</h4>
                <p className="text-sm text-orange-600 mt-1">
                  {t('onlineDescription')}
                </p>
                <p className="text-xs text-orange-500 mt-2 break-all">
                  {baseUrl}/ordina
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => downloadQR('qr-ordina', 'qr-ordini-online')}
                    className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('downloadQr')}
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${baseUrl}/ordina`)}
                    className="text-sm bg-orange-200 text-orange-700 px-4 py-1.5 rounded-lg hover:bg-orange-300 transition"
                  >
                    {t('copyLink')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table QR Codes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">{t('tableQrCodes')}</h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="text-sm">
            {t('tableQrNote')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {realTables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl p-6 shadow-sm border text-center"
            >
              <div className="w-36 h-36 mx-auto mb-4 bg-gray-50 rounded-lg flex items-center justify-center p-2">
                <QRCodeSVG
                  id={`qr-table-${table.id}`}
                  value={`${baseUrl}/menu/${table.qrCode}`}
                  size={128}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <h3 className="font-bold text-lg">{tc('table')} {table.number}</h3>
              <p className="text-xs text-gray-400 mt-1 break-all">
                {baseUrl}/menu/{table.qrCode}
              </p>
              <button
                onClick={() => downloadQR(`qr-table-${table.id}`, `qr-tavolo-${table.number}`)}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mx-auto"
              >
                <Download className="w-4 h-4" />
                {t('downloadQr')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
