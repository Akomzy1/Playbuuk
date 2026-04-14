// app/(auth)/signup/page.tsx
// Server Component — exports SEO metadata and renders the signup form.
// Form state and Supabase auth calls live in _form.tsx (client component).

import type { Metadata } from 'next'
import { SignupForm } from './_form'

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Sign Up',
  description:
    'Create your free Playbuuk account. Follow top trading mentors, access psychology-enforcing playbooks, auto-detecting checklists, and stop trading on emotion.',
  keywords: [
    'playbuuk signup',
    'trading discipline app',
    'trading psychology platform',
    'trading checklist signup',
    'stop emotional trading',
    'forex trading mentor platform',
    'free trading discipline account',
  ],
  alternates: {
    canonical: '/signup',
  },
  openGraph: {
    title: 'Sign Up — Playbuuk | Stop Trading on Emotion',
    description:
      'Join Playbuuk free. Follow mentors, access auto-grading playbooks, and trade the plan — not the emotion.',
    url: '/signup',
  },
  // Auth pages should not be indexed
  robots: {
    index: false,
    follow: false,
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  return <SignupForm />
}
