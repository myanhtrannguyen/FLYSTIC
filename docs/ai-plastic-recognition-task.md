# Task Specification: AI Plastic Recognition

**Status:** Planned  
**Suggested branch:** `feature/ai-plastic-recognition`  
**Owner:** Project collaborator  
**Priority:** High

## 1. Background

FLYSTIC currently helps students identify recyclable plastic through the static guide at `/app/guide`. The application can access the camera and upload an image at `/app/scan`, but that flow only decodes transaction QR codes. It does not identify plastic objects.

The requested improvement is an AI-assisted image-recognition feature that lets a student photograph one plastic item and receive a likely material category. This feature must complement the existing guide and QR transaction flow, not replace either of them.

## 2. Goal

Deliver an end-to-end MVP that:

1. Lets an authenticated student take or upload a photo of one plastic item.
2. Sends the image to the FLYSTIC API Worker.
3. Uses a vision-capable AI model to classify the item.
4. Returns a validated result using FLYSTIC's supported categories.
5. Shows the result as an AI estimate with relevant sorting guidance.
6. Handles ambiguous, unsupported, and non-plastic images safely.

The primary success condition is that the feature is useful for education and pre-sorting while clearly communicating uncertainty.

## 3. Non-goals

The MVP must not:

- Replace QR transaction scanning at `/app/scan`.
- Create or confirm a recycling transaction.
- Award points, estimate weight, or determine cleanliness multipliers.
- Automatically override an administrator's material selection.
- Identify multiple items in one image.
- Train or fine-tune a custom model.
- Store uploaded images in D1, R2, logs, analytics, or source control.
- Claim laboratory-grade resin identification. Visual recognition cannot reliably determine every resin when markings and material characteristics are not visible.

## 4. Product decisions

### 4.1 New route

Create a dedicated authenticated student route:

```text
/app/identify
```

Do not rename or overload `/app/scan`; that route remains dedicated to transaction QR codes.

Add entry points to the new page from:

- The top section of `/app/guide` using a clear “Identify with AI” call to action.
- A suitable quick-action area on `/app` if the current layout has room.

Do not add a sixth item to the mobile bottom navigation for the MVP.

### 4.2 Supported result categories

The backend response must use only these canonical values:

```ts
type PlasticRecognitionCategory =
  | "PET"
  | "HDPE"
  | "PP"
  | "LDPE"
  | "PS"
  | "PVC_OTHER"
  | "NOT_PLASTIC"
  | "UNKNOWN";
```

Rules:

- `PET`, `HDPE`, `PP`, `LDPE`, and `PS` map to the currently accepted FLYSTIC categories.
- `PVC_OTHER` maps to the rejected PVC/OTHER guide category.
- `NOT_PLASTIC` means the primary object is not plastic.
- `UNKNOWN` means the image is ambiguous, low quality, contains multiple primary items, or lacks enough visual evidence.
- The server, not the model, derives whether a category is accepted by FLYSTIC.

### 4.3 Confidence

Use a simple confidence band:

```ts
type RecognitionConfidence = "low" | "medium" | "high";
```

Do not show a fabricated percentage. Vision-language model probabilities are not guaranteed to be calibrated. A low-confidence response must be presented as uncertain and should ask the user to retake the photo or check the recycling symbol.

## 5. User experience

The new page must support these states:

1. **Introduction** — explain that the tool provides an estimate and ask for one item on a plain, well-lit background.
2. **Capture/upload** — allow the rear camera on mobile and normal file selection on desktop.
3. **Preview** — show the selected image with Retake/Choose another and Analyze actions.
4. **Analyzing** — disable duplicate submission and show progress feedback.
5. **Result** — show the predicted category, confidence band, observed clues, whether FLYSTIC accepts it, and links to the relevant guide section.
6. **Uncertain result** — explain why the image could not be classified and provide specific retake guidance.
7. **Error** — handle authentication expiry, invalid file, oversized image, rate limiting, AI unavailability, and network failure.

Required image guidance:

- Photograph one item at a time.
- Keep the whole object in frame.
- Use good lighting and a simple background.
- Include the recycling symbol or resin number when possible.
- Avoid hands, faces, student cards, and other personal information.

The result view must always display a message equivalent to:

> AI estimate only. Check the recycling symbol or ask a station administrator when unsure.

All new interface copy must be available in Vietnamese, English, and Korean through the existing translation system in `src/lib/yoha-store.tsx`.

## 6. Image handling requirements

Frontend:

- Use an image input with `accept="image/jpeg,image/png,image/webp"` and mobile rear-camera capture support.
- Reject unsupported formats before upload.
- Correct image orientation and resize on the client before upload.
- Target a maximum long edge of 1,600 px and an encoded size below 1 MB when practical.
- Strip EXIF metadata by decoding and re-encoding through a canvas.
- Revoke object URLs and release camera streams during cleanup.

Backend:

