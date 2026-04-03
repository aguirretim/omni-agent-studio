# Plays a two-tone sine wave chime via SoundPlayer.
# Called by the Claude Code Stop hook in settings.local.json.
#
# WAV header is built as a raw byte array with explicit bitwise operations.
# BinaryWriter is NOT used -- its Write([int16]) overload resolves to Write(Int32)
# in PowerShell, writing 4 bytes instead of 2 and corrupting the fmt chunk.

# Check mute state before loading audio assembly.
# The app writes .claude/audio-enabled.txt ("0" = muted, "1" = enabled).
# File missing = default enabled.
$enabledFile = ".claude\audio-enabled.txt"
if (Test-Path $enabledFile) {
    $enabledRaw = (Get-Content $enabledFile -Raw).Trim()
    if ($enabledRaw -eq "0") { exit 0 }
}

Add-Type -AssemblyName System.Media

$SampleRate = 22050  # Hz, mono, 16-bit PCM

# --- helpers: write little-endian int16 / int32 into a byte array at offset ---
function Write-LE16([int]$v, [byte[]]$buf, [int]$off) {
    $buf[$off]     = [byte]($v -band 0xFF)
    $buf[$off + 1] = [byte](($v -shr 8) -band 0xFF)
}
function Write-LE32([int]$v, [byte[]]$buf, [int]$off) {
    $buf[$off]     = [byte]($v -band 0xFF)
    $buf[$off + 1] = [byte](($v -shr 8)  -band 0xFF)
    $buf[$off + 2] = [byte](($v -shr 16) -band 0xFF)
    $buf[$off + 3] = [byte](($v -shr 24) -band 0xFF)
}

# --- read volume from app-written config (0-100, default 40) ---
# The app writes .claude/audio-volume.txt via /api/audio when the slider changes.
# Max amplitude 5000: at 40% default -> 2000 (quiet), at 100% -> 5000.
$volPct = 40
$volFile = ".claude\audio-volume.txt"
if (Test-Path $volFile) {
    $raw = (Get-Content $volFile -Raw).Trim()
    $parsed = 0
    if ([int]::TryParse($raw, [ref]$parsed) -and $parsed -ge 0 -and $parsed -le 100) {
        $volPct = $parsed
    }
}
$Amplitude = [int](5000 * $volPct / 100)
if ($Amplitude -lt 1) { $Amplitude = 1 }

# --- generate mono 16-bit PCM for a sine tone with attack/release envelope ---
function New-Tone([double]$Frequency, [int]$DurationMs, [int]$Amp) {
    $n      = [int]($SampleRate * $DurationMs / 1000)
    $attack = [Math]::Max(1, [int]($n * 0.05))   # 5% attack
    $rel    = [Math]::Max(1, [int]($n * 0.15))   # 15% release
    $pcm    = [byte[]]::new($n * 2)

    for ($i = 0; $i -lt $n; $i++) {
        $env = if ($i -lt $attack) {
            $i / [double]$attack
        } elseif ($i -gt ($n - $rel)) {
            ($n - $i) / [double]$rel
        } else { 1.0 }

        $s = [int]($Amp * $env * [Math]::Sin(2 * [Math]::PI * $Frequency * $i / $SampleRate))
        $pcm[$i * 2]     = [byte]($s -band 0xFF)
        $pcm[$i * 2 + 1] = [byte](($s -shr 8) -band 0xFF)
    }
    return $pcm
}

# --- assemble WAV: 44-byte header + PCM payload ---
function New-WavBytes([byte[]]$pcm) {
    $dataLen = $pcm.Length
    $wav     = [byte[]]::new(44 + $dataLen)

    # RIFF chunk descriptor
    [System.Text.Encoding]::ASCII.GetBytes('RIFF').CopyTo($wav, 0)
    Write-LE32 ($dataLen + 36) $wav 4
    [System.Text.Encoding]::ASCII.GetBytes('WAVE').CopyTo($wav, 8)

    # fmt sub-chunk (16 bytes)
    [System.Text.Encoding]::ASCII.GetBytes('fmt ').CopyTo($wav, 12)
    Write-LE32 16           $wav 16   # sub-chunk size
    Write-LE16 1            $wav 20   # audio format: PCM
    Write-LE16 1            $wav 22   # channels: mono
    Write-LE32 $SampleRate  $wav 24   # sample rate
    Write-LE32 ($SampleRate * 2) $wav 28  # byte rate (SR * channels * bps/8)
    Write-LE16 2            $wav 32   # block align (channels * bps/8)
    Write-LE16 16           $wav 34   # bits per sample

    # data sub-chunk
    [System.Text.Encoding]::ASCII.GetBytes('data').CopyTo($wav, 36)
    Write-LE32 $dataLen $wav 40
    $pcm.CopyTo($wav, 44)

    return $wav
}

# Two-tone chime: A5 (880 Hz) then E6 (1320 Hz), separated by 50 ms silence.
$tone1 = New-Tone -Frequency 880  -DurationMs 250 -Amp $Amplitude
# Gap: use (samples * 2) so byte count is always even.
# SR * 2 * ms / 1000 = 22050*2*50/1000 = 2205 (odd) would misalign tone2 by 1 byte,
# swapping every sample's bytes and causing severe distortion.
$gapSamples = [int]($SampleRate * 50 / 1000)   # = 1102 samples
$gap        = [byte[]]::new($gapSamples * 2)    # = 2204 bytes (always even)
$tone2 = New-Tone -Frequency 1320 -DurationMs 350 -Amp $Amplitude

# Guard: every segment must have an even byte count so 16-bit sample pairs stay aligned.
foreach ($seg in @($tone1, $gap, $tone2)) {
    if ($seg.Length % 2 -ne 0) { throw "PCM segment byte count is odd ($($seg.Length)) - samples would be misaligned" }
}

$wavBytes = New-WavBytes -pcm ($tone1 + $gap + $tone2)
$stream   = [System.IO.MemoryStream]::new($wavBytes, 0, $wavBytes.Length, $false)
$player   = [System.Media.SoundPlayer]::new($stream)
$player.PlaySync()
$stream.Dispose()
