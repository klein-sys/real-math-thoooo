$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$project = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $project 'assets/game'
[IO.Directory]::CreateDirectory($destination) | Out-Null
$bundles = @{
  'pixel_medieval_dungeon_bundle.zip' = '(^pixel_medieval_v6/frames/.*\.png$|^pixel_dungeon_v7/frames/.*\.png$|README.*txt$)'
  'kiro 2.0.zip' = '(^spritesheets/.*\.png$|LICENSE|README)'
  'Fantasy_Creatures_Bundle.zip' = '(Emberwing_Dragon/ember/[^/]*\.(png|json)$|Rune_Golem/crystal/[^/]*\.(png|json)$|README.txt$|LICENSE.txt$)'
  'slime_essentials_4_slimes_v1.zip' = '(assets/animations/blue_slime/blue_slime_.*\.png$|README.txt$)'
  'DebtsInTheDepthsAssets.zip' = '(Characters/(sprGoblin1|sprWizard|sprLizardMonk1).png$|README|LICENSE)'
  'loot_essentials_24.zip' = '(assets/png/.*\.png$|README.txt$)'
}
foreach ($name in $bundles.Keys) {
  $zip = [IO.Compression.ZipFile]::OpenRead((Join-Path $project "assets/recipes/$name"))
  try {
    foreach ($entry in $zip.Entries) {
      if ($entry.FullName -notmatch $bundles[$name]) { continue }
      $prefix = [IO.Path]::GetFileNameWithoutExtension($name).Replace(' ', '_')
      $target = [IO.Path]::GetFullPath((Join-Path $destination "$prefix/$($entry.FullName)"))
      if (-not $target.StartsWith($destination + [IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe archive path' }
      [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    }
  } finally { $zip.Dispose() }
}
Write-Output 'Game assets extracted from the existing bundles.'
