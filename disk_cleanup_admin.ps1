$ErrorActionPreference = 'Continue'
$log = "$env:LOCALAPPDATA\disk_cleanup.log"
$null = New-Item -Path $log -ItemType File -Force

function Log {
    param([string]$msg)
    $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
    Add-Content -LiteralPath $log -Value $line
    Write-Host $line
}

# Verify admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Log "Admin: $isAdmin"
if (-not $isAdmin) { Log "ERROR: not elevated"; exit 1 }

$startFree = (Get-PSDrive C).Free
Log ("Free at start: {0:N2} GB" -f ($startFree/1GB))

# ===== Part 1: DISM Component Cleanup =====
Log "==================="
Log "Part 1: DISM Component Cleanup"
Log "==================="

Log "Running: DISM /Online /Cleanup-Image /AnalyzeComponentStore"
$out = & DISM.exe /Online /Cleanup-Image /AnalyzeComponentStore 2>&1
$out | ForEach-Object { Log $_ }

Log "Running: DISM /Online /Cleanup-Image /StartComponentCleanup"
$out = & DISM.exe /Online /Cleanup-Image /StartComponentCleanup 2>&1
$out | ForEach-Object { Log $_ }

$afterDism = (Get-PSDrive C).Free
Log ("Free after DISM: {0:N2} GB  (recovered: {1:N2} GB)" -f ($afterDism/1GB), (($afterDism-$startFree)/1GB))

# ===== Part 2: Windows\Installer orphan scan + quarantine =====
Log "==================="
Log "Part 2: Windows\Installer orphan scan"
Log "==================="

$refs = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)

# Walk UserData\<SID>\Products\<GUID>\InstallProperties\LocalPackage
# And UserData\<SID>\Patches\<PatchGUID>\LocalPackage
# And UserData\<SID>\Products\<GUID>\Patches\<PatchGUID>\LocalPackage
$userDataRoot = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData'
$sids = Get-ChildItem $userDataRoot -ErrorAction SilentlyContinue
foreach ($sid in $sids) {
    # Products
    $productsKey = Join-Path $sid.PSPath 'Products'
    $prodChildren = Get-ChildItem $productsKey -ErrorAction SilentlyContinue
    foreach ($prod in $prodChildren) {
        $ip = Get-ItemProperty (Join-Path $prod.PSPath 'InstallProperties') -ErrorAction SilentlyContinue
        if ($ip -and $ip.LocalPackage) { [void]$refs.Add($ip.LocalPackage) }
        # Per-product patches
        $patchSub = Get-ChildItem (Join-Path $prod.PSPath 'Patches') -ErrorAction SilentlyContinue
        foreach ($p in $patchSub) {
            $pp = Get-ItemProperty $p.PSPath -ErrorAction SilentlyContinue
            if ($pp -and $pp.LocalPackage) { [void]$refs.Add($pp.LocalPackage) }
        }
    }
    # Patches top-level
    $patchesKey = Join-Path $sid.PSPath 'Patches'
    $patchChildren = Get-ChildItem $patchesKey -ErrorAction SilentlyContinue
    foreach ($p in $patchChildren) {
        $pp = Get-ItemProperty $p.PSPath -ErrorAction SilentlyContinue
        if ($pp -and $pp.LocalPackage) { [void]$refs.Add($pp.LocalPackage) }
    }
}
Log ("Referenced installer files in registry: {0}" -f $refs.Count)

# Enumerate Windows\Installer
$installerDir = "C:\Windows\Installer"
$orphans = New-Object System.Collections.ArrayList
$totalSize = 0
$orphanSize = 0
$referencedSize = 0
Get-ChildItem $installerDir -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '\.(msi|msp)$' } | ForEach-Object {
    $totalSize += $_.Length
    if ($refs.Contains($_.FullName)) {
        $referencedSize += $_.Length
    } else {
        $orphanSize += $_.Length
        [void]$orphans.Add($_)
    }
}
Log ("Total .msi/.msp size:  {0:N2} GB" -f ($totalSize/1GB))
Log ("Referenced size:       {0:N2} GB" -f ($referencedSize/1GB))
Log ("Orphan size:           {0:N2} GB ({1} files)" -f ($orphanSize/1GB), $orphans.Count)

# Move orphans to quarantine
$quarantine = "C:\InstallerQuarantine"
if (-not (Test-Path $quarantine)) {
    New-Item -Path $quarantine -ItemType Directory -Force | Out-Null
    # Set hidden attribute
    (Get-Item $quarantine -Force).Attributes = 'Directory,Hidden'
}
$moved = 0
$movedBytes = 0
foreach ($f in $orphans) {
    try {
        $dest = Join-Path $quarantine $f.Name
        Move-Item -LiteralPath $f.FullName -Destination $dest -Force -ErrorAction Stop
        $moved++
        $movedBytes += $f.Length
    } catch {
        Log ("  failed to move: {0} ({1})" -f $f.Name, $_.Exception.Message)
    }
}
Log ("Moved to quarantine: {0} files, {1:N2} GB" -f $moved, ($movedBytes/1GB))

$afterAll = (Get-PSDrive C).Free
Log ("Free after orphan quarantine: {0:N2} GB" -f ($afterAll/1GB))
Log ("===================")
Log ("TOTAL recovered this run: {0:N2} GB" -f (($afterAll-$startFree)/1GB))
Log ("Quarantine folder: $quarantine")
Log ("If nothing breaks in 1 week, delete the quarantine folder to permanently free the space.")
Log ("DONE")
