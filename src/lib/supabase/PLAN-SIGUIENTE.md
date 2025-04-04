# Plan de Acción: Próximos Pasos - Fase 4

## Objetivos Prioritarios

Después de corregir los problemas de exportación en el archivo `index.ts`, podemos continuar con la implementación del plan de limpieza. A continuación se detallan los próximos pasos a seguir:

## 1. Validación de la Estructura Actual

### 1.1. Verificación de exportaciones
- [x] Corregir `src/lib/supabase/index.ts`
- [ ] Verificar que `authService` sea correctamente accesible desde otras partes del código
- [ ] Comprobar que todas las exportaciones necesarias estén presentes y funcionales

### 1.2. Comprobación de tipos
- [ ] Ejecutar `npx tsc --noEmit` para detectar errores de tipos en todo el proyecto
- [ ] Corregir errores de tipos específicos de la capa de Supabase
- [ ] Verificar que `src/app/api/auth/sync/route.ts` compila correctamente

## 2. Pruebas de Integración

### 2.1. Implementación de pruebas unitarias
- [ ] Finalizar pruebas para `authService` basadas en el ejemplo existente
- [ ] Implementar pruebas para `projectsService` siguiendo el modelo de pruebas creado
- [ ] Crear pruebas básicas para los demás servicios (sheets, slides, sync)

### 2.2. Pruebas de rutas API
- [ ] Verificar funcionamiento de `src/app/api/auth/sync/route.ts` con la nueva estructura
- [ ] Probar rutas API relacionadas con proyectos, hojas y presentaciones
- [ ] Validar sincronización entre hojas y diapositivas

## 3. Eliminación de Código Antiguo

### 3.1. Identificación de código obsoleto
- [ ] Utilizar `check-redirectors.ps1` para identificar archivos que aún usan las rutas antiguas
- [ ] Crear lista priorizada de archivos a migrar o eliminar
- [ ] Documentar dependencias entre archivos para asegurar eliminación segura

### 3.2. Eliminación gradual
- [ ] Eliminar servicios antiguos que ya no tienen referencias directas
- [ ] Remover archivos de tipos obsoletos
- [ ] Eliminar redirectors después de asegurar que no hay dependencias

## 4. Documentación Final

### 4.1. Actualización de documentación
- [ ] Completar la documentación en `docs/README.md`
- [ ] Actualizar `docs/ARCHITECTURE.md` con la estructura final
- [ ] Finalizar `docs/SERVICES.md` con todos los servicios disponibles

### 4.2. Creación de ejemplos de uso
- [ ] Documentar ejemplos de uso para cada servicio
- [ ] Crear snippets de código para operaciones comunes
- [ ] Actualizar documentación para desarrolladores nuevos

## Próxima Sesión de Trabajo

Para la próxima sesión, se recomienda enfocarse en:

1. Corregir los errores de tipos detectados en `src/app/api/auth/sync/route.ts`
2. Implementar pruebas unitarias adicionales para los servicios principales
3. Comenzar la eliminación gradual de archivos antiguos que ya no tienen referencias

## Estrategia de Branching

Se recomienda seguir trabajando en una rama separada para estos cambios:

```bash
# Asegurar que estamos en la rama de migración
git checkout migracion-supabase

# Crear una rama específica para la fase de limpieza
git checkout -b fase4-limpieza
```

Esto permitirá realizar cambios de forma segura, con la posibilidad de hacer pruebas antes de integrar los cambios a la rama principal. 