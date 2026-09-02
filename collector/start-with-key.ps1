$ErrorActionPreference = "Stop"
$secureKey = Read-Host "Enter the Open Assembly API key. It will not be saved to a file" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($plainKey)) { throw "API key was not entered." }
  $env:SUNEUM_ASSEMBLY_API_KEY = $plainKey
  & node "$PSScriptRoot\server.mjs"
} finally {
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  Remove-Item Env:SUNEUM_ASSEMBLY_API_KEY -ErrorAction SilentlyContinue
  $plainKey = $null
}
