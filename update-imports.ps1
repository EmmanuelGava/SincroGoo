$filePath = "src/app/componentes/ui/*.tsx"
$files = Get-ChildItem -Path $filePath

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $newContent = $content -replace 'import \{ cn \} from "@/lib/utils"', 'import { cn } from "@/app/lib/utils"'
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Actualizado: $($file.Name)"
    }
}

Write-Host "¡Proceso completado!" 