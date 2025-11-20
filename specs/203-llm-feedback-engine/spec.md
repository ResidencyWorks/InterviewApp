# Feature Specification: LLM Feedback Engine

**Feature Branch**: `003-llm-feedback-engine`
**Created**: 2025-10-20
**Status**: Draft

---

## 🧑‍🎓 User Story

**Story**: As a user, I want the app to analyze my submission using AI and return clear, structured feedback to improve my interview answers.

**Acceptance Criteria:**
- App records/pastes user input
- Uses OpenAI Whisper for speech-to-text (recorded mode)
- Sends transcript to GPT-4 API
- Returns: score (0–100), feedback, practice rule, what_changed

---

## ✅ Functional Requirements

- **FR-001**: Whisper STT support (optional for M0, stub for now)
- **FR-002**: GPT API call via `gpt-4` or fallback model
- **FR-003**: Environment-based API key (`OPENAI_API_KEY`)
- **FR-004**: Must be retry-safe and handle timeouts
- **FR-005**: Return full evaluation payload (same schema as `/evaluate`)
- **FR-006**: Event `score_returned` must fire after LLM call

---

## 🧪 Test Artifacts Required

- API contract test: simulate OpenAI call
- Timeout + fallback error handler
- PostHog tracking test
