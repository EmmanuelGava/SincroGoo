# Guía para Eliminar Warnings de Variables No Utilizadas

Los warnings de variables no utilizadas (`@typescript-eslint/no-unused-vars`) son importantes porque:
1. Aumentan el tamaño del bundle innecesariamente
2. Pueden indicar errores lógicos o código muerto
3. Dificultan el mantenimiento del código

## Opciones para solucionar estos warnings

### 1. Eliminar manualmente las importaciones/variables no utilizadas

Este es el método más limpio:
```typescript
// Antes
import { Component1, Component2, Component3, Component4 } from 'library';
// Después (eliminando Component3 y Component4 que no se usan)
import { Component1, Component2 } from 'library';
```

### 2. Usar el prefijo de guión bajo

Para variables que deben existir por contrato pero no se utilizan:
```typescript
function myFunction(_unusedParam: string) {
  // El parámetro no se usa pero es requerido por la firma
}
```

### 3. Utilizar comentarios de ESLint para deshabilitar el warning

Para casos específicos donde es necesario mantener una importación no utilizada:
```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { importanteParaTipos } from './modulo';
```

Para deshabilitar la regla en un bloque:
```typescript
/* eslint-disable @typescript-eslint/no-unused-vars */
import { 
  Component1,
  Component2, // Usado solo en ciertos casos
  Component3  // Necesario para tipos
} from 'library';
/* eslint-enable @typescript-eslint/no-unused-vars */
```

### 4. Configuración en archivo .eslintrc.json

Para modificar el comportamiento global, puedes ajustar la regla en tu archivo `.eslintrc.json`:
```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { 
      "varsIgnorePattern": "^_",
      "argsIgnorePattern": "^_",
      "ignoreRestSiblings": true 
    }]
  }
}
```

## Script de limpieza automática

```javascript
// fix-unused.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ejecutar eslint para obtener warnings de variables no utilizadas
exec('npx eslint src --ext .ts,.tsx --format json', (error, stdout) => {
  if (error) return console.error('Error ejecutando eslint:', error.message);
  
  try {
    const results = JSON.parse(stdout);
    const fileErrors = {};
    
    // Agrupar errores por archivo
    results.forEach(result => {
      if (!fileErrors[result.filePath]) fileErrors[result.filePath] = [];
      
      result.messages
        .filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars')
        .forEach(msg => {
          fileErrors[result.filePath].push({
            name: msg.message.match(/['"]([^'"]+)['"] is defined/)?.[1] || 
                  msg.message.match(/['"]([^'"]+)['"] is assigned/)?.[1]
          });
        });
    });
    
    // Procesar cada archivo
    Object.keys(fileErrors).forEach(filePath => {
      if (fileErrors[filePath].length > 0) {
        const content = fs.readFileSync(filePath, 'utf8');
        const unusedNames = fileErrors[filePath].map(err => err.name).filter(Boolean);
        
        // Buscar y modificar importaciones
        let newContent = content;
        const importRegex = /import\s+{([^}]+)}\s+from\s+['"][^'"]+['"];?/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const importStatement = match[0];
          const importList = match[1];
          const importNames = importList.split(',').map(name => name.trim());
          
          // Filtrar nombres no utilizados
          const filteredNames = importNames.filter(name => {
            const baseName = name.split(' as ')[0].trim();
            return !unusedNames.includes(baseName);
          });
          
          if (filteredNames.length < importNames.length) {
            if (filteredNames.length === 0) {
              // Eliminar importación completa
              newContent = newContent.replace(importStatement, '');
            } else {
              // Actualizar importación
              const newImport = `import { ${filteredNames.join(', ')} } from ${importStatement.match(/from\s+(['"][^'"]+['"])/)[1]};`;
              newContent = newContent.replace(importStatement, newImport);
            }
          }
        }
        
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`✅ Correcciones aplicadas en ${filePath}`);
        }
      }
    });
  } catch (e) {
    console.error('Error procesando la salida de eslint:', e);
  }
});
```

## Recomendaciones

1. Realiza este tipo de limpieza periódicamente para mantener el código limpio
2. Intenta hacer que sea parte de tu flujo de trabajo de revisión de código
3. Automatiza este proceso en un paso previo a los commits/builds 