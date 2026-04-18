$scriptPath = $MyInvocation.MyCommand.Definition
$baseDir = Split-Path -Parent $scriptPath
[System.IO.Directory]::SetCurrentDirectory($baseDir)

$port = 5500



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

$lines = $banner -split "`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {

        $line = $lines[$i]

        switch ($i) {
            0 { Write-Host $line -ForegroundColor Cyan }
            1 { Write-Host $line -ForegroundColor Cyan }
            2 { Write-Host $line -ForegroundColor DarkCyan }
            3 { Write-Host $line -ForegroundColor Green }
            4 { Write-Host $line -ForegroundColor Green }
            5 { Write-Host $line -ForegroundColor DarkGreen }
            6 { Write-Host $line -ForegroundColor DarkGreen }
            7 { Write-Host $line -ForegroundColor Cyan }
            default { Write-Host $line -ForegroundColor DarkCyan }
        }
    }


Write-Host "====================================" -ForegroundColor DarkGray
Write-Host " PowerShell Web Server" -ForegroundColor Green
Write-Host " Port: $port" -ForegroundColor Green
Write-Host " Root: $baseDir" -ForegroundColor Green
Write-Host " URL : http://localhost:$port" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor DarkGray



$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()

Write-Host ""
Write-Host "====================================" -ForegroundColor DarkGray
Write-Host "[ SYSTEM READY ]" -ForegroundColor Green
Write-Host "Press ENTER to launch interface..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor DarkGray
Write-Host ""

Read-Host | Out-Null

Start-Process "http://localhost:$port"



function Get-ContentType($path) {
    switch -Regex ($path) {
        "\.html$" { "text/html; charset=utf-8" }
        "\.css$"  { "text/css; charset=utf-8" }
        "\.js$"   { "application/javascript; charset=utf-8" }
        "\.ico$"  { "image/x-icon" }
        default   { "text/plain; charset=utf-8" }
    }
}



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


    Write-Host "[REQ] $path" -ForegroundColor Yellow



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
