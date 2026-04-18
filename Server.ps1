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

Write-Host @"
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                             .[v.       uX!`..                                                                                          
                                                                                     '>}:                   ...!n/:`                                                                                    
                                                                                ^?,.      'l!,....                  `lri                                                                                
                                                                            rO\     `;l`                                'jdmI                                                                           
                                                                          ;1     >;                                       ..}]                                                                          
                                                                        >!    >I  ;?,            ........          :f]        !}                                                                        
                                                                      l?    I^  >([.         '''''.   .`"",:^`.      (X1        ]}                                                                      
                                                                     +:   `<  .|('       ..      ......       !;^'     YC;       ^1                                                                     
                                                                    ['   '.  </1.  ijn_      ",`'      .^;;      ~qw|   nL\        /                                                                    
                                                                   f)   ?[. :/f`  ?jf      ..   .`l>>!^..      .   vOz   QC+  (x   }U.                                                                  
                                                                   ;   1t>  [j]  >xt, .(x} .  ..'. .. .''.    _wL" `uL\  _Cx` iUU . ;                                                                   
                                                                .  '. 'rt; .jvI  fc)  ~zj . un ^;[dkkb\I^ jm"  \Q(  {UX   CX^ ,xXI .`'....                                                              
                                                              :<  :v   Xn! .nU!  rJt' i0J . xJ ':<Xbb0?;^ v0   xJ-  1Xu  "Yu` :xc^ .ri.'?_                                                              
                                                               ,   ~:  {U(. {0z .;mQ>  |ZZ    .'..    ..`.    nX\  ,cXl  \c{  _v(   +   _                                                               
                                                                I   (   '"  'XO{  "wm?     ..    ..^^'..    .     `zz!  !xt^  ``   -   <'                                                               
                                                                 :   [`       JL]  `cm( .    .iI,,`..`,,:i`      +Yx,  Ifr`  ,"   l   I'                                                                
                                                                 ',   [`       _Jc       .-"                `~.       1f-  '~    +   ;,                                                                 
                                                                   I'   i'       (cf,        .:>~?{)){]+<I.        '?\[  '~.   i.  .<                                                                   
                                                                     ;'  '<i>"'.                                       i:   '>'  .l.                                                                    
                                                                       ;" '(Zx^.                                   :+'   .zqt  `l                                                                       
                                                                         .".   "_< .                        .,;,^     :!^    ^.                                                                         
                                                                             '.     ~)!,...                     `,+<.    .'                                                                             
                                                                                         .'^<(Ud-       ZC(<^.                                                                                          
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                      +Okaaaaahhaaor                /k~                                                                                                 
                                                                    .W$'                          . Q$1                                                                                                 
                                                                     a$)[}{}}}[[[}_   8$Mj|(((((([' L$MXt|(())u$$\  {$$z]+~~~~?L$$?                                                                     
                                                                     bB              "$h            U@[        I$Z  J@v         Z$u                                                                     
                                                                     ZW-              8M!           J81        ~%Q  u8d         M&(                                                                     
                                                                       "l!!!!!!!!!!,    :l!!!!!!!I. '`          '.     I!!!!!!!I                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
"@ -ForegroundColor Cyan


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
