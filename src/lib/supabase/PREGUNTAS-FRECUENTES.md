# Preguntas Frecuentes sobre la Reestructuración de Supabase

## Preguntas Generales

### ¿Por qué estamos reestructurando los servicios de Supabase?

La reestructuración tiene como objetivo:
- Mejorar la organización y mantenibilidad del código
- Centralizar la lógica de acceso a datos
- Facilitar la reutilización de código
- Simplificar las pruebas
- Permitir una mejor escalabilidad

### ¿Cuál es la diferencia entre la estructura antigua y la nueva?

**Estructura Antigua:**
- Dispersa en múltiples ubicaciones (`src/app/lib/supabase`, `src/app/servicios/supabase`, etc.)
- Sin patrones consistentes
- Mezcla de lógica de negocio y acceso a datos
- Difícil de probar y mantener

**Estructura Nueva:**
- Centralizada en `src/lib/supabase`
- Organizada por dominio (auth, projects, sheets, slides)
- Separación clara de responsabilidades
- Patrón de servicio consistente
- Mejor manejo de errores

## Migración

### ¿Cómo migro un componente para usar la nueva estructura?

1. Identifica las importaciones actuales de Supabase en tu componente
2. Reemplaza las importaciones de la estructura antigua por las nuevas:
   ```typescript
   // Antes
   import { supabase } from '@/app/lib/supabase';
   import { ProyectosAPI } from '@/app/servicios/supabase/proyectos/proyectos-service';

   // Después
   import { supabase, projectsService } from '@/lib/supabase';
   ```
3. Actualiza las llamadas a métodos si es necesario

### ¿Funcionarán ambas estructuras en paralelo durante la migración?

No, la estructura antigua será eliminada completamente. Es importante migrar todos los componentes a la nueva estructura lo antes posible.

### ¿Qué pasa si un servicio que necesito no está en la nueva estructura?

Si encuentras un servicio o método que no está disponible en la nueva estructura, tienes dos opciones:
1. Implementarlo siguiendo el patrón establecido en la nueva estructura
2. Comunicarlo para que se implemente como parte del proceso de migración

## Técnicas

### ¿Cómo maneja la nueva estructura la autenticación?

La nueva estructura utiliza un servicio especializado (`AuthService`) para manejar toda la lógica de autenticación:

```typescript
import { authService } from '@/lib/supabase';

// Login
const result = await authService.signIn({ email, password });

// Logout
await authService.signOut();

// Verificar usuario actual
const user = await authService.getCurrentUser();
```

### ¿Cómo se manejan los errores en la nueva estructura?

La nueva estructura implementa un manejo de errores consistente:

```typescript
import { handleError } from '@/lib/supabase/utils/error-handler';

try {
  // Operación que puede fallar
} catch (error) {
  return handleError('Mensaje descriptivo', error);
}
```

Esto asegura:
- Logs consistentes
- Respuestas de error estandarizadas
- Mejor experiencia de depuración

### ¿Cómo funcionan las transacciones en la nueva estructura?

Para operaciones que requieren transacciones, la nueva estructura proporciona helpers:

```typescript
import { transaction } from '@/lib/supabase/utils/queries';

const result = await transaction(async (client) => {
  // Operaciones dentro de la transacción
  const { data: project } = await client.from('proyectos').insert(...);
  const { data: sheet } = await client.from('sheets').insert(...);
  
  return { project, sheet };
});
```

## Problemas Comunes

### ¿Qué hago si veo errores de "Export not found"?

Los errores "Export not found" suelen ocurrir durante la transición. Verifica:
1. Que estés importando desde la ubicación correcta
2. Que el nombre del servicio/método sea correcto (por ejemplo, `projectsService` en lugar de `ProyectosAPI`)
3. Que el servicio esté exportado correctamente en `index.ts`

### ¿Por qué mi código no funciona después de la migración?

Causas comunes:
1. Interfaces o tipos diferentes entre las estructuras
2. Nombres de métodos ligeramente diferentes
3. Comportamiento diferente en el manejo de errores

Solución: Verifica la documentación del nuevo servicio y asegúrate de que estás usando correctamente los nuevos métodos.

### ¿Cómo reporto problemas con la nueva estructura?

Si encuentras problemas con la nueva estructura:
1. Verifica la documentación y ejemplos
2. Comprueba si hay errores de consola específicos
3. Reporta el problema incluyendo:
   - Código afectado
   - Comportamiento esperado vs. actual
   - Cualquier mensaje de error

## Ejemplos

### Ejemplo de migración completa

**Antes:**
```typescript
import { supabase } from '@/app/lib/supabase';
import { ProyectosAPI } from '@/app/servicios/supabase/proyectos/proyectos-service';

async function getProyectos() {
  try {
    const resultado = await ProyectosAPI.obtenerProyectos();
    if (!resultado.exito) {
      console.error(resultado.error);
      return [];
    }
    return resultado.datos || [];
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return [];
  }
}
```

**Después:**
```typescript
import { projectsService } from '@/lib/supabase';

async function getProyectos() {
  try {
    const projects = await projectsService.listProjects();
    return projects;
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return [];
  }
}
``` 