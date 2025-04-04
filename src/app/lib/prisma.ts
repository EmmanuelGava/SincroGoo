import { PrismaClient } from '@prisma/client';

// PrismaClient es adjuntado al objeto global para prevenir múltiples instancias de Prisma Client en desarrollo
let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // @ts-ignore
  if (!global.prisma) {
    // @ts-ignore
    global.prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = global.prisma;
}

export default prisma; 