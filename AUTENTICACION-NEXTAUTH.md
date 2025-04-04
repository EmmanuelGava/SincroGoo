# Sistema de Autenticación de SincroGoo

Este documento describe el sistema de autenticación implementado en SincroGoo, utilizando NextAuth.js para la gestión de sesiones y Supabase como base de datos.

## Estructura General

La autenticación sigue un enfoque simplificado basado exclusivamente en JWT (JSON Web Tokens) a través de NextAuth:

1. **Login**: El usuario inicia sesión usando su cuenta de Google.
2. **Sesión**: NextAuth crea un token JWT que se guarda como cookie en el navegador.
3. **Autorización**: Las rutas protegidas verifican la existencia del token mediante middleware.
4. **Sincronización**: Los datos del usuario se sincronizan con Supabase para persistencia.

## Componentes Clave

### 1. Configuración de NextAuth

El archivo principal de configuración es `src/app/api/auth/[...nextauth]/options.ts`:

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // Configuración de permisos y acceso
    })
  ],
  session: {
    strategy: "jwt",        // Importante: Usamos JWT como estrategia
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  callbacks: {
    // Callback al iniciar sesión
    async signIn({ user, account }) {
      // Validación básica
      if (!user.email) return false;
      return true;
    },
    
    // Callback para persistir datos en el JWT
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    
    // Callback para agregar datos a la sesión del usuario
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
}
```

### 2. Cliente de Supabase

El cliente de Supabase se inicializa en `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
```

### 3. Declaración de Tipos

Los tipos para NextAuth se definen en `src/types/next-auth.d.ts`:

```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
    accessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends NextAuthJWT {
    accessToken?: string
  }
}
```

## Flujo de Autenticación

### 1. Inicio de Sesión

1. El usuario visita la página de inicio de sesión (`/auth/signin`)
2. Hace clic en el botón para iniciar sesión con Google
3. NextAuth redirige al usuario a la página de autenticación de Google
4. Google solicita autorización al usuario
5. Tras autorizar, Google redirige de vuelta a nuestra aplicación con un código
6. NextAuth intercambia el código por un token de acceso
7. Se ejecuta el callback `signIn` para validar los datos
8. Se crea el JWT con la información del usuario y el token de acceso
9. El usuario es redirigido al dashboard

### 2. Verificación de Sesión

1. Cuando el usuario accede a una ruta protegida (dashboard, proyectos, etc.)
2. NextAuth verifica automáticamente la cookie `next-auth.session-token`
3. Si la cookie existe y es válida, se permite el acceso
4. En componentes client-side, usamos el hook `useSession()` para verificar la sesión

```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return <p>Cargando...</p>;
  }
  
  if (status === "unauthenticated") {
    // Redirigir al login o mostrar mensaje
    return <p>No has iniciado sesión</p>;
  }
  
  // Usuario autenticado, mostrar contenido
  return <h1>Bienvenido, {session?.user?.name}</h1>;
}
```

### 3. Sincronización con Supabase

Después de la autenticación, el endpoint `/api/auth/sync` sincroniza los datos del usuario con Supabase:

```typescript
export async function GET() {
  // Obtener sesión de NextAuth
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No hay sesión' }, { status: 401 })
  }
  
  // Sincronizar con Supabase
  const usuario = await authService.sincronizarUsuario(session.user)
  
  return NextResponse.json({
    success: true,
    usuario,
    message: 'Usuario sincronizado correctamente'
  })
}
```

### 4. Cierre de Sesión

Para cerrar sesión, utilizamos la función `signOut()` de NextAuth:

```typescript
import { signOut } from 'next-auth/react';

const handleLogout = async () => {
  await signOut({ redirect: true, callbackUrl: '/' });
};
```

## Variables de Entorno Requeridas

```
# Google OAuth
GOOGLE_CLIENT_ID=tu_id_de_cliente_google
GOOGLE_CLIENT_SECRET=tu_secreto_de_cliente_google

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secreto_para_jwt

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

## Mejores Prácticas y Solución de Problemas

### Mantener el sistema funcionando correctamente

1. **Simplicidad ante todo**: Mantén el flujo de autenticación simple, usando directamente NextAuth sin complicaciones.
2. **Separación de responsabilidades**: 
   - NextAuth maneja la autenticación y sesiones
   - Supabase se usa solo para almacenamiento de datos
3. **Evita duplicidad**: No implementes múltiples sistemas de autenticación paralelos

### Solución de problemas comunes

1. **Errores de sesión**:
   - Verifica que las cookies estén siendo configuradas correctamente
   - Confirma que `NEXTAUTH_SECRET` sea consistente entre entornos
   - En desarrollo, usa `next-auth.session-token` sin prefijos

2. **Problemas de autorización**:
   - Asegúrate de que los scopes de Google sean los correctos
   - Verifica que los callbacks de NextAuth estén configurados correctamente

3. **Importaciones incorrectas**:
   - Mantén la ruta de importación consistente: `@/lib/supabase` para el cliente de Supabase
   - Usa explícitamente `getServerSession(authOptions)` para obtener la sesión

## Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/
│   │       │   ├── options.ts     # Configuración de NextAuth
│   │       │   └── route.ts       # Handlers de NextAuth
│   │       └── sync/
│   │           └── route.ts       # Sincronización con Supabase
│   └── auth/
│       └── signin/
│           └── page.tsx           # Página de inicio de sesión
├── lib/
│   └── supabase.ts                # Cliente de Supabase
└── types/
    └── next-auth.d.ts             # Declaración de tipos para NextAuth
``` 