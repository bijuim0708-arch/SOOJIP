$ErrorActionPreference = "Stop"
$secureKey = Read-Host "열린국회정보에서 발급받은 인증키를 입력하세요. 화면·파일에 저장되지 않습니다" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($plainKey)) { throw "인증키가 입력되지 않았습니다." }
  $env:SUNEUM_ASSEMBLY_API_KEY = $plainKey
  & node "$PSScriptRoot\server.mjs"
} finally {
  if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  Remove-Item Env:SUNEUM_ASSEMBLY_API_KEY -ErrorAction SilentlyContinue
  $plainKey = $null
}
