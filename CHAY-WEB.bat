<# :
@echo off
title WEB TEM MAKET 3D - DANG CHAY TAI CONG 8888
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$scriptDir='%~dp0'.TrimEnd('\'); iex ((Get-Content -LiteralPath '%~f0' -Raw))"
pause
exit /b
#>

$Port = 8888
$root = if ($scriptDir -and (Test-Path $scriptDir)) { $scriptDir } else { (Get-Location).Path }

# Tự động tìm thư mục chứa file index.html nếu file CHAY-WEB.bat đặt ở thư mục cha
if (-not (Test-Path (Join-Path $root "index.html"))) {
    $found = Get-ChildItem -Path $root -Filter "index.html" -Recurse -Depth 3 -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $root = $found.DirectoryName
    }
}

$hasIndex = Test-Path (Join-Path $root "index.html")

$listener = New-Object System.Net.HttpListener
$bindAll = $false

try {
    $listener.Prefixes.Add("http://*:$Port/")
    $listener.Start()
    $bindAll = $true
} catch {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$Port/")
        $listener.Start()
        $bindAll = $false
    } catch {
        Write-Host "Loi khoi dong web server: $_" -ForegroundColor Red
        Exit
    }
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  WEB THIET KE TEM MAKET 3D DANG CHAY TAI CONG: $Port" -ForegroundColor Green
Write-Host "  Thu muc Web: $root" -ForegroundColor Cyan
if ($hasIndex) {
    Write-Host "  Trang chu:   index.html [DA TIM THAY OK]" -ForegroundColor Green
} else {
    Write-Host "  [CANH BAO] Khong tim thay file index.html trong thu muc nay!" -ForegroundColor Red
}
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "  [1] Mo ngay tren VPS:   http://localhost:$Port" -ForegroundColor White
if ($bindAll) {
    Write-Host "  [2] Mo tu may ngoai:    http://103.177.111.102:$Port" -ForegroundColor Yellow
} else {
    Write-Host "  [2] De mo tu ngoai: Chuot phai file nay -> 'Run as administrator'" -ForegroundColor Yellow
}
Write-Host "  [De tat web, ban chi can dong cua so nay lai]" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green

try {
    Start-Process "http://localhost:$Port"
} catch {}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rawPath) -or $rawPath -eq "/") {
            $rawPath = "index.html"
        }

        $decodedPath = [System.Uri]::UnescapeDataString($rawPath).Replace('/', '\')
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $decodedPath))

        if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($root), [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $notFoundHtml = "<html><body><h2>404 Not Found</h2><p>File khong ton tai: <code>$decodedPath</code> trong thu muc: <code>$root</code></p></body></html>"
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundHtml)
            $response.ContentType = "text/html; charset=utf-8"
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }
        $response.Close()
    } catch {
    }
}
