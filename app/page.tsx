"use client"

import  Bill from "@/app/components/Bill"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Billing System</h1>
        <Bill/>
      </div>
    </main>
  )
}