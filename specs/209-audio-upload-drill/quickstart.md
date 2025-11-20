# Quickstart: Audio Upload for Drill Recordings

**Feature**: 009-audio-upload-drill
**Date**: 2025-01-27

## Overview

This guide provides step-by-step instructions for implementing the audio upload feature, from setting up Supabase storage to integrating the MediaRecorder component.

---

## Prerequisites

- Supabase project with Storage enabled
- Next.js 16+ application
- `@supabase/supabase-js` package
- MediaRecorder API support in target browsers

---

## Setup Steps

### 1. Configure Supabase Storage

#### Create Bucket

```bash
# Using Supabase CLI (recommended)
supabase storage create drill-recordings --public false

# Or via Supabase Dashboard
# Go to: Storage → Create Bucket
# Name: drill-recordings
# Public: No (private bucket)
```

#### Set RLS Policies

```sql
-- Allow service role to read/write
CREATE POLICY "Service role can access all recordings"
ON storage.objects FOR ALL
USING (bucket_id = 'drill-recordings');

-- Deny public access
REVOKE ALL ON storage.objects
FROM anon, authenticated
WHERE bucket_id = 'drill-recordings';
```

#### Configure Lifecycle Policy

```sql
-- Automatically delete files after 30 days
-- Run via Supabase Dashboard or Edge Function
-- Storage → drill-recordings → Lifecycle Rules
-- Delete objects after: 30 days
```

---

### 2. Create Database Table

```sql
-- Create recordings table
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,

  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT NOT NULL CHECK (duration <= 90),
  storage_path TEXT NOT NULL,

  recorded_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('recording', 'uploading', 'completed', 'failed', 'expired')),
  error_message TEXT,

  upload_attempts INT NOT NULL DEFAULT 0,
  upload_duration_ms INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_expires_at ON recordings(expires_at) WHERE status = 'completed';
CREATE INDEX idx_recordings_status ON recordings(status);
```

---

### 3. Install Dependencies

```bash
pnpm add @supabase/supabase-js
pnpm add -D @types/node
```

---

### 4. Environment Variables

Add to `.env.local`:

```bash
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
```

---

### 5. Implement API Routes

#### Upload Endpoint (`app/api/upload/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { UploadRequestSchema } from "@/features/booking/application/upload/schemas";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;
    const questionId = formData.get("questionId") as string;
    const duration = parseInt(formData.get("duration") as string);

    // 2. Validate request
    const validation = UploadRequestSchema.safeParse({
      file,
      sessionId,
      questionId,
      duration,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: validation.error.message },
        { status: 400 }
      );
    }

    // 3. Generate unique ID
    const recordingId = uuidv4();
    const userId = "user-123"; // Get from auth session

    // 4. Create recording record
    const { error: dbError } = await supabase
      .from("recordings")
      .insert({
        id: recordingId,
        user_id: userId,
        session_id: sessionId,
        question_id: questionId,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        duration: duration,
        storage_path: `${userId}/${recordingId}.webm`,
        recorded_at: new Date(),
        uploaded_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "uploading",
      });

    if (dbError) throw dbError;

    // 5. Upload to storage
    const { error: storageError } = await supabase.storage
      .from("drill-recordings")
      .upload(`${userId}/${recordingId}.webm`, file);

    if (storageError) throw storageError;

    // 6. Update status
    await supabase
      .from("recordings")
      .update({ status: "completed" })
      .eq("id", recordingId);

    return NextResponse.json({
      success: true,
      data: {
        recordingId,
        status: "completed",
        fileSize: file.size,
        duration,
        uploadDuration: 0,
        uploadAttempts: 1,
      },
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Upload failed" },
      { status: 500 }
    );
  }
}
```

#### Signed URL Endpoint (`app/api/recordings/[recordingId]/signed-url/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { recordingId: string } }
) {
  const { recordingId } = params;

  try {
    // 1. Get recording metadata
    const { data: recording, error: fetchError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (fetchError || !recording) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Recording not found" },
        { status: 404 }
      );
    }

    // 2. Generate signed URL (15 minutes)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("drill-recordings")
      .createSignedUrl(recording.storage_path, 900); // 15 minutes

    if (urlError) throw urlError;

    return NextResponse.json({
      success: true,
      data: {
        url: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error("Signed URL generation failed:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
```

---

### 6. Implement Client Components

#### Audio Recorder Component (`components/drill/AudioRecorder.tsx`)

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_DURATION = 90;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);

      // Update timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      // Show fallback text input
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("sessionId", "session-123");
    formData.append("questionId", "q-001");
    formData.append("duration", duration.toString());

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("Upload result:", result);
  };

  return (
    <div className="space-y-4">
      <div>
        <p>Duration: {duration}s / {MAX_DURATION}s</p>
        <Progress value={(duration / MAX_DURATION) * 100} />
      </div>

      <div className="flex gap-2">
        {!isRecording ? (
          <Button onClick={startRecording}>Start Recording</Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive">
            Stop Recording
          </Button>
        )}

        {audioBlob && (
          <Button onClick={handleUpload}>Upload</Button>
        )}
      </div>
    </div>
  );
}
```

---

### 7. Test the Implementation

```bash
# Run development server
pnpm dev

# Test upload flow
# 1. Navigate to drill page
# 2. Click "Start Recording"
# 3. Speak for a few seconds
# 4. Click "Stop Recording"
# 5. Click "Upload"
# 6. Verify success response
```

---

## Next Steps

1. **Add retry logic**: Implement exponential backoff for failed uploads
2. **Add progress tracking**: Show upload progress percentage
3. **Add fallback UI**: Text input when microphone is unavailable
4. **Add analytics**: Log events to PostHog
5. **Add error handling**: Show user-friendly error messages
6. **Add testing**: Unit and integration tests

---

## Troubleshooting

### MediaRecorder not supported
- Check browser compatibility: https://caniuse.com/mediastreamrecorder
- Fall back to text input for unsupported browsers

### Upload fails
- Check Supabase service role key is set correctly
- Verify bucket exists and RLS policies are configured
- Check network tab for error details

### Signed URLs expire immediately
- Verify expiry time is set to 900 seconds (15 minutes)
- Check Supabase storage configuration

---

## Resources

- [MediaRecorder API Docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Feature Specification](./spec.md)
- [API Contracts](./contracts/)
