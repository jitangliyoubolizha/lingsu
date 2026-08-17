# 自动生成：从 Fontsource CDN 下载 Noto Sans SC / Noto Serif SC 变量字体并自托管到 public/fonts
# 用法：powershell -ExecutionPolicy Bypass -File scripts/vendor-fonts.ps1
param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$fonts = @(
  @{
    Name    = 'noto-sans-sc'
    Package = '@fontsource-variable/noto-sans-sc@5.3.0'
    Family  = 'Noto Sans SC'
  },
  @{
    Name    = 'noto-serif-sc'
    Package = '@fontsource-variable/noto-serif-sc@5.3.0'
    Family  = 'Noto Serif SC'
  }
)

foreach ($font in $fonts) {
  $fontDir = Join-Path $Root "public\fonts\$($font.Name)"
  $filesDir = Join-Path $fontDir 'files'
  New-Item -ItemType Directory -Force -Path $filesDir | Out-Null

  $cssUrl = "https://cdn.jsdelivr.net/npm/$($font.Package)/index.css"
  Write-Host "Downloading CSS: $cssUrl"
  $css = (Invoke-WebRequest -Uri $cssUrl -Headers @{ 'User-Agent' = 'Mozilla/5.0' } -UseBasicParsing -TimeoutSec 60).Content

  # 统一 family 名称：去掉 Variable，保持项目样式表原有的字体名
  $variableFamily = $font.Family + ' Variable'
  $css = $css.Replace("'$variableFamily'", "'$($font.Family)'")

  $urls = [regex]::Matches($css, 'url\((\./files/[^)]+\.woff2)\)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique

  Write-Host "Found $($urls.Count) woff2 files for $($font.Family)"
  $count = 0
  foreach ($rel in $urls) {
    $relative = $rel.TrimStart('./')
    if ($relative.StartsWith('files/')) {
      $relative = $relative.Substring('files/'.Length)
    }
    $dest = Join-Path $filesDir ($relative -replace '/', '\')
    if (-not (Test-Path -LiteralPath $dest)) {
      $fileUrl = "https://cdn.jsdelivr.net/npm/$($font.Package)/files/$relative"
      Invoke-WebRequest -Uri $fileUrl -Headers @{ 'User-Agent' = 'Mozilla/5.0' } -OutFile $dest -UseBasicParsing -TimeoutSec 60
      $count++
    }
  }

  $cssPath = Join-Path $fontDir 'index.css'
  [System.IO.File]::WriteAllText($cssPath, $css, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Saved $cssPath (downloaded $count new files)"
}

Write-Host 'Font vendoring complete.'