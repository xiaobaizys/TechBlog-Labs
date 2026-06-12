# 私密分享权限 API 测试 v3 — 简化版
Add-Type -AssemblyName System.Net.Http

$BASE = "http://localhost:4002"
$PUBLIC_ID = "cmqak1eml0002sqglw54mc102"
$PRIVATE_ID = "cmqak1emm0004sqglgr2qkr7j"

function Make-Client {
    param()
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.CookieContainer = New-Object System.Net.CookieContainer
    $handler.UseCookies = $true
    $handler.AllowAutoRedirect = $false
    $c = New-Object System.Net.Http.HttpClient $handler
    $c.Timeout = [TimeSpan]::FromSeconds(15)
    return $c
}

function Get-Csrf {
    param($c)
    $r = $c.GetStringAsync("$BASE/api/auth/csrf").Result
    ($r | ConvertFrom-Json).csrfToken
}

function Do-Login {
    param($c, $email, $password)
    $csrf = Get-Csrf $c
    $pairs = [System.Collections.Generic.List[System.Collections.Generic.KeyValuePair[string,string]]]::new()
    $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new("email", $email))
    $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new("password", $password))
    $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new("csrfToken", $csrf))
    $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new("callbackUrl", "$BASE/"))
    $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new("json", "true"))
    $form = [System.Net.Http.FormUrlEncodedContent]::new($pairs)
    $resp = $c.PostAsync("$BASE/api/auth/callback/credentials", $form).Result
    # 跟一个 GET /api/auth/session 让 cookie 落定
    $null = $c.GetStringAsync("$BASE/api/auth/session").Result
    return [int]$resp.StatusCode
}

function Test-Get {
    param($c, $path)
    $r = $c.GetAsync("$BASE$path").Result
    return [int]$r.StatusCode
}

function Test-Delete {
    param($c, $path)
    $r = $c.DeleteAsync("$BASE$path").Result
    return [int]$r.StatusCode
}

function Dump-Session {
    param($c, $label)
    try {
        $r = $c.GetStringAsync("$BASE/api/auth/session").Result
        $s = $r | ConvertFrom-Json
        if ($s -and $s.user -and $s.user.email) {
            Write-Host ("    [{0}] session: {1}  role={2}" -f $label, $s.user.email, $s.user.role)
        } else {
            Write-Host ("    [{0}] session: (empty)" -f $label)
        }
    } catch {
        Write-Host ("    [{0}] session ERROR: {1}" -f $label, $_.Exception.Message)
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  私密分享权限 API 测试 v3" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- GUEST ---
Write-Host "[1] GUEST" -ForegroundColor Yellow
$g = Make-Client
Dump-Session $g "guest"
$g200 = Test-Get   $g "/api/life-posts/$PUBLIC_ID"
$g404 = Test-Get   $g "/api/life-posts/$PRIVATE_ID"
$gDel = Test-Delete $g "/api/life-posts/$PRIVATE_ID"
Write-Host ("    GET    public  = {0}  (expect 200)" -f $g200)
Write-Host ("    GET    private = {0}  (expect 404)" -f $g404)
Write-Host ("    DELETE private = {0}  (expect 401, no session)" -f $gDel)
Write-Host ""

# --- ADMIN ---
Write-Host "[2] ADMIN (admin@techblog.com)" -ForegroundColor Yellow
$a = Make-Client
$adminLogin = Do-Login $a "admin@techblog.com" "Admin123"
Dump-Session $a "admin"
$a200 = Test-Get $a "/api/life-posts/$PUBLIC_ID"
$a404 = Test-Get $a "/api/life-posts/$PRIVATE_ID"
$aDel = Test-Delete $a "/api/life-posts/$PRIVATE_ID"
Write-Host ("    GET    public  = {0}  (expect 200)" -f $a200)
Write-Host ("    GET    private = {0}  (expect 404) <-- KEY" -f $a404)
Write-Host ("    DELETE private = {0}  (expect 403) <-- KEY" -f $aDel)
Write-Host ""

# --- AUTHOR ---
Write-Host "[3] AUTHOR (perm-test-user@techblog.com)" -ForegroundColor Yellow
$u = Make-Client
$userLogin = Do-Login $u "perm-test-user@techblog.com" "PermTest123"
Dump-Session $u "author"
$u200 = Test-Get $u "/api/life-posts/$PUBLIC_ID"
$u200b= Test-Get $u "/api/life-posts/$PRIVATE_ID"
Write-Host ("    GET    public  = {0}  (expect 200)" -f $u200)
Write-Host ("    GET    private = {0}  (expect 200)" -f $u200b)
Write-Host ""

# --- Summary ---
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
$pass = $true
if ($g200  -ne 200) { Write-Host "  FAIL guest GET public (got $g200)"   -ForegroundColor Red; $pass = $false }
if ($g404  -ne 404) { Write-Host "  FAIL guest GET private (got $g404)"  -ForegroundColor Red; $pass = $false }
if ($gDel  -ne 401) { Write-Host "  FAIL guest DELETE private (got $gDel)" -ForegroundColor Red; $pass = $false }
if ($a200  -ne 200) { Write-Host "  FAIL admin GET public (got $a200)"   -ForegroundColor Red; $pass = $false }
if ($a404  -ne 404) { Write-Host "  FAIL admin GET private (got $a404) - PRIVACY LEAK!" -ForegroundColor Red; $pass = $false }
if ($aDel  -ne 403) { Write-Host "  FAIL admin DELETE private (got $aDel)" -ForegroundColor Red; $pass = $false }
if ($u200  -ne 200) { Write-Host "  FAIL author GET public (got $u200)"   -ForegroundColor Red; $pass = $false }
if ($u200b -ne 200) { Write-Host "  FAIL author GET private (got $u200b)" -ForegroundColor Red; $pass = $false }
if ($pass) { Write-Host "  ALL TESTS PASSED" -ForegroundColor Green } else { Write-Host "  SOME TESTS FAILED" -ForegroundColor Red }
