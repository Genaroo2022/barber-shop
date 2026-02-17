$ErrorActionPreference = "Stop"

function Get-StagedFiles {
    $insideRepo = cmd /c "git rev-parse --is-inside-work-tree 2>nul"
    if ($LASTEXITCODE -ne 0 -or $insideRepo -ne "true") {
        Write-Host "Not inside a git worktree. Skipping staged-file secret scan." -ForegroundColor Yellow
        return @()
    }

    $files = cmd /c "git diff --name-only --cached --diff-filter=ACMR 2>nul"
    if (-not $files) { return @() }
    return $files | Where-Object {
        $_ -and
        (Test-Path $_) -and
        ($_ -notmatch '^node_modules/') -and
        ($_ -notmatch '^dist/') -and
        ($_ -notmatch '^backend/target/') -and
        ($_ -notmatch '\.example$') -and
        ($_ -notmatch '^\.env\.docker\.example$')
    }
}

function IsPlaceholderValue([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return $true }
    return $value -match '^\$\{' -or
           $value -match '^<.*>$' -or
           $value -match 'REPLACE|CHANGE_ME|YOUR_|example|placeholder' -or
           $value -match '^\*+$'
}

$secretPatterns = @(
    'ghp_[A-Za-z0-9]{20,}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'sk-[A-Za-z0-9]{20,}',
    'AKIA[0-9A-Z]{16}',
    'ASIA[0-9A-Z]{16}',
    'xox[baprs]-[A-Za-z0-9-]{10,}',
    '-----BEGIN [A-Z ]*PRIVATE KEY-----',
    'AIza[0-9A-Za-z\-_]{35}',
    'EAACEdEose0cBA[0-9A-Za-z]+'
)

$sensitiveKeys = @(
    'JWT_SECRET_BASE64',
    'DB_PASSWORD',
    'POSTGRES_PASSWORD',
    'BOOTSTRAP_ADMIN_PASSWORD',
    'AWS_SECRET_ACCESS_KEY',
    'GITHUB_TOKEN',
    'OPENAI_API_KEY'
)

$violations = @()
$stagedFiles = Get-StagedFiles

foreach ($file in $stagedFiles) {
    $content = Get-Content -Raw -ErrorAction SilentlyContinue $file
    if ($null -eq $content) { continue }

    foreach ($pattern in $secretPatterns) {
        if ($content -match $pattern) {
            $violations += "$file => matched secret pattern: $pattern"
        }
    }

    $lines = Get-Content -ErrorAction SilentlyContinue $file
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        foreach ($key in $sensitiveKeys) {
            if ($line -match "^\s*$key\s*[:=]\s*(.+)\s*$") {
                $rawValue = $Matches[1].Trim().Trim('"').Trim("'")
                if (-not (IsPlaceholderValue $rawValue)) {
                    $violations += "${file}:$($i + 1) => suspicious hardcoded value for $key"
                }
            }
        }
    }
}

if ($violations.Count -gt 0) {
    Write-Host ""
    Write-Host "Secret scan failed. Possible secrets detected in staged files:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "If this is intentional for local testing, move values to untracked env files." -ForegroundColor Yellow
    exit 1
}

Write-Host "Secret scan passed." -ForegroundColor Green
exit 0
