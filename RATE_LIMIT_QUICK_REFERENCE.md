#** Rate Limit Fix - Quick Reference

## What Was Fixed

**Problem:** Rate limit errors (403) were returned as HTTP 400 instead of 429

**Solution:** 
- Detect 403 from GitHub API
- Convert to HTTP 429 ("Too Many Requests")
- Return user-friendly message

---

## Modified Files

| File | Change |
|------|--------|
| `lib/github/fetchRepoMeta.js` | Detect 403, return 429 status code + message |
| `lib/scanner/codeScanner.js` | Propagate status code from GitHub layer |
| `app/api/smells/detect/route.js` | Map errors to correct HTTP status codes (POST + GET) |

---

## Error Responses

### Rate Limit (429)
```json
{
  "success": false,
  "error": "GitHub API rate limit exceeded. Please try again in a few minutes.",
  "fullErrors": [...]
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Repository not found",
  "fullErrors": [...]
}
```

### Invalid Input (400)
```json
{
  "success": false,
  "error": "Missing required fields: owner, repo",
  "fullErrors": [...]
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Server error: {message}",
  "fullErrors": [...]
}
```

---

## Frontend Usage

```javascript
const res = await fetch("/api/smells/detect", {
  method: "POST",
  body: JSON.stringify({ owner, repo, planTier })
});

if (res.status === 429) {
  // Show: "Rate limit reached. Try again in a few minutes."
} else if (res.status === 404) {
  // Show: "Repository not found"
} else if (res.status === 400) {
  // Show: Validation error
} else if (!res.ok) {
  // Show: Generic error
}
```

---

## Testing

Rate limit triggers when:
- Making rapid requests without authentication
- Hitting GitHub's API limit (60 req/hr unauthenticated, 5000 req/hr authenticated)

**Expected:** HTTP 429 response with rate limit message

---

## Status Code Mapping

```
403 (GitHub) → 429 (Our API) = Rate Limit
404 (GitHub) → 404 (Our API) = Not Found
Other errors → 400-500 (Our API) = Validation/Server
```

