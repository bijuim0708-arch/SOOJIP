$ErrorActionPreference = "Stop"

$secureKey = Read-Host "Enter the Open Assembly API key. The key will not be saved or displayed" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
$plainKey = $null

try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($plainKey)) {
    throw "API key was not entered."
  }

  $env:SUNEUM_ASSEMBLY_API_KEY = $plainKey.Trim()
  & node "$PSScriptRoot\assembly-diagnostic.mjs"
  exit $LASTEXITCODE
}
finally {
  Remove-Item Env:SUNEUM_ASSEMBLY_API_KEY -ErrorAction SilentlyContinue
  if ($pointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
  $plainKey = $null
}
