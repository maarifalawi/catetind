# compress-image.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Menyelamatkan screenshot yang ditolak saat di-upload ke chat/issue:
# "You have uploaded an unsupported image".
#
# Penyebabnya hampir selalu DIMENSI, bukan ekstensi:
#   · screenshot full-page browser (mis. 1440×11425)
#   · screenshot 4K / layar Retina (3840×2160+)
#   · foto/tangkapan layar HP (1080×2400, sering >5 MB)
#
# Alat ini:
#   1. mengecilkan gambar ke batas aman (default lebar 1600, tinggi 2000)
#   2. mengompres ke JPEG (default quality 82) supaya ringan
#   3. opsional `-Slice` untuk memotong gambar tinggi jadi beberapa bagian
#      yang masing-masing masih terbaca (bukan dikecilkan sampai tak terbaca)
#
# Pakai:
#   powershell -ExecutionPolicy Bypass -File scripts/tools/compress-image.ps1 ^
#     -Path "C:\path\gambar.png"
#
#   # gambar tinggi (full page) → dipotong jadi beberapa bagian
#   powershell -ExecutionPolicy Bypass -File scripts/tools/compress-image.ps1 ^
#     -Path "C:\path\full-page.png" -Slice -MaxHeight 1800 -MaxWidth 1200
#
# Hasil ditulis di samping file asli: `<nama>-web.jpg` atau `<nama>-part1.jpg`, …
# ─────────────────────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$OutDir,
  [int]$MaxWidth = 1600,
  [int]$MaxHeight = 2000,
  [int]$Quality = 82,
  [switch]$Slice
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Path)) {
  throw "File tidak ditemukan: $Path"
}

$source = (Resolve-Path -LiteralPath $Path).Path
if (-not $OutDir) { $OutDir = Split-Path -Parent $source }
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($source)

# Encoder JPEG + kualitas
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality
)

function Save-JpegChunk {
  param(
    [System.Drawing.Image]$Source,
    [System.Drawing.Rectangle]$Rect,
    [int]$TargetW,
    [int]$TargetH,
    [string]$OutFile
  )

  $chunk = New-Object System.Drawing.Bitmap($TargetW, $TargetH)
  $graphics = [System.Drawing.Graphics]::FromImage($chunk)
  # JPEG tidak punya alpha: isi latar putih dulu supaya area transparan tidak hitam
  $graphics.Clear([System.Drawing.Color]::White)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage(
    $Source,
    (New-Object System.Drawing.Rectangle(0, 0, $TargetW, $TargetH)),
    $Rect,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $graphics.Dispose()

  $chunk.Save($OutFile, $codec, $encoderParams)
  $chunk.Dispose()

  $bytes = (Get-Item -LiteralPath $OutFile).Length
  "  $OutFile ($TargetW x $TargetH, $([math]::Round($bytes / 1MB, 2)) MB)"
}

$image = [System.Drawing.Image]::FromFile($source)
try {
  $w = $image.Width
  $h = $image.Height
  Write-Host "Sumber: $source ($w x $h)"

  # Skala turun supaya lebar aman. Untuk mode -Slice, tinggi tidak dipaksa turun;
  # gambar dipotong supaya teks tetap terbaca.
  $scale = [math]::Min(1.0, $MaxWidth / $w)
  $scaledW = [int][math]::Round($w * $scale)
  $scaledH = [int][math]::Round($h * $scale)

  if ($Slice -and $h -gt $MaxHeight) {
    $parts = [int][math]::Ceiling($scaledH / $MaxHeight)
    Write-Host "Tinggi $scaledH px > $MaxHeight px -> dipotong $parts bagian"

    for ($i = 0; $i -lt $parts; $i++) {
      $y = $i * $MaxHeight
      $chunkH = [int][math]::Min($MaxHeight, $scaledH - $y)

      # Sumber diambil pada resolusi asli, lalu diskalakan saat digambar,
      # supaya tidak ada penurunan kualitas dua kali.
      $sourceRect = New-Object System.Drawing.Rectangle(
        0,
        [int][math]::Round($y / $scale),
        $w,
        [int][math]::Round($chunkH / $scale)
      )
      $outFile = Join-Path $OutDir ("{0}-part{1}.jpg" -f $baseName, ($i + 1))
      Save-JpegChunk -Source $image -Rect $sourceRect -TargetW $scaledW -TargetH $chunkH -OutFile $outFile |
        ForEach-Object { Write-Host $_ }
    }
  }
  else {
    $targetW = $scaledW
    $targetH = $scaledH

    # Kalau masih terlalu tinggi (bukan mode slice), kecilkan lagi proporsional
    if ($targetH -gt $MaxHeight) {
      $extra = $MaxHeight / $targetH
      $targetW = [int][math]::Round($targetW * $extra)
      $targetH = $MaxHeight
    }

    $outFile = Join-Path $OutDir ("{0}-web.jpg" -f $baseName)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    # Trik: gambar ke kanvas target langsung (bukan dua tahap)
    $canvas = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage(
      $image,
      (New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)),
      $rect,
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $graphics.Dispose()
    $canvas.Save($outFile, $codec, $encoderParams)
    $canvas.Dispose()

    $bytes = (Get-Item -LiteralPath $outFile).Length
    Write-Host "  $outFile ($targetW x $targetH, $([math]::Round($bytes / 1MB, 2)) MB)"
  }
}
finally {
  $image.Dispose()
}
