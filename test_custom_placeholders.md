# Custom Placeholders Fix - Test Guide

## The Issue
Dynamic placeholders like `{{Rollno}}` from custom Excel columns weren't being replaced with actual data when sending bulk emails. Instead, they were appearing as literal `{{rollno}}` text in the sent emails.

## Root Cause
The issue was in the `/api/send-bulk` route where:
1. The backend wasn't getting the `campaignId` parameter from the frontend
2. Without `campaignId`, it was fetching ALL students from ALL campaigns
3. Students from other campaigns don't have the same custom fields, so placeholder replacement failed

## The Fix

### Backend Changes (`server/routes.ts`)
1. **Updated `/api/send-bulk` route** to accept `campaignId` parameter
2. **Modified student fetching** to filter by campaign:
   ```typescript
   // Before: fetched all students regardless of campaign
   students = await storage.getStudents();
   
   // After: filter by campaign if provided
   students = await storage.getStudents(campaignId ? parseInt(campaignId.toString()) : undefined);
   ```

### Frontend Changes (`client/src/components/EmailComposer.tsx`)
1. **Updated mutation type** to include `campaignId`
2. **Modified `handleSendBulk`** to pass `campaignId`:
   ```typescript
   sendBulkMutation.mutate({
     subject,
     message,
     targetSection: selectedSection,
     campaignId, // Added this line
   });
   ```

## How to Test

### 1. Create Test Excel File with Custom Columns
Create an Excel file (`test_students.xlsx`) with columns:
```
Name          | Email              | Section | Rollno | CGPA | Department
John Doe      | john@test.com      | CSE     | 2001   | 8.5  | Computer Science
Jane Smith    | jane@test.com      | CSE     | 2002   | 9.0  | Computer Science
Bob Johnson   | bob@test.com       | ECE     | 3001   | 7.8  | Electronics
```

### 2. Test Steps
1. **Create a new campaign** (e.g., "Placement Test")
2. **Upload the Excel file** to this campaign
3. **Verify placeholders show up** in the EmailComposer - you should see:
   - `{{Name}}`
   - `{{Email}}`
   - `{{Section}}`
   - `{{Rollno}}` ✨
   - `{{Cgpa}}` ✨
   - `{{Department}}` ✨

4. **Compose test email** with custom placeholders:
   ```
   Subject: Placement Update for {{Name}} - Roll No: {{Rollno}}
   
   Dear {{Name}},
   
   Your details:
   - Roll Number: {{Rollno}}
   - CGPA: {{Cgpa}}
   - Department: {{Department}}
   - Section: {{Section}}
   
   Best regards,
   Placement Team
   ```

5. **Send test email** first to verify replacement works
6. **Send bulk email** to verify all students get personalized emails

### 3. Expected Results

**Before Fix:**
```
Subject: Placement Update for John Doe - Roll No: {{Rollno}}

Dear John Doe,

Your details:
- Roll Number: {{Rollno}}     ❌ Not replaced
- CGPA: {{Cgpa}}             ❌ Not replaced  
- Department: {{Department}}  ❌ Not replaced
- Section: CSE
```

**After Fix:**
```
Subject: Placement Update for John Doe - Roll No: 2001

Dear John Doe,

Your details:
- Roll Number: 2001          ✅ Correctly replaced
- CGPA: 8.5                  ✅ Correctly replaced
- Department: Computer Science ✅ Correctly replaced
- Section: CSE
```

## Technical Details

### Placeholder Transformation
Excel columns are transformed to placeholder names using this logic:
- `rollno` → `{{Rollno}}` (capitalize first letter)
- `student_id` → `{{Student_id}}` (capitalize first letter)
- `cgpa` → `{{Cgpa}}`

### Debugging
You can check the console logs in the backend to see:
- `🏷️ Available placeholders for [student name]: [list of placeholders]`
- This will show exactly what placeholders are being generated for each student

### Campaign-Specific Data
The fix ensures that:
1. Only students from the selected campaign are processed
2. All students in a campaign have the same custom field structure
3. Placeholder replacement works consistently across all emails in a campaign

## Additional Notes
- The fix is backward compatible - existing functionality still works
- Standard placeholders (Name, Email, Section) continue to work as before
- Dynamic placeholders are generated based on the actual Excel columns uploaded
- Empty or null values in custom fields are handled gracefully
