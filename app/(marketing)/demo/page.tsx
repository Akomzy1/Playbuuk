// app/(marketing)/demo/page.tsx
// Public live demo of the Playbuuk discipline engine.
// No auth required — hardcoded sample playbook, real market simulation.
// Linked in mentor outreach DMs: "See exactly what your strategy would look like."
//
// Uses `dynamic` with ssr:false for the engine component to avoid hydration
// mismatches from the random-walk market simulation.

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Live Demo — See the Playbuuk Discipline Engine',
  description:
    'Watch the trading discipline engine run in real time: auto-detecting checklist, live setup grading (A+ to D+), psychology gate. No login required.',
  keywords: [
    'trading discipline engine demo',
    'trading checklist live demo',
    'setup grade demo',
    'Playbuuk demo',
    'trading psychology tool',
  ],
  openGraph: {
    title: 'Playbuuk — Live Discipline Engine Demo',
    description: 'Auto-detecting checklist. A+ to D+ setup grade. Live market simulation. No login needed.',
    type: 'website',
    siteName: 'Playbuuk',
  },
  twitter: { card: 'summary_large_image' },
}

const DemoEngine = dynamic(
  () => import('./demo-engine').then(m => m.DemoEngine),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: 'var(--accent)' }}
          />
          <p className="text-xs font-mono text-dim">Starting engine…</p>
        </div>
      </div>
    ),
  }
)

export default function DemoPage() {
  return <DemoEngine />
}
