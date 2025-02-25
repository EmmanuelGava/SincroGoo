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
- Tailwind CSS
- Google Sheets API
- Google Slides API
- NextAuth.js

## Requisitos Previos 📋

- Node.js (versión 18 o superior)
- npm o yarn
- Una cuenta de Google
- Credenciales de API de Google Cloud Platform

## Configuración 🔧

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