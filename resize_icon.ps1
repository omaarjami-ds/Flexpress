Add-Type -AssemblyName System.Drawing
$sourcePath = "c:\projet\projet delevery\frontend\electron\assets\logo.png"
$destPath = "c:\projet\projet delevery\frontend\electron\resources\icon.png"

$source = [System.Drawing.Image]::FromFile($sourcePath)
$newImg = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($newImg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($source, 0, 0, 256, 256)
$newImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$newImg.Dispose()
$source.Dispose()
write-host "Image resized successfully to 256x256"
