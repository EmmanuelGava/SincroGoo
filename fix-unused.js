const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ejecutar eslint para obtener la lista de variables no utilizadas
exec('npx eslint ./src --ext .ts,.tsx --format json', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error ejecutando eslint: ${error.message}`);
    return;
  }
  
  try {
    const results = JSON.parse(stdout);
    processResults(results);
  } catch (e) {
    console.error('Error procesando la salida de eslint:', e);
  }
});

function processResults(results) {
  const fileErrors = {};
  
  // Agrupar errores por archivo
  results.forEach(result => {
    const filePath = result.filePath;
    
    if (!fileErrors[filePath]) {
      fileErrors[filePath] = [];
    }
    
    result.messages
      .filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars')
      .forEach(msg => {
        fileErrors[filePath].push({
          line: msg.line,
          column: msg.column,
          endLine: msg.endLine,
          endColumn: msg.endColumn,
          name: msg.message.match(/['"]([^'"]+)['"] is defined/)?.[1] || 
                 msg.message.match(/['"]([^'"]+)['"] is assigned/)?.[1]
        });
      });
  });
  
  // Procesar cada archivo
  Object.keys(fileErrors).forEach(filePath => {
    if (fileErrors[filePath].length > 0) {
      fixUnusedVars(filePath, fileErrors[filePath]);
    }
  });
}

function fixUnusedVars(filePath, errors) {
  try {
    console.log(`Procesando ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Ordenar errores de manera descendente para que no afecten los índices
    const sortedErrors = errors.sort((a, b) => b.line - a.line || b.column - a.column);
    
    // Nombres de variables no utilizadas
    const unusedNames = sortedErrors.map(err => err.name).filter(Boolean);
    
    // Procesar importaciones
    let modified = false;
    let newContent = content;
    
    // Buscar importaciones que contengan los nombres no utilizados
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"][^'"]+['"];?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importStatement = match[0];
      const importList = match[1];
      const importNames = importList.split(',').map(name => name.trim());
      
      // Filtrar los nombres no utilizados
      const filteredNames = importNames.filter(name => {
        // Eliminar aliases para la comparación
        const baseName = name.split(' as ')[0].trim();
        return !unusedNames.includes(baseName);
      });
      
      if (filteredNames.length < importNames.length) {
        if (filteredNames.length === 0) {
          // Eliminar la importación completa
          newContent = newContent.replace(importStatement, '');
        } else {
          // Actualizar la importación con los nombres utilizados
          const newImport = `import { ${filteredNames.join(', ')} } from ${importStatement.match(/from\s+(['"][^'"]+['"])/)[1]};`;
          newContent = newContent.replace(importStatement, newImport);
        }
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Correcciones aplicadas en ${filePath}`);
    } else {
      console.log(`⚠️ No se pudieron aplicar correcciones automáticas en ${filePath}`);
    }
    
  } catch (e) {
    console.error(`Error procesando ${filePath}:`, e);
  }
} 