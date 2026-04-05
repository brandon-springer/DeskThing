import { useState, useEffect } from 'react'
import QRCodeLib from 'qrcode'

interface QRCodeProps {
  url: string
  size?: number
}

export default function QRCode({ url, size = 200 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setDataUrl)
  }, [url, size])

  if (!dataUrl) return null

  return (
    <div className="bg-white p-4 rounded-lg inline-block">
      <img src={dataUrl} alt="QR Code" width={size} height={size} />
    </div>
  )
}
