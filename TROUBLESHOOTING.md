# CSV Upload Validation Issues - Troubleshooting Guide

## Common Issues and Solutions

### 1. **Column Header Problems**
**Issue**: "Missing required columns: name, email, section"

**Solution**: Ensure your Excel file has these exact column headers (case-sensitive, lowercase):
```
name | email | section | subject | message
```

### 2. **Empty Required Fields**
**Issue**: "Row X: Name/Email/Section is required"

**Solution**: Make sure every row has:
- Non-empty name
- Non-empty email address
- Non-empty section

### 3. **Invalid Email Format**
**Issue**: "Row X: Invalid email format"

**Solution**: Ensure all email addresses follow the format: `user@domain.com`
- Must contain @ symbol
- Must have domain extension (.com, .org, etc.)
- No spaces or special characters

### 4. **Campaign ID Missing**
**Issue**: "Campaign ID is required"

**Solution**: 
- Create a campaign first in the UI
- Use a valid campaign ID when uploading
- Default campaign ID is 1

### 5. **Server Not Running**
**Issue**: Connection refused or server unreachable

**Solution**: Start the development server:
```bash
npm run dev
```

### 6. **File Format Issues**
**Issue**: Excel file not parsing correctly

**Solution**: 
- Use .xlsx format (not .xls)
- Ensure file is not corrupted
- Save with UTF-8 encoding if possible

## Testing Your File

1. Use the debug script to test your Excel file:
```bash
node debug-csv.js
```

2. Use the corrected sample file `test-corrected.xlsx` as a reference

## Excel File Template

Your Excel file should look like this:

| name        | email                    | section | subject              | message                  |
|-------------|-------------------------|---------|---------------------|-------------------------|
| John Smith  | john.smith@example.com  | CSE     | Welcome Message     | Dear John, welcome!     |
| Jane Doe    | jane.doe@example.com    | ECE     | Workshop Invite     | Hi Jane, join us!       |

## Steps to Fix

1. **Check server logs** - Look for detailed error messages in the terminal
2. **Verify file format** - Use the debug script to test your Excel file
3. **Check authentication** - Make sure you're logged in to the system
4. **Verify campaign exists** - Create a campaign before uploading students
5. **Test with sample file** - Use the provided `test-corrected.xlsx`

## Debug Commands

```bash
# Test Excel parsing directly
node debug-csv.js

# Check server is running
curl http://localhost:5000/api/health

# Test upload with curl (if server is running)
curl -X POST http://localhost:5000/api/upload-csv \
     -F "file=@test-corrected.xlsx" \
     -F "campaignId=1"
```