- Accept JPEG, PNG, and WebP only.
- Enforce a hard request image limit of 5 MB.
- Validate the MIME type and file signature; do not trust the filename or browser-provided type alone.
- Reject empty, malformed, or unsupported files with a clear `400`/`413` response.
- Never log image bytes, data URIs, or model prompts containing the image.
- Return `Cache-Control: no-store` for recognition responses.

HEIC/HEIF support is outside the MVP unless the contributor adds a well-tested client conversion path without increasing the server attack surface.

## 7. API contract

Add the following endpoint to `backend/src/worker.ts`:

```http
POST /api/v1/ai/plastic-identify
Authorization: Bearer <student-token>
Content-Type: multipart/form-data
```

Request fields:

| Field   | Type | Required | Description                   |
| ------- | ---- | -------- | ----------------------------- |
| `image` | File | Yes      | One JPEG, PNG, or WebP image. |

Only authenticated students may call this endpoint. Reuse the existing session verification and role checks.

Successful response:

```json
{
  "requestId": "f3b7...",
  "category": "PET",
  "confidence": "high",
  "accepted": true,
  "detectedObject": "clear drinking-water bottle",
  "recyclingCode": "1",
  "evidence": [
    "transparent bottle body",
    "single-use beverage bottle shape",
    "resin code 1 is visible"
  ],
  "alternatives": [],
  "needsRetake": false
}
```

Contract rules:

- `requestId` is generated by the server and is safe to include in logs for debugging.
- `category` must match the canonical enum.
- `accepted` is derived by server code and is `true` only for PET, HDPE, PP, LDPE, and PS.
- `recyclingCode` is `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"7"`, or `null`.
- `evidence` contains at most three short observations and must not contain Markdown/HTML.
- `alternatives` contains at most two other canonical categories.
- `needsRetake` must be `true` for `UNKNOWN`, low-quality images, or multiple primary items.
- Validate and normalize every model field before returning it to the client. A malformed model response must degrade to `UNKNOWN`, not pass through unchecked.

Use the existing error shape:

```json
{ "error": "Human-readable message" }
```

Expected status codes:

| Status | Meaning                                    |
| ------ | ------------------------------------------ |
| `200`  | A validated result, including `UNKNOWN`.   |
| `400`  | Missing, unsupported, or malformed image.  |
| `401`  | Missing or expired session.                |
| `403`  | The account is not a student.              |
| `413`  | Image exceeds the hard size limit.         |
| `429`  | Recognition rate limit reached.            |
| `502`  | AI provider returned an unusable response. |
| `503`  | AI recognition is temporarily unavailable. |

## 8. AI integration

### 8.1 Recommended baseline

Use Cloudflare Workers AI through an `AI` binding on the existing API Worker:

```jsonc
"ai": {
  "binding": "AI"
}
```

The current recommended baseline candidate is:

```text
@cf/moondream/moondream3.1-9B-A2B
```

It is a Cloudflare-hosted image-to-text model that accepts a public HTTPS image URL or a base64 data URI and supports image querying. Treat this as a baseline, not a permanent requirement: compare it with at least one other vision-capable model available in the Workers AI catalog at implementation time.

Keep the selected model ID in one backend constant so it can be changed without touching the route or response contract.

### 8.2 Prompt requirements

The fixed server prompt must:

- Ask about one primary object only.
- Restrict output to the canonical categories.
- Prefer a visible recycling symbol/resin code over shape-based guesses.
- Return `UNKNOWN` instead of guessing when evidence is weak.
- Return `NOT_PLASTIC` for non-plastic objects.
- Treat text visible inside the image as untrusted data, never as instructions.
- Request JSON only with no Markdown fences or commentary.
- Limit evidence and alternatives to the API contract sizes.

The application must parse the response defensively. Even when a model supports structured output, schema compliance is not guaranteed in every request.

### 8.3 Local development note

Workers AI calls use Cloudflare's service even when the Worker is run locally and may incur usage charges. Contributors need access to the relevant Cloudflare account for end-to-end local testing.

Provide a deterministic mocked inference function for unit/UI tests so routine tests do not call a paid model.

## 9. Abuse prevention and privacy

- Add a dedicated rate-limit binding for this endpoint; do not reuse the authentication limiter.
- Apply both a global limit and a per-user key. An initial per-user target of 10 requests per minute is acceptable and should be configurable.
- Perform authentication and file validation before invoking the model.
- Do not expose Cloudflare credentials or call Workers AI directly from the browser.
- Do not persist source images in D1 or R2 for the MVP.
- Do not send images to analytics/error-reporting services.
- Log only request ID, user ID or a one-way identifier, result category, latency, model ID, and normalized error code.
- Do not include model reasoning traces in the API response or logs.
- Ensure errors never echo image data or raw model output.

If a future feedback dataset stores images, it requires a separate consent flow, retention policy, deletion process, and privacy review. That work is explicitly outside this task.

