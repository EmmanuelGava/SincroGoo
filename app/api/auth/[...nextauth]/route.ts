import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Usar la configuración centralizada de authOptions
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

