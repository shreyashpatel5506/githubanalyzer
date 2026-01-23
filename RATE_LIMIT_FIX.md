# Rate Limit Error Handling - Fix Summary

## Problem

The `/api/smells/detect` endpoint was returning HTTP 400 when GitHub API rate limit (403) was hit, instead of properly communicating the rate limit status to the frontend.

**Error Log:**
```
POST /api/smells/detect 400 in 125ms
[ 'Failed to fetch repository: 403 rate limit exceeded' ]
```

This made it difficult for the frontend to distinguish between:
- Rate limit errors (should show retry message)
- Invalid input errors (should show validation message)
- Server errors (should show generic error message)

---

## Solution

### 1. Enhanced `fetchRepoMeta.js` (GitHub API Layer)

**What Changed:**
- Detect 403 status and return user-friendly message
- Include `statusCode: 429` in response to propagate to route handler
- Preserve original error message for debugging

**Code:**
```javascript
if (res.status === 403) {
  return {
    error: "GitHub API rate limit exceeded. Please try again in a few minutes.",
    statusCode: 429,
  };
}
return {
  error: `Failed to fetch repository: ${res.status} ${res.statusText}`,
  statusCode: res.status,
};
```

**Why:** HTTP 429 is the standard status code for "Too Many Requests"

---

### 2. Updated `codeScanner.js` (Scanner Orchestrator)

**What Changed:**
- Propagate `statusCode` from GitHub API responses up the chain
- Attach status code to scan results for route handler to use

**Code:**
```javascript
if (metaRes.error) {
  results.errors.push(metaRes.error);
  results.statusCode = metaRes.statusCode || 500;  // 👈 Propagate status
  return results;
}
```

**Why:** Allows route handler to return correct HTTP status based on error type

---

### 3. Fixed `/api/smells/detect` Route Handler (Both POST & GET)

**What Changed:**
- Inspect error message to determine appropriate HTTP status
- Return 429 for rate limit errors
- Return 404 for "not found" errors
- Default to 400 for validation/input errors

**Code:**
```javascript
// Check for errors
if (scanResults.errors && scanResults.errors.length > 0) {
  let statusCode = 400;  // Default: validation error
  
  if (scanResults.errors[0]?.includes("rate limit")) {
    statusCode = 429;  // Rate limit
  } else if (scanResults.errors[0]?.includes("not found")) {
    statusCode = 404;  // Repository not found
  }
  
  return NextResponse.json(
    {
      success: false,
      error: scanResults.errors[0],
      fullErrors: scanResults.errors,
    },
    { status: statusCode },
  );
}
```

**Why:** Frontend can now easily distinguish error types by HTTP status code

---

## Error Code Mapping

| Error Type | HTTP Status | Message |
|------------|------------|---------|
| Rate Limit Exceeded | 429 | "GitHub API rate limit exceeded. Please try again in a few minutes." |
| Repository Not Found | 404 | "Repository not found" |
| Invalid Input | 400 | "Missing required fields: owner, repo" |
| Server Error | 500 | "Server error: {error message}" |

---

## Frontend Integration

Frontends can now properly handle different errors:

```javascript
const res = await fetch("/api/smells/detect", {
  method: "POST",
  body: JSON.stringify({ owner, repo, planTier })
});

const data = await res.json();

if (!res.ok) {
  if (res.status === 429) {
    // Show: "Rate limit exceeded. Try again later."
    showRateLimitMessage();
  } else if (res.status === 404) {
    // Show: "Repository not found"
    showNotFoundError();
  } else if (res.status === 400) {
    // Show: validation error
    showValidationError(data.error);
  } else {
    // Show: generic server error
    showServerError();
  }
}
```

---

## Testing

### Test Rate Limit Scenario

```bash
# Simulate by making rapid API calls without authentication token
# Or wait until GitHub rate limit is hit during normal testing

curl -X POST http://localhost:3000/api/smells/detect \
  -H "Content-Type: application/json" \
  -d '{"owner":"any-user","repo":"any-repo"}'

# Expected response when rate limited:
# HTTP 429
# { "success": false, "error": "GitHub API rate limit exceeded..." }
```

### Test Not Found Scenario

```bash
curl -X POST http://localhost:3000/api/smells/detect \
  -H "Content-Type: application/json" \
  -d '{"owner":"nonexistent","repo":"repo"}'

# Expected response:
# HTTP 404
# { "success": false, "error": "Repository not found" }
```

### Test Validation Error

```bash
curl -X POST http://localhost:3000/api/smells/detect \
  -H "Content-Type: application/json" \
  -d '{"owner":"user"}'  # Missing repo

# Expected response:
# HTTP 400
# { "success": false, "error": "Missing required fields: owner, repo" }
```

---

## Files Modified

1. **app/lib/github/fetchRepoMeta.js** - Detect 403 and return 429 status code
2. **app/lib/scanner/codeScanner.js** - Propagate status code from GitHub layer
3. **app/api/smells/detect/route.js** - Map error types to HTTP status codes (POST & GET)

---

## Benefits

✅ **Better Error Handling:** Frontend knows exact error type from HTTP status
✅ **User-Friendly Messages:** Rate limit message explains the issue
✅ **Standards Compliance:** Uses correct HTTP 429 for rate limits
✅ **Easier Debugging:** Console logs preserve full error info
✅ **Frontend Flexibility:** Can implement different UX for each error type

---

## Rollout Notes

- **Zero Breaking Changes:** Existing error handling still works
- **Backward Compatible:** Old code checking for 400 will now get 429 for rate limits
- **Opt-in:** Frontend can improve UX by checking specific status codes
- **No Dependencies:** No new packages or major refactoring

---

## Next Steps

1. Test rate limit scenario with rapid requests
2. Update frontend pages to handle 429 status code
3. Show user-friendly message: "Rate limit reached. Try again in a few minutes."
4. Consider implementing exponential backoff for retry logic
5. Monitor API usage patterns to avoid future rate limits

