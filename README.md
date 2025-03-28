# SincroGoo 📄

SincroGoo es una aplicación web que permite sincronizar y editar documentos de Google Sheets y Google Slides de manera eficiente y sencilla.

## Características ✨

- 🔄 Sincronización en tiempo real con Google Sheets
- 📝 Editor de facturas y documentos
- 🎨 Interfaz moderna y responsiva
- 🔒 Autenticación segura con Google
- 📱 Diseño adaptable a dispositivos móviles

## Tecnologías Utilizadas 🛠️

- Next.js 14
- TypeScript
- Material ui
- Google Sheets API
- Google Slides API
- NextAuth.js
- Supabase

## Requisitos Previos 📋

- Node.js (versión 18 o superior)
- npm o yarn
- Una cuenta de Google
- Credenciales de API de Google Cloud Platform
- Cuenta en Vercel

## Configuración de Google Cloud Platform 🔑

1. Ve a la [Consola de Google Cloud Platform](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Google Sheets API
   - Google Slides API
   - Google Drive API
4. Configura la pantalla de consentimiento OAuth:
   - Tipo: Externo
   - Información de la aplicación
   - Dominios autorizados
5. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación Web
   - Nombre: SincroGoo
   - URIs de redirección autorizados:
     ```
     http://localhost:3000/api/auth/callback/google
     https://tu-dominio-vercel.vercel.app/api/auth/callback/google
     ```
   - Orígenes autorizados de JavaScript:
     ```
     http://localhost:3000
     https://tu-dominio-vercel.vercel.app
     ```

## Configuración de Vercel 🚀

1. Importa tu repositorio en [Vercel](https://vercel.com)
2. Configura las variables de entorno:
   ```env
   GOOGLE_CLIENT_ID=tu_client_id
   GOOGLE_CLIENT_SECRET=tu_client_secret
   NEXTAUTH_URL=https://tu-dominio-vercel.vercel.app
   NEXTAUTH_SECRET=tu_nextauth_secret
   ```
3. Despliega la aplicación
4. Copia la URL del dominio generado por Vercel
5. Actualiza las URIs autorizadas en Google Cloud Platform con tu dominio de Vercel

## Configuración Local 🔧

1. Clona el repositorio:
```bash
git clone https://github.com/EmmanuelGava/SincroGoo.git
cd SincroGoo
```

2. Instala las dependencias:
```bash
npm install
# o
yarn install
```

3. Crea un archivo `.env.local` con las siguientes variables:
```env
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_nextauth_secret
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
# o
yarn dev
```

## Uso 💡

1. Inicia sesión con tu cuenta de Google
2. Conecta tus documentos de Google Sheets
3. Edita y sincroniza tus documentos
4. Los cambios se guardarán automáticamente

## Estructura del Proyecto 📁

```
SincroGoo/
├── app/                  # Directorio principal de la aplicación
│   ├── api/             # Endpoints de la API
│   ├── auth/            # Configuración de autenticación
│   └── dashboard/       # Páginas del dashboard
├── components/          # Componentes reutilizables
├── hooks/              # Custom hooks
├── lib/                # Utilidades y configuraciones
└── types/              # Definiciones de tipos TypeScript
```

## Contribuir 🤝

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia 📄

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE.md](LICENSE.md) para detalles

## Contacto 📧

Emmanuel Gava - [@tu_twitter](https://twitter.com/tu_twitter)

Link del proyecto: [https://github.com/EmmanuelGava/SincroGoo](https://github.com/EmmanuelGava/SincroGoo) 