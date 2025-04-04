# Comandos de Migración

Este documento contiene comandos útiles para ayudar en el proceso de migración de la estructura antigua a la nueva.

## Búsqueda de Importaciones Antiguas

### En Windows (PowerShell)

```powershell
# Buscar todas las importaciones de la ruta antigua
Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts | Select-String -Pattern '@/servicios/supabase' | Select-Object Path -Unique

# Buscar importaciones específicas
Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts | Select-String -Pattern '@/servicios/supabase/globales/conexion' | Select-Object Path -Unique
```

### En Linux/Mac

```bash
# Buscar todas las importaciones de la ruta antigua
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "@/servicios/supabase" {} \;

# Buscar importaciones específicas
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "@/servicios/supabase/globales/conexion" {} \;
```

## Comandos de Reemplazo

### En Windows (PowerShell)

```powershell
# Reemplazar importación específica manteniendo el resto de la línea
Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts | ForEach-Object {
    (Get-Content $_.FullName) | ForEach-Object {
        $_ -replace '@/servicios/supabase/globales/conexion', '@/lib/supabase'
    } | Set-Content $_.FullName
}

# Reemplazar múltiples importaciones
$replacements = @{
    '@/servicios/supabase/globales/conexion' = '@/lib/supabase'
    '@/servicios/supabase/globales/tipos' = '@/lib/supabase'
    '@/servicios/supabase/proyectos/proyectos-service' = '@/lib/supabase'
}

Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $content = Get-Content $_.FullName
    $replacements.GetEnumerator() | ForEach-Object {
        $content = $content -replace $_.Key, $_.Value
    }
    $content | Set-Content $_.FullName
}
```

### En Linux/Mac

```bash
# Reemplazar importación específica
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|@/servicios/supabase/globales/conexion|@/lib/supabase|g' {} \;

# Script para múltiples reemplazos
#!/bin/bash
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
    -e 's|@/servicios/supabase/globales/conexion|@/lib/supabase|g' \
    -e 's|@/servicios/supabase/globales/tipos|@/lib/supabase|g' \
    -e 's|@/servicios/supabase/proyectos/proyectos-service|@/lib/supabase|g' \
    {} \;
```

## Verificación de Tipos

```bash
# Ejecutar verificación de tipos para buscar errores después de los cambios
npx tsc --noEmit
```

## Limpieza Final

### En Windows (PowerShell)

```powershell
# Verificar archivos de la estructura antigua que ya no se usan
Get-ChildItem -Path ./src/app/servicios/supabase -Recurse -Include *.ts,*.tsx

# Eliminar directorios y archivos antiguos (PRECAUCIÓN - hacer backup primero)
# Remove-Item -Path ./src/app/servicios/supabase -Recurse -Force
```

### En Linux/Mac

```bash
# Verificar archivos de la estructura antigua que ya no se usan
find ./src/app/servicios/supabase -name "*.ts" -o -name "*.tsx"

# Eliminar directorios y archivos antiguos (PRECAUCIÓN - hacer backup primero)
# rm -rf ./src/app/servicios/supabase
```

## Pruebas

```bash
# Ejecutar pruebas después de la migración
npm run test
# o
npm run dev
```

## Git

```bash
# Crear una rama para la migración
git checkout -b migrar-supabase

# Verificar cambios
git status
git diff

# Commit de cambios agrupados por tipo
git add src/lib/supabase
git commit -m "feat: nueva estructura de Supabase"

git add src/app/servicios/supabase
git commit -m "chore: redirectors para compatibilidad con rutas antiguas"

git add .
git commit -m "refactor: actualización de importaciones a nueva estructura"

# Merge cuando todo funcione correctamente
git checkout main
git merge migrar-supabase
```

## Generación de Árbol de Directorios

```powershell
# Windows (PowerShell)
Get-ChildItem -Path ./src/lib/supabase -Recurse -Directory | ForEach-Object { "$($_.FullName.Substring((Get-Location).Path.Length+1))" } | Sort-Object
```

```bash
# Linux/Mac
find ./src/lib/supabase -type d | sort
```

## Contador de Líneas

```powershell
# Windows (PowerShell)
Get-ChildItem -Path ./src/lib/supabase -Recurse -File -Include *.ts,*.tsx | Measure-Object -Property Length -Sum
```

```bash
# Linux/Mac
find ./src/lib/supabase -type f -name "*.ts" -o -name "*.tsx" | xargs wc -l
``` 