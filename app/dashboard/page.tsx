"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ConnectDocuments } from "@/components/connect-documents"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/")
    },
  })

  if (status === "loading") {
    return (
      <div className="container mx-auto p-6">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <DashboardHeader userName={session?.user?.name || "Usuario"} />
      {session && <ConnectDocuments />}
    </div>
  )
}

