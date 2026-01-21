$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot '..\static\android-chrome-512x512.png'
$out40 = Join-Path $PSScriptRoot '..\static\favicon-40x40.png'
$out80 = Join-Path $PSScriptRoot '..\static\favicon-80x80.png'

$img = [System.Drawing.Image]::FromFile($src)

function ResizePng([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $size, $size)
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

ResizePng 40 $out40
ResizePng 80 $out80

$img.Dispose()
