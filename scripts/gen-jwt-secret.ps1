$ErrorActionPreference = "Stop"

# Generate a cryptographically secure 256-bit secret and print it as Base64.
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng.GetBytes($bytes)
}
finally {
    $rng.Dispose()
}
$secret = [Convert]::ToBase64String($bytes)

Write-Output $secret
