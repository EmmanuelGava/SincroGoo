# Pruebas de Integración - Fase 4

Este documento describe las pruebas que deben realizarse para verificar que la migración a la nueva estructura de Supabase funciona correctamente.

## Configuración Previa

Antes de iniciar las pruebas:

1. Asegurarse de que todas las correcciones del redirector estén implementadas
2. Iniciar la aplicación en modo desarrollo (`npm run dev`)
3. Limpiar cualquier sesión/cookie existente en el navegador
4. Tener usuarios de prueba preparados en Supabase

## Casos de Prueba

### 1. Autenticación

#### 1.1 Inicio de Sesión

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Navegar a `/auth/login` | Se muestra página de login |
| 2 | Ingresar credenciales inválidas | Muestra mensaje de error |
| 3 | Ingresar credenciales válidas | Redirecciona a `/dashboard` |
| 4 | Verificar en consola | No hay errores de Supabase |

#### 1.2 Cierre de Sesión

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Estar en cualquier página autenticada | Se muestran opciones de usuario en EncabezadoSistema |
| 2 | Hacer click en "Cerrar Sesión" | Redirecciona a homepage |
| 3 | Intentar acceder a `/dashboard` | Redirecciona a login |
| 4 | Verificar en consola | No hay errores de Supabase |

### 2. Proyectos

#### 2.1 Listar Proyectos

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Iniciar sesión | Redirecciona a dashboard |
| 2 | Navegar a `/proyectos` | Muestra lista de proyectos |
| 3 | Verificar en Network | Petición a Supabase exitosa |
| 4 | Verificar en consola | No hay errores de Supabase |

#### 2.2 Crear Proyecto

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Navegar a `/proyectos` | Muestra lista de proyectos |
| 2 | Hacer click en "Nuevo Proyecto" | Muestra formulario |
| 3 | Rellenar datos y enviar | Crea proyecto y actualiza lista |
| 4 | Verificar en Network | Petición a Supabase exitosa |
| 5 | Verificar consola | No hay errores de Supabase |

#### 2.3 Editar Proyecto

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Navegar a un proyecto existente | Muestra detalles del proyecto |
| 2 | Hacer click en "Editar" | Muestra formulario con datos actuales |
| 3 | Modificar datos y guardar | Actualiza proyecto |
| 4 | Verificar en Network | Petición a Supabase exitosa |
| 5 | Verificar consola | No hay errores de Supabase |

### 3. Hojas de Cálculo

#### 3.1 Listar Hojas

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Abrir un proyecto | Muestra detalles del proyecto |
| 2 | Navegar a sección "Hojas" | Muestra lista de hojas |
| 3 | Verificar en Network | Petición a Supabase exitosa |
| 4 | Verificar consola | No hay errores de Supabase |

#### 3.2 Editar Celdas

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Abrir una hoja existente | Muestra grid con celdas |
| 2 | Editar contenido de celda | Permite edición |
| 3 | Guardar cambios | Actualiza datos |
| 4 | Verificar en Network | Petición a Supabase exitosa |
| 5 | Verificar consola | No hay errores de Supabase |

### 4. Presentaciones

#### 4.1 Listar Presentaciones

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Abrir un proyecto | Muestra detalles del proyecto |
| 2 | Navegar a sección "Presentaciones" | Muestra lista de presentaciones |
| 3 | Verificar en Network | Petición a Supabase exitosa |
| 4 | Verificar consola | No hay errores de Supabase |

#### 4.2 Editar Elementos

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Abrir una presentación existente | Muestra editor de diapositivas |
| 2 | Seleccionar un elemento | Muestra propiedades del elemento |
| 3 | Modificar propiedades | Actualiza vista previa |
| 4 | Guardar cambios | Actualiza elemento |
| 5 | Verificar en Network | Petición a Supabase exitosa |
| 6 | Verificar consola | No hay errores de Supabase |

### 5. Sincronización

#### 5.1 Asociar Elementos

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Abrir editor de diapositivas | Muestra diapositiva y editor |
| 2 | Seleccionar elemento a asociar | Muestra opciones de asociación |
| 3 | Elegir hoja y celda | Actualiza asociación |
| 4 | Guardar cambios | Muestra confirmación |
| 5 | Verificar en Network | Petición a Supabase exitosa |
| 6 | Verificar consola | No hay errores de Supabase |

#### 5.2 Sincronizar Datos

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Tener elementos asociados | Elementos vinculados a celdas |
| 2 | Modificar datos en hojas | Datos actualizados |
| 3 | Hacer click en "Sincronizar" | Muestra progreso |
| 4 | Verificar presentación | Elementos actualizados con nuevos datos |
| 5 | Verificar en Network | Petición a Supabase exitosa |
| 6 | Verificar consola | No hay errores de Supabase |

## Evaluación de Resultados

Para cada caso de prueba, registrar:

1. ✅ Éxito completo: Funcionalidad correcta sin errores
2. ⚠️ Éxito parcial: Funcionalidad correcta con advertencias menores
3. ❌ Fallo: Errores que impiden la funcionalidad

## Registro de Pruebas

| Caso de Prueba | Resultado | Observaciones |
|----------------|-----------|---------------|
| 1.1 Inicio de Sesión | | |
| 1.2 Cierre de Sesión | | |
| 2.1 Listar Proyectos | | |
| 2.2 Crear Proyecto | | |
| 2.3 Editar Proyecto | | |
| 3.1 Listar Hojas | | |
| 3.2 Editar Celdas | | |
| 4.1 Listar Presentaciones | | |
| 4.2 Editar Elementos | | |
| 5.1 Asociar Elementos | | |
| 5.2 Sincronizar Datos | | |

## Errores Frecuentes a Monitorear

Durante las pruebas, prestar especial atención a:

1. Errores `export 'X' (reexported as 'X') was not found` en consola
2. Errores `undefined is not a function` (por métodos renombrados)
3. Problemas de tipo con propiedades esperadas
4. Errores `RPC call failed` en llamadas a Supabase
5. Redirecciones incorrectas durante autenticación

## Conclusión

Si todas las pruebas tienen éxito, se puede proceder a la limpieza final según PLAN-LIMPIEZA.md. Si hay errores, deben corregirse antes de continuar. 