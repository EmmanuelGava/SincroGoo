$token = "testtoken"; 
$headers = @{"Authorization" = "Bearer $token"}; 

try { 
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/editor-proyectos/sheets/1KExHptwjF7TfKCVoqWw2AT6XDHXLJJ-3xErwHHqnGGM/data" -Method Get -Headers $headers -ErrorAction Stop; 
    $response | ConvertTo-Json -Depth 10 
} catch { 
    $_.Exception.Message 
}
