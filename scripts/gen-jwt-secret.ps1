$ErrorActionPreference = "Stop"

# Generate a cryptographically secure 256-bit secret and print it as Base64.
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$secret = [Convert]::ToBase64String($bytes)

Write-Output $secret
