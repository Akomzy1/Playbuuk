// app/page.tsx — Root route smart router
//
// Authenticated users  → redirect to /marketplace (platform marketplace)
// Unauthenticated users → redirect to /home (public landing page)
//
// This keeps the (marketing) and (platform) route groups' page.tsx files from
// conflicting on the "/" URL. Each group owns its canonical path.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Authenticated — go to the platform marketplace
    redirect('/marketplace')
  }

  // Unauthenticated — go to the public marketing landing page
  redirect('/home')
}
