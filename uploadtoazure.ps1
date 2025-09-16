# Load .env file (skip comments and blanks)
$envFile = Join-Path $PSScriptRoot "\.env"
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }      # skip comments
    if ($_ -match '^\s*$') { return }      # skip blanks
    $parts = $_ -split '=', 2
    $name  = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')   # remove surrounding quotes if present
    Set-Variable -Name $name -Value $value -Scope Script
}

$AccountName = $AZURE_STORAGE_ACC
$TableName   = $AZURE_STORAGE_TABLE
$SasToken    = $AZURE_SAS_TOKEN
$JsonPath    = Join-Path $PSScriptRoot "\backend\data.json"

# === helpers ===
function New-TimeKeys([datetime]$dt) {
    [pscustomobject]@{
        PartitionKey = $dt.ToString("yy-MM-dd HH")
        RowKey       = $dt.ToString("yy-MM-dd HH:mm:ss")
    }
}

function New-TableHeaders {
    @{
        "x-ms-version" = "2024-11-04"   # must be <= SAS sv
        "x-ms-date"    = (Get-Date).ToUniversalTime().ToString("R")
        "Accept"       = "application/json;odata=nometadata"
        "Prefer"       = "return-no-content"
    }
}

# flatten nested objects into simple props (arrays → JSON strings)
function Flatten($obj, $prefix = "") {
    $flat = @{}
    foreach ($p in $obj.PSObject.Properties) {
        $name = if ($prefix) { "${prefix}_$($p.Name)" } else { $p.Name }
        $val  = $p.Value
        if ($val -is [pscustomobject]) {
            $nested = Flatten $val $name
            foreach ($kv in $nested.PSObject.Properties) {
                $flat[$kv.Name] = $kv.Value
            }
        } elseif ($val -is [System.Collections.IEnumerable] -and -not ($val -is [string])) {
            $flat[$name] = ($val | ConvertTo-Json -Compress -Depth 10)
        } else {
            $flat[$name] = $val
        }
    }
    return [pscustomobject]$flat
}

# === load JSON ===
$entities = Get-Content -Raw -LiteralPath $JsonPath | ConvertFrom-Json
if ($entities -isnot [System.Collections.IEnumerable] -or $entities -is [string]) { $entities = @($entities) }

$token = $SasToken.TrimStart('?')
$uri   = "https://$AccountName.table.core.windows.net/$TableName`?$token"

# === insert ===
$base = Get-Date
$i = 0
foreach ($e in $entities) {
    $keys = New-TimeKeys ($base.AddSeconds($i))
    $flat = Flatten $e
    $flat | Add-Member PartitionKey $keys.PartitionKey -Force
    $flat | Add-Member RowKey       $keys.RowKey       -Force

    try {
        Invoke-RestMethod -Method POST -Uri $uri -Headers (New-TableHeaders) `
            -ContentType "application/json" -Body ($flat | ConvertTo-Json -Depth 10) | Out-Null
        Write-Host "Inserted RowKey=$($keys.RowKey)"
    } catch {
        Write-Warning ("Insert failed: {0} {1}" -f $_.Exception.Response.StatusCode.value__, $_.Exception.Response.StatusDescription)
        if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
        break
    }
    $i++
}
