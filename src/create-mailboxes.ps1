param (
    [Parameter(Mandatory = $true)] [string] $InputFile
)

#"Test String: $InputFile" | Write-Host
#Get-Location

#Get-Content -Path $InputFile | Write-Host

$ret = @{
    results = @()
} 

$ret.results +=  @{ name = "name1"; result = "result1" }
$ret.results +=  @{ name = "name1"; result = "result1" }


$ret | ConvertTo-Json | Write-Host