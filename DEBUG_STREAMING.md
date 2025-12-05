# Debugging Streaming Feedback

## Current Status
- ✅ "Preparing evaluation..." shows (UI is rendering)
- ❌ Tips are not appearing (streaming not working)

## Debug Steps

### 1. Check Browser Console
Open Chrome DevTools (F12) → Console tab

**Look for these logs:**
```
🌊 Starting streaming with: {jobId: "...", requestId: "..."}
🌊 Fetching stream from: /api/evaluate/stream?jobId=...&requestId=...
🌊 Stream connected successfully
🌊 Received chunk: progress {...}
🌊 Received chunk: tip {...}
```

**If you see:**
- ❌ No "Starting streaming" log → Hook not triggering (jobId/requestId not set)
- ❌ "Stream response not OK" → API endpoint failing
- ❌ No "Received chunk" logs → Stream connected but no data coming through

### 2. Check Network Tab
Open Chrome DevTools (F12) → Network tab

**Filter by:** `stream`

**Look for:**
- Request to `/api/evaluate/stream?jobId=...&requestId=...`
- Type: `eventsource` or `fetch`
- Status: Should be `200` (pending/streaming)

**Click on the request → Preview/Response tab:**
- You should see SSE data chunks arriving in real-time
- Format: `data: {"type":"progress","data":{...}}`

### 3. Check Server Logs
In your terminal where `pnpm dev` is running:

**Look for:**
```
🌊 Stream endpoint called
🌊 Stream params: {jobId: "...", requestId: "..."}
🌊 Tips fetched: 10 tips
```

**If you see:**
- ❌ "Auth failed" → Authentication issue
- ❌ "Missing parameters" → jobId/requestId not being passed
- ❌ "Tips fetched: 0 tips" → Database query failing or no tips in DB
- ❌ "Tips fetched: undefined" → Database connection issue

### 4. Verify Database Tips
Run this to check tips exist:

```bash
cd /workspaces/InterviewApp
pnpm exec tsx --env-file=.env.local -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('streaming_tips').select('*').eq('is_active', true);
console.log('Active tips:', data?.length, error ? error.message : 'OK');
data?.forEach(tip => console.log('-', tip.tip_text.substring(0, 60)));
"
```

Expected output:
```
Active tips: 10 OK
- Your response is being analyzed by our AI evaluation system...
- We're checking your answer against industry best practices...
- Evaluations typically complete in 10-30 seconds...
...
```

## Common Issues & Fixes

### Issue 1: Hook Not Triggering
**Symptom:** No "Starting streaming" log in console

**Cause:** `jobId` and `requestId` are both null/undefined

**Fix:** Check that the evaluate API is returning these values:
```javascript
// In drill page handleSubmit, after API call:
console.log("📋 Evaluation queued:", responseData);
// Should log: {jobId: "...", requestId: "..."}
```

### Issue 2: 401 Unauthorized
**Symptom:** "Stream response not OK: 401"

**Cause:** Authentication cookies not being sent

**Fix:** The streaming endpoint uses server-side auth. Make sure:
1. User is logged in
2. Session is valid
3. Cookies are being sent with fetch request

### Issue 3: Tips Query Failing
**Symptom:** "Tips fetched: 0 tips" or error in server logs

**Possible causes:**
1. **RLS policies blocking read** → Check Supabase logs
2. **Table doesn't exist** → Run migration again
3. **All tips are inactive** → Check `is_active` column

**Fix:**
```sql
-- Check tips exist
SELECT COUNT(*) FROM streaming_tips WHERE is_active = true;

-- If 0, check if any tips exist at all
SELECT COUNT(*) FROM streaming_tips;

-- If still 0, re-run migration
```

### Issue 4: Stream Connects But No Data
**Symptom:** "Stream connected successfully" but no "Received chunk" logs

**Possible causes:**
1. Generator function not yielding
2. Stream closing early
3. Data format incorrect

**Fix:** Check server logs for errors in the generator function

### Issue 5: CORS or Network Error
**Symptom:** Network error in browser console

**Cause:** Proxy/CORS configuration

**Fix:** Check Next.js is running on correct port (3000) and no proxy blocking SSE

## Quick Test

To test the streaming endpoint directly:

```bash
# Get a session cookie from browser DevTools → Application → Cookies
# Then test the endpoint:

curl -v -H "Cookie: YOUR_SESSION_COOKIE" \
  "http://localhost:3000/api/evaluate/stream?jobId=test-123&requestId=test-456"
```

Expected output:
```
< HTTP/1.1 200 OK
< Content-Type: text/event-stream
< Cache-Control: no-cache, no-transform
< Connection: keep-alive

data: {"type":"progress","data":{"state":"processing"},"timestamp":1234567890}

data: {"type":"progress","data":{"state":"evaluating"},"timestamp":1234567891}

data: {"type":"tip","data":{"text":"Your response is being analyzed..."},"timestamp":1234567892}
...
```

## Next Steps

1. **Submit a response** and immediately open browser console
2. **Look for the logs** listed above
3. **Share the console output** if you see errors
4. **Check server terminal** for backend logs

The logs will tell us exactly where the streaming is failing!
