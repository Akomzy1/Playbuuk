'use client'
// app/(marketing)/_faq.tsx — FAQ accordion
// Client component for interactive open/close. Each item renders its full answer
// in the DOM (not display:none) so search engines and AI crawlers index all text.

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  q: string
  a: React.ReactNode
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            className="rounded-2xl overflow-hidden transition-all duration-200"
            style={{
              background: isOpen ? 'var(--card)' : 'var(--surface)',
              border: `1px solid ${isOpen ? 'rgba(0,229,176,0.2)' : 'rgba(26,40,69,0.8)'}`,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${i}`}
              id={`faq-question-${i}`}
            >
              <span
                className="text-sm font-semibold pr-4 leading-snug"
                style={{ color: isOpen ? 'var(--text)' : '#a8b8d4' }}
              >
                {item.q}
              </span>
              <ChevronDown
                size={15}
                aria-hidden="true"
                className="flex-shrink-0 transition-transform duration-200"
                style={{
                  color: isOpen ? 'var(--accent)' : '#3d5078',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Answer — always in DOM for SEO; hidden via height transition */}
            <div
              id={`faq-answer-${i}`}
              role="region"
              aria-labelledby={`faq-question-${i}`}
              style={{
                maxHeight: isOpen ? '600px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
              }}
            >
              <div
                className="px-5 pb-5 text-sm leading-relaxed"
                style={{ color: '#8a9bc0' }}
              >
                {item.a}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
