# ==============================
# CONFIG
# ==============================

$scriptPath = $MyInvocation.MyCommand.Definition
$baseDir = Split-Path -Parent $scriptPath
[System.IO.Directory]::SetCurrentDirectory($baseDir)

$port = 5500


# ==============================
# 🎨 STARTUP BANNER (PUT ASCII HERE)
# ==============================

Clear-Host

$banner = @"
 _______  _______           _______    _        _______ _________
(  ____ \(  ____ \|\     /|(  ___  )  ( (    /|(  ____ \\__   __/
| (    \/| (    \/| )   ( || (   ) |  |  \  ( || (    \/   ) (   
| (__    | |      | (___) || |   | |  |   \ | || (__       | |   
|  __)   | |      |  ___  || |   | |  | (\ \) ||  __)      | |   
| (      | |      | (   ) || |   | |  | | \   || (         | |   
| (____/\| (____/\| )   ( || (___) |  | )  \  || (____/\   | |   
(_______/(_______/|/     \|(_______)  |/    )_)(_______/   )_(   
"@

$colors = @(
    "Cyan",
    "Cyan",
    "DarkCyan",
    "Blue",
    "Blue",
    "DarkBlue",
    "DarkBlue",
    "Magenta"
)

$lines = $banner -split "`n"

for ($i = 0; $i -lt $lines.Count; $i++) {
    $color = $colors[$i % $colors.Count]
    Write-Host $lines[$i] -ForegroundColor $color
}


Write-Host "====================================" -ForegroundColor DarkGray
Write-Host " Simple PowerShell Web Server" -ForegroundColor Green
Write-Host " Port: $port" -ForegroundColor Green
Write-Host " Root: $baseDir" -ForegroundColor Green
Write-Host " URL : http://localhost:$port" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor DarkGray


# ==============================
# SERVER START
# ==============================

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()

Start-Process "http://localhost:$port"


# ==============================
# HELPERS
# ==============================

function Get-ContentType($path) {
    switch -Regex ($path) {
        "\.html$" { "text/html; charset=utf-8" }
        "\.css$"  { "text/css; charset=utf-8" }
        "\.js$"   { "application/javascript; charset=utf-8" }
        "\.ico$"  { "image/x-icon" }
        default   { "text/plain; charset=utf-8" }
    }
}


# ==============================
# MAIN LOOP
# ==============================

while ($true) {

    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()

    $buffer = New-Object byte[] 8192
    $bytesRead = $stream.Read($buffer, 0, $buffer.Length)

    if ($bytesRead -le 0) {
        $client.Close()
        continue
    }

    $request = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)

    # ==========================
    # 🧠 REQUEST PARSING
    # ==========================
    $path = "/"

    if ($request -match "^GET\s+([^\s]+)") {
        $path = $matches[1]
    }

    $path = $path.Split('?')[0]

    if ($path -eq "/") {
        $path = "/index.html"
    }

    $relativePath = $path.TrimStart("/")
    $filePath = [System.IO.Path]::Combine($baseDir, $relativePath)


    # ==========================
    # 📡 LOG REQUEST (OPTIONAL)
    # ==========================
    Write-Host "[REQ] $path" -ForegroundColor Yellow


    # ==========================
    # 📦 RESPONSE HANDLING
    # ==========================

    if (Test-Path $filePath) {

        $contentBytes = [System.IO.File]::ReadAllBytes($filePath)
        $type = Get-ContentType $filePath

        $header =
            "HTTP/1.1 200 OK`r`n" +
            "Content-Type: $type`r`n" +
            "Content-Length: $($contentBytes.Length)`r`n" +
            "Connection: close`r`n`r`n"

        $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)

        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($contentBytes, 0, $contentBytes.Length)
    }
    else {

        # ==========================
        # ❌ 404 RESPONSE
        # ==========================

        $msg = "404 Not Found: $path"

        $header =
            "HTTP/1.1 404 Not Found`r`n" +
            "Content-Type: text/plain; charset=utf-8`r`n`r`n"

        $responseBytes =
            [System.Text.Encoding]::UTF8.GetBytes($header + $msg)

        $stream.Write($responseBytes, 0, $responseBytes.Length)
    }

    $client.Close()
}
