# Script para verificar referencias a redirectors en el código
# Para ejecutar este script: .\check-redirectors.ps1

Write-Host "Verificando referencias a redirectors..." -ForegroundColor Yellow

# Definir patrones de búsqueda
$patterns = @(
    '@/app/lib/import-redirector',
    '@/app/lib/supabase',
    '@/servicios/supabase/globales/conexion',
    '@/servicios/supabase/globales/supabase-service',
    '@/servicios/supabase/globales/tipos',
    '@/servicios/supabase/redirector',
    '@/servicios/supabase/tablas'
)

# Determinar la ruta raíz del proyecto
$currentDir = Get-Location
$rootDir = ""

# Verificar si estamos en la raíz o en el directorio de scripts
if ($currentDir -match "\\src\\lib\\supabase(\\scripts)?$") {
    # Estamos en src/lib/supabase o src/lib/supabase/scripts
    $rootDir = $currentDir -replace "\\src\\lib\\supabase(\\scripts)?$", ""
} else {
    # Asumimos que estamos en la raíz
    $rootDir = $currentDir
}

Write-Host "Buscando desde: $rootDir" -ForegroundColor Cyan

Write-Host "`nArchivos que todavía importan desde redirectors:" -ForegroundColor Cyan

# Buscar cada patrón y mostrar los resultados agrupados por archivo
foreach ($pattern in $patterns) {
    $files = Get-ChildItem -Path "$rootDir\src\" -Recurse -Include "*.ts","*.tsx" | 
        Select-String -Pattern $pattern |
        Group-Object Path | 
        Select-Object Name, Count
    
    if ($files.Count -gt 0) {
        Write-Host "`nReferencias a $pattern" -ForegroundColor Green
        $files | ForEach-Object {
            Write-Host "   $($_.Name) - $($_.Count) referencias" -ForegroundColor White
        }
    }
}

Write-Host "`nResumen de referencias por patrón:" -ForegroundColor Cyan
foreach ($pattern in $patterns) {
    $count = (Get-ChildItem -Path "$rootDir\src\" -Recurse -Include "*.ts","*.tsx" | 
        Select-String -Pattern $pattern |
        Measure-Object).Count
    
    if ($count -gt 0) {
        Write-Host "$pattern - $count referencias" -ForegroundColor $(if ($count -gt 10) {"Red"} else {"Yellow"})
    } else {
        Write-Host "$pattern - $count referencias" -ForegroundColor Green
    }
}

Write-Host "`nTotal de archivos con referencias:" -ForegroundColor Cyan
$totalFiles = Get-ChildItem -Path "$rootDir\src\" -Recurse -Include "*.ts","*.tsx" | 
    Select-String -Pattern ($patterns -join "|") |
    Group-Object Path | 
    Measure-Object

Write-Host "$($totalFiles.Count) archivos" -ForegroundColor $(if ($totalFiles.Count -gt 0) {"Yellow"} else {"Green"})

# Verificar cada archivo redirector
Write-Host "`nEstado de los archivos redirector:" -ForegroundColor Cyan

$redirectors = @(
    "$rootDir\src\app\lib\import-redirector.ts",
    "$rootDir\src\app\servicios\supabase\globales\conexion.ts",
    "$rootDir\src\app\servicios\supabase\globales\tipos.ts",
    "$rootDir\src\app\servicios\supabase\redirector.ts",
    "$rootDir\src\app\lib\supabase\index.ts"
)

foreach ($file in $redirectors) {
    if (Test-Path $file) {
        Write-Host "$file - Existe" -ForegroundColor Red
    } else {
        Write-Host "$file - Eliminado" -ForegroundColor Green
    }
}

Write-Host "`nVerificación completada. Si hay archivos que todavía hacen referencia a los redirectors," -ForegroundColor Yellow
Write-Host "deberías actualizarlos para usar directamente @/lib/supabase" -ForegroundColor Yellow 