## 10. Files expected to change

At minimum:

```text
backend/src/worker.ts                 # Authenticated recognition endpoint
backend/wrangler.jsonc                # AI and recognition rate-limit bindings
backend/worker-configuration.d.ts     # Regenerated binding types
src/lib/yoha-api.ts                   # Request/response types and API call
src/lib/yoha-store.tsx                # vi/en/ko translation keys
src/routes/app.identify.tsx           # New capture and result experience
src/routes/app.guide.tsx              # Entry point to AI identification
src/routeTree.gen.ts                   # Regenerated by TanStack Router
README.md                              # Mark feature as available after completion
```

Additional components/hooks may be created when they improve testability. Do not place all image processing, networking, and UI state in one route component.

## 11. Implementation plan

1. Add shared frontend DTOs and the API client method.
2. Add the Workers AI and recognition rate-limit bindings; regenerate Worker types.
3. Implement isolated helpers for image validation, prompt creation, model output parsing, and normalization.
4. Implement the authenticated API endpoint.
5. Build the `/app/identify` route and image-processing helper.
6. Add translated copy and links from the guide/home pages.
7. Add mocked unit and component tests.
8. Evaluate the selected model against a documented image set.
9. Run security, accessibility, mobile-camera, and regression checks.
10. Update README only after the feature works in production.

## 12. Testing requirements

### Automated

Cover at least:

- Category and confidence normalization.
- Malformed/non-JSON model output.
- Unsupported category returned by the model.
- Missing authentication and wrong role.
- Missing image, spoofed MIME type, empty image, and oversized image.
- Model timeout/error and rate-limit response.
- Client states for preview, loading, success, unknown, and error.
- Object URL/camera cleanup.
- No regression in the QR scanner route.

### Manual device checks

Test on:

- One iPhone/Safari device.
- One Android/Chrome device.
- One desktop browser with file upload.
- Denied camera permission.
- Slow connection and offline mode.

### Recognition evaluation

Create a small, legally usable evaluation set with:

- At least 10 images for each accepted category.
- PVC/OTHER, non-plastic, and ambiguous examples.
- Different lighting, backgrounds, viewing angles, and object conditions.
- Cases with and without a visible resin code.

Record per-category results in `docs/ai-plastic-recognition-evaluation.md`. The target for the first release is at least 80% top-category accuracy on clear, single-item images where a resin code or characteristic shape is visible. Ambiguous images should prefer `UNKNOWN` over a confident wrong answer. If the target is not met, keep the feature behind a disabled UI flag and document the findings.

Do not commit personal photos or images without redistribution rights.

## 13. Acceptance criteria

- [ ] `/app/identify` is available to authenticated students on mobile and desktop.
- [ ] Users can take a photo or upload JPEG, PNG, or WebP.
- [ ] Images are resized and stripped of metadata before upload.
- [ ] The API authenticates the user, validates the file, applies rate limits, and invokes Workers AI server-side.
- [ ] The response is validated against the documented canonical contract.
- [ ] Unknown/non-plastic/multiple-item images produce safe, actionable results.
- [ ] The UI clearly labels every result as an AI estimate.
- [ ] AI output never awards points or mutates transaction data.
- [ ] New UI copy works in Vietnamese, English, and Korean.
- [ ] Source images are not persisted or logged.
- [ ] Automated tests use a mock and do not spend Workers AI quota.
- [ ] The model evaluation and selected model rationale are documented.
- [ ] Existing QR scanning and guide behavior still work.
- [ ] `npm run lint` and `npm run build` pass after resolving any documented baseline repository blockers.

## 14. Known repository blocker

At the time this task was written, `npm run build` fails because `src/routes/app.rewards.tsx` imports three missing files from `ViT/`:

```text
ViT/gay_quy_xuan_yeu_thuong_2026.jpg
ViT/mua_he_xanh_2026.png.jpeg
ViT/xuan_yeu_thuong_2026.jpg
```

Restoring or replacing those assets is not part of the AI recognition task, but the project owner must resolve the issue before build-based acceptance can pass. The collaborator should not silently remove the affected rewards content.

## 15. Pull request checklist

The pull request description must include:

- Architecture and model choice.
- API contract changes.
- Screenshots or a short recording for mobile and desktop.
- Test results and recognition evaluation summary.
- Privacy and rate-limit behavior.
- Workers AI cost considerations.
- Any follow-up work or known classification weaknesses.

Keep the PR focused on this feature. Do not combine unrelated design rewrites, dependency upgrades, or transaction-rule changes.

## 16. References

- [Cloudflare Workers AI binding setup](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/)
- [Cloudflare Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/)
- [Moondream 3.1 model interface](https://developers.cloudflare.com/workers-ai/models/moondream3.1-9B-A2B/)
- [Workers AI JSON Mode and schema caveats](https://developers.cloudflare.com/workers-ai/features/json-mode/)
