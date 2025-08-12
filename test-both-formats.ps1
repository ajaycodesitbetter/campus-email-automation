# Test both CSV and Excel file uploads to identify the difference

function Test-FileUpload {
    param(
        [string]$FilePath,
        [string]$TestName
    )
    
    Write-Host "`n🧪 Testing $TestName" -ForegroundColor Cyan
    Write-Host "📁 File: $FilePath" -ForegroundColor Yellow
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return
    }
    
    $uri = "http://localhost:5000/api/upload-csv"
    
    # Get file info
    $fileInfo = Get-Item $FilePath
    Write-Host "  Size: $($fileInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "  Extension: $($fileInfo.Extension)" -ForegroundColor Gray
    
    # Read file as binary
    $fileBinary = [System.IO.File]::ReadAllBytes($FilePath)
    $fileName = [System.IO.Path]::GetFileName($FilePath)
    
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Determine content type based on extension
    $contentType = if ($fileInfo.Extension -eq ".xlsx") {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    } else {
        "text/csv"
    }
    
    Write-Host "  Content-Type: $contentType" -ForegroundColor Gray
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"campaignId`"$LF",
        "1",
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: $contentType$LF",
        [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBinary),
        "--$boundary--"
    ) -join $LF
    
    $body = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetBytes($bodyLines)
    
    try {
        Write-Host "🚀 Uploading..." -ForegroundColor Cyan
        $response = Invoke-WebRequest -Uri $uri -Method Post -Body $body -ContentType "multipart/form-data; boundary=$boundary" -TimeoutSec 30
        
        Write-Host "✅ SUCCESS!" -ForegroundColor Green
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        
        # Parse JSON response
        $jsonResponse = $response.Content | ConvertFrom-Json
        if ($jsonResponse.recordCount) {
            Write-Host "Records processed: $($jsonResponse.recordCount)" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ FAILED!" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response:" -ForegroundColor Yellow
                Write-Host $responseBody -ForegroundColor Red
                $reader.Close()
                
                # Try to parse as JSON to get detailed error
                try {
                    $errorJson = $responseBody | ConvertFrom-Json
                    if ($errorJson.details.errors) {
                        Write-Host "`n📋 Validation Errors:" -ForegroundColor Yellow
                        $errorJson.details.errors | ForEach-Object { Write-Host "  • $_" -ForegroundColor Red }
                    }
                } catch {
                    # Not JSON, just show raw response
                }
            } catch {
                Write-Host "Could not read error response" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host "🔍 COMPARING CSV vs EXCEL UPLOAD BEHAVIOR" -ForegroundColor Magenta
Write-Host "=" * 60

# Test CSV file
Test-FileUpload -FilePath "test-comparison.csv" -TestName "CSV File Upload"

# Test Excel file  
Test-FileUpload -FilePath "test-students-full.xlsx" -TestName "Excel File Upload"

Write-Host "`n🏁 Comparison Complete!" -ForegroundColor Magenta
