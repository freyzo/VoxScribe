import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { TrayInit } from '@/components/tray-init'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: 'VoxScribe - Local AI Voice Dictation',
  description: 'Privacy-first AI voice dictation powered by local models. Real-time speech-to-text with intelligent editing.',
}

export const viewport: Viewport = {
  themeColor: '#352f2b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" style={{ backgroundColor: "#352f2b" }}>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
        style={{ backgroundColor: "var(--background, #352f2b)" }}
      >
        <div
          id="app-loading"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#352f2b",
            color: "oklch(0.90 0.01 70)",
            fontSize: "1rem",
          }}
        >
          Loading VoxScribe…
        </div>
        <div id="app-root"><TrayInit />{children}</div>
      </body>
    </html>
  )
}
