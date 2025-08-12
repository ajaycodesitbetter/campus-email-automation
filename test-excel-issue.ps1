# Simple test to identify Excel upload issue
$csvFile = "test-comparison.csv"
$excelFile = "test-students-full.xlsx"
$uri = "http://localhost:5000/api/upload-csv"

function Test-Upload($filepath, $typename) {
    Write-Host "`nTesting $typename file: $filepath" -ForegroundColor Cyan
    
    if (-not (Test-Path $filepath)) {
        Write-Host "File not found!" -ForegroundColor Red
        return
    }
    
    $fileBinary = [System.IO.File]::ReadAllBytes($filepath)
    $fileName = [System.IO.Path]::GetFileName($filepath)
    $boundary = [System.Guid]::NewGuid().ToString()
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"campaignId`"`r`n",
        "1",
        "--$boundary", 
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: application/octet-stream`r`n",
        [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBinary),
        "--$boundary--"
    ) -join "`r`n"
    
    $body = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetBytes($bodyLines)
    
    try {
        Write-Host "Uploading..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $uri -Method Post -Body $body -ContentType "multipart/form-data; boundary=$boundary"
        Write-Host "SUCCESS: $($response.StatusCode)" -ForegroundColor Green
        $response.Content | ConvertFrom-Json | Format-List
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorResponse = $reader.ReadToEnd()
            Write-Host "Error response: $errorResponse" -ForegroundColor Red
            $reader.Close()
        }
    }
}

Write-Host "Comparing CSV vs Excel uploads..." -ForegroundColor Magenta

Test-Upload $csvFile "CSV"
Test-Upload $excelFile "Excel"
