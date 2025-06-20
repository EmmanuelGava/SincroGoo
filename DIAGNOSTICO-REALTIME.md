# Diagnóstico y Solución: Problemas con Supabase Realtime en React

Este documento detalla el proceso de diagnóstico y la solución para los problemas de conexión de WebSocket con Supabase Realtime en un proyecto de Next.js.

## Resumen del Problema (TL;DR)

- **Síntoma:** Los componentes que usaban Supabase Realtime se quedaban atascados en un ciclo de conexión/desconexión, mostrando errores en la consola como `WebSocket is closed before the connection is established` y un estado de suscripción `CLOSED` o `TIMED_OUT`.
- **Causa Raíz:** El comportamiento del `StrictMode` de React. En modo de desarrollo, `StrictMode` monta, desmonta y vuelve a montar los componentes deliberadamente para detectar efectos secundarios. La función de limpieza del `useEffect` (`supabase.removeChannel()`) se ejecutaba inmediatamente después del primer intento de conexión, cancelándola antes de que pudiera establecerse.
- **Solución:** Reemplazar la llamada `supabase.removeChannel(channel)` en la función de limpieza del `useEffect` por `channel.unsubscribe()`. Este método es más resiliente al ciclo de vida rápido del `StrictMode`, ya que simplemente cancela la suscripción actual sin destruir completamente el canal, evitando la "condición de carrera" que causaba el error.

---

## 1. El Problema Inicial (Los Síntomas)

La aplicación sufría de un problema persistente donde las suscripciones a los canales de Supabase Realtime fallaban. Los síntomas en la consola del navegador eran:

- Un bucle infinito de logs:
  - `Intentando suscribirse a realtime...`
  - `Eliminando canal realtime...`
  - `Estado de la suscripción realtime: CLOSED`
- Un error de WebSocket: `WebSocket is closed before the connection is established.`
- Finalmente, el estado del canal terminaba en `TIMED_OUT`.

Esto indicaba que la conexión se interrumpía casi inmediatamente después de ser iniciada.

## 2. El Proceso de Diagnóstico

Seguimos un proceso de eliminación para encontrar la causa.

### Pista Falsa #1: Configuración de Supabase
Inicialmente, sospechamos de una mala configuración en el dashboard de Supabase.
- **Acción:** Verificamos que las publicaciones (`publications`) para las tablas deseadas estuvieran activadas en la sección `Database -> Replication`.
- **Resultado:** La configuración era correcta. El problema no estaba en el backend de Supabase.

### Pista Falsa #2: Bucle de Re-renderizado por Contexto no Optimizado
La siguiente hipótesis fue que los componentes se estaban re-renderizando infinitamente debido a un `Context` de React mal optimizado.
- **Teoría:** Si el objeto `value` pasado al `Provider` o las funciones dentro de él se crean de nuevo en cada render, los componentes consumidores se re-renderizan sin parar.
- **Acciones:**
  1. Envolvimos las funciones del contexto con `useCallback`.
  2. Envolvimos el objeto `value` del Provider con `useMemo`.
  3. Nos aseguramos de que los cálculos derivados (como `leadsPorEstado`) también estuvieran envueltos en `useMemo`.
- **Resultado:** Aunque estas son optimizaciones de rendimiento cruciales y buenas prácticas, no resolvieron el problema raíz, lo que indicaba que la causa del re-renderizado era otra.

### El Descubrimiento Clave: `reactStrictMode`
La pista definitiva llegó cuando el problema desapareció al ejecutar este código de prueba directamente en la consola:

```javascript
// Este código SÍ funcionaba en la consola
const channel = supabase.channel('...').on(...).subscribe();
```

Esto demostró que la conexión era posible y que el problema estaba relacionado con el ciclo de vida de los componentes de React. La sospecha recayó en el **Modo Estricto de React**.

- **Acción de Diagnóstico:** Desactivamos temporalmente `reactStrictMode` en `next.config.js`.
- **Resultado:** El problema desapareció por completo. Esto confirmó que la causa era la lógica de montaje/desmontaje/re-montaje del Modo Estricto.

## 3. La Solución Definitiva

El objetivo no es desactivar `StrictMode` (es una herramienta de seguridad valiosa), sino hacer que nuestro código sea compatible con él.

- **La Causa Real Detallada:** El `useEffect` se ejecutaba así:
  1. **Montaje 1:** Se llama a `supabase.channel(...).subscribe()`.
  2. **Desmontaje (por StrictMode):** Se ejecuta la función de limpieza, que llamaba a `supabase.removeChannel(channel)`. Esta llamada es "agresiva" y cancelaba la conexión en curso.
  3. **Montaje 2:** Se intentaba suscribir de nuevo, pero la conexión anterior ya había sido destruida.

- **La Solución Correcta:** Se cambió la función de limpieza del `useEffect`.

  **Antes (Problemático):**
  ```javascript
  return () => {
    supabase.removeChannel(channel);
  };
  ```

  **Después (Solución Correcta):**
  ```javascript
  return () => {
    channel.unsubscribe();
  };
  ```

La función `channel.unsubscribe()` es más "gentil". Simplemente se da de baja de los eventos, pero no destruye el canal de la misma forma, lo que le permite sobrevivir al rápido ciclo de desmontaje y re-montaje de `StrictMode` y establecer la conexión con éxito en el segundo montaje.

Este cambio se aplicó a todos los componentes que usaban una suscripción de Realtime (`KanbanLeads.tsx` y `SidebarMensajesEntrantes.tsx`), resolviendo el problema de forma definitiva. 