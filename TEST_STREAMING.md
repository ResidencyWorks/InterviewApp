# Testing Streaming Feedback

## Issue Fixed
The streaming UI wasn't showing tips because:
1. The streaming endpoint was looking for `request_id` using the `jobId` parameter
2. The hook wasn't passing the `requestId` to the endpoint
3. The endpoint needed to check both the job status API and the database

## Changes Made
1. **Streaming API** (`/api/evaluate/stream/route.ts`):
   - Now accepts both `jobId` and `requestId` parameters
   - Checks job status endpoint first (if jobId provided)
   - Falls back to checking evaluation_results table (if requestId provided)
   - Returns early when evaluation completes

2. **Hook** (`useEvaluationStream.ts`):
   - Now accepts both `jobId` and `requestId` parameters
   - Passes both to the streaming endpoint

3. **Drill Page** (`drill/[id]/page.tsx`):
   - Stores both `streamingJobId` and `streamingRequestId`
   - Passes both to the streaming hook
   - Clears both when evaluation completes

## How to Test

### 1. Start the Development Server
```bash
cd /workspaces/InterviewApp
pnpm dev
```

### 2. Open Browser DevTools
- Open Chrome DevTools (F12)
- Go to **Network** tab
- Filter by "stream" to see SSE connections

### 3. Submit a Response
1. Navigate to any drill question
2. Type or record a response
3. Click Submit

### 4. Watch for Streaming Feedback

You should see:

#### Immediate (≤500ms):
- "Evaluating Your Response" card appears
- Progress pill shows "Processing..."

#### After ~1 second:
- First tip appears: "💡 Your response is being analyzed..."
- Progress pill changes to "Evaluating..."

#### After ~2-3 seconds:
- Tips start rotating every 3 seconds
- You'll see different tips from the database

#### After ~5-6 seconds:
- Analysis chips start appearing
- Examples: "Clear explanation", "Good structure", "Technical accuracy"

#### When Complete:
- Progress pill shows "Complete"
- Full evaluation results display

### 5. Check Network Tab

In DevTools Network tab, you should see:
- Request to `/api/evaluate/stream?jobId=xxx&requestId=yyy`
- Type: `eventsource` (Server-Sent Events)
- Status: `200` (streaming)
- Multiple data chunks arriving over time

### 6. Check Console Logs

Look for:
```
📋 Evaluation queued: {jobId: "...", requestId: "..."}
```

And streaming events in the console.

## Debugging

### If tips don't appear:

1. **Check streaming endpoint is being called:**
   ```javascript
   // In browser console while submitting:
   // You should see a request to /api/evaluate/stream
   ```

2. **Check the database has tips:**
   ```bash
   cd /workspaces/InterviewApp
   pnpm exec tsx --env-file=.env.local -e "
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   const { data } = await supabase.from('streaming_tips').select('*').eq('is_active', true);
   console.log('Active tips:', data?.length);
   "
   ```

3. **Check for JavaScript errors:**
   - Open Console tab in DevTools
   - Look for red error messages
   - Common issues: CORS, authentication, network errors

4. **Test the streaming endpoint directly:**
   ```bash
   # Get a real jobId from a submission, then:
   curl -H "Cookie: YOUR_SESSION_COOKIE" \
     "http://localhost:3000/api/evaluate/stream?jobId=YOUR_JOB_ID&requestId=YOUR_REQUEST_ID"
   ```

### If progress pill doesn't show:

Check that `streamingJobId` is being set:
```javascript
// Add console.log in drill page after setStreamingJobId
console.log('Streaming started with jobId:', jobId, 'requestId:', evalRequestId);
```

### If chips don't appear:

The chips are currently hardcoded examples in the streaming endpoint. They should appear after tips. If they don't:
1. Check the streaming endpoint is running the full generator
2. Look for errors in server logs
3. Verify the SSE connection isn't closing early

## Expected Timeline

```
0ms     → Submit button clicked
100ms   → API request sent
500ms   → Progress pill appears ("Processing...")
800ms   → Progress pill updates ("Evaluating...")
1000ms  → First tip appears
3000ms  → Second tip appears
5000ms  → First chip appears
6000ms  → Third tip appears
6500ms  → Second chip appears
7000ms  → Third chip appears
...
10-30s  → Evaluation completes
```

## Success Criteria

✅ Progress pill appears within 500ms
✅ First tip appears within 1 second
✅ Tips rotate every 3 seconds
✅ First chip appears within 6 seconds
✅ Chips stream in progressively
✅ Fallback message after 3s (if offline)
✅ No layout shift (CLS < 0.05)
✅ Evaluation result displays when complete

## Common Issues

### "Missing jobId or requestId parameter"
- The drill page isn't passing the IDs correctly
- Check that `responseData` has both `jobId` and `requestId`

### Tips don't rotate
- Check that multiple tips exist in the database
- Verify `StreamingTips` component is receiving tips array

### Evaluation never completes
- Check that the job status endpoint is working: `/api/evaluate/{jobId}/status`
- Verify evaluation_results table has the result
- Check server logs for errors

### Connection closes immediately
- Check authentication cookies
- Verify SSE headers are correct
- Look for proxy/nginx buffering issues

## Next Steps

After confirming streaming works:
1. Test on mobile devices
2. Test with slow network (throttle to 3G)
3. Measure CLS with Lighthouse
4. Add more diverse tips to database
5. Consider adding real-time LLM streaming
