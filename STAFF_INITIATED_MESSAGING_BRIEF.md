# Supervisors/Safety Officers Can Message a Specific Worker

## Context

Today `WorkerMessage` only flows one way: a worker composes a message that goes to "whichever supervisor at my site picks it up" (no specific recipient chosen), and a supervisor/safety officer can reply to it once. There's no way for a supervisor or safety officer to proactively start a conversation with one specific worker.

This adds that, reusing the exact same one-message/one-reply thread shape already in place — just letting the direction go the other way too. This is not a full multi-turn chat rebuild; it mirrors the existing single-reply pattern, just symmetric now.

---

## 1. Migration

New file (check the actual latest `V##` at build time — several other unshipped briefs also reserve migration numbers, don't hardcode one that might collide):

```sql
ALTER TABLE worker_messages ADD COLUMN recipient_email VARCHAR(255);
ALTER TABLE worker_messages ADD COLUMN recipient_name VARCHAR(255);
ALTER TABLE worker_messages ADD COLUMN initiated_by VARCHAR(20) NOT NULL DEFAULT 'WORKER';
```

Existing rows default to `initiated_by = 'WORKER'`, `recipient_email`/`recipient_name` stay null — correct, since every message up to now was worker-initiated with no specific recipient.

## 2. `WorkerMessage.java`

Add fields + accessors: `recipientEmail` (String), `recipientName` (String), `initiatedBy` (String, defaults to `"WORKER"` in the existing constructor). Add a second constructor for staff-initiated messages:

```java
public WorkerMessage(String senderEmail, String senderName, String site, String content, String recipientEmail, String recipientName) {
    this.senderEmail = senderEmail;
    this.senderName = senderName;
    this.site = site;
    this.content = content;
    this.recipientEmail = recipientEmail;
    this.recipientName = recipientName;
    this.initiatedBy = "STAFF";
}
```
(Keep the existing constructor as-is — it implicitly sets `initiatedBy = "WORKER"` via the field default.)

## 3. `WorkerMessageRepository.java`

Add:
```java
List<WorkerMessage> findBySenderEmailIgnoreCaseOrRecipientEmailIgnoreCaseOrderByCreatedAtDesc(String senderEmail, String recipientEmail);
```

## 4. `WorkerMessageController.java` — new endpoints

**List workers at my site (for the "who do I send this to" picker)** — reuses the same repository method already used to find supervisors, just for role `worker`:
```java
@GetMapping("/site-workers")
@PreAuthorize("hasAnyAuthority('ROLE_SUPERVISOR','ROLE_SAFETY_OFFICER')")
public List<Map<String, Object>> getSiteWorkersForMessaging(@AuthenticationPrincipal AuthenticatedUser auth) {
    AppUser staff = userRepo.findById(auth.id())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    if (staff.getAssignedSite() == null) return List.of();
    return userRepo.findByRoleAndAssignedSiteIgnoreCase("worker", staff.getAssignedSite())
        .stream()
        .map(w -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("email", w.getEmail());
            m.put("fullName", w.getFullName());
            return m;
        })
        .collect(Collectors.toList());
}
```

**Send a new message to a specific worker:**
```java
@PostMapping("/to-worker")
@PreAuthorize("hasAnyAuthority('ROLE_SUPERVISOR','ROLE_SAFETY_OFFICER')")
public Map<String, Object> sendToWorker(
    @AuthenticationPrincipal AuthenticatedUser auth,
    @RequestBody Map<String, String> body
) {
    String workerEmail = body.get("workerEmail");
    String content = body.get("content");
    if (workerEmail == null || workerEmail.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient is required");
    }
    if (content == null || content.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message cannot be empty");
    }
    if (content.length() > 500) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must be 500 characters or less");
    }

    AppUser sender = userRepo.findById(auth.id())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    AppUser worker = userRepo.findByEmailIgnoreCase(workerEmail.trim())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Worker not found"));

    if (!"worker".equals(worker.getRole())) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient must be a worker");
    }
    if (sender.getAssignedSite() == null || worker.getAssignedSite() == null ||
        !sender.getAssignedSite().equalsIgnoreCase(worker.getAssignedSite())) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Worker is not at your site");
    }

    WorkerMessage msg = new WorkerMessage(
        sender.getEmail(), sender.getFullName(), sender.getAssignedSite(),
        content.trim(), worker.getEmail(), worker.getFullName()
    );
    messageRepo.save(msg);

    String preview = content.length() > 80 ? content.substring(0, 77) + "..." : content;
    notificationService.notify(worker.getEmail(), "MESSAGE",
        sender.getFullName() + " sent you a message", preview, "WorkerMessage", msg.getId());
    String token = worker.getPushToken();
    if (token != null && !token.isBlank()) {
        pushService.sendToToken(token, sender.getFullName() + " sent you a message", preview, "default");
    }

    return toMap(msg);
}
```

**Worker replies to a staff-initiated message** (separate from the existing supervisor-only `/reply` endpoint — this is the reverse direction):
```java
@PostMapping("/{id}/worker-reply")
@PreAuthorize("hasAuthority('ROLE_WORKER')")
public Map<String, Object> workerReply(
    @AuthenticationPrincipal AuthenticatedUser auth,
    @PathVariable Long id,
    @RequestBody Map<String, String> body
) {
    String reply = body.get("reply");
    if (reply == null || reply.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply cannot be empty");
    }
    if (reply.length() > 500) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply must be 500 characters or less");
    }

    WorkerMessage msg = messageRepo.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));

    if (!"STAFF".equals(msg.getInitiatedBy()) || msg.getRecipientEmail() == null ||
        !msg.getRecipientEmail().equalsIgnoreCase(auth.email())) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This message was not sent to you");
    }

    msg.setReply(reply.trim());
    msg.setRepliedAt(LocalDateTime.now());
    messageRepo.save(msg);

    String preview = reply.length() > 80 ? reply.substring(0, 77) + "..." : reply;
    notificationService.notify(msg.getSenderEmail(), "MESSAGE",
        msg.getRecipientName() + " replied to your message", preview, "WorkerMessage", id);
    userRepo.findByEmailIgnoreCase(msg.getSenderEmail()).ifPresent(staff -> {
        String token = staff.getPushToken();
        if (token != null && !token.isBlank()) {
            pushService.sendToToken(token, msg.getRecipientName() + " replied to your message", preview, "default");
        }
    });

    return toMap(msg);
}
```

**Update `getMyMessages` (`/mine`)** so a worker sees both directions:
```java
@GetMapping("/mine")
@PreAuthorize("hasAuthority('ROLE_WORKER')")
public List<Map<String, Object>> getMyMessages(@AuthenticationPrincipal AuthenticatedUser auth) {
    return messageRepo.findBySenderEmailIgnoreCaseOrRecipientEmailIgnoreCaseOrderByCreatedAtDesc(auth.email(), auth.email())
        .stream().map(this::toMap).collect(Collectors.toList());
}
```

**Update `toMap`** to include the new fields: `recipientEmail`, `recipientName`, `initiatedBy`.

Leave the existing `/reply` endpoint (supervisor replying to a worker-initiated message) exactly as-is — don't let it apply to staff-initiated messages; that's what the new `/worker-reply` endpoint is for.

---

## 5. Frontend — `src/services/api.ts`

```ts
export function getSiteWorkersForMessaging() {
  return request<{ email: string; fullName: string }[]>('/worker-messages/site-workers');
}

export function sendMessageToWorker(workerEmail: string, content: string) {
  return post<WorkerMessage>('/worker-messages/to-worker', { workerEmail, content });
}

export function replyAsWorker(id: number, reply: string) {
  return post<WorkerMessage>(`/worker-messages/${id}/worker-reply`, { reply });
}
```

Add `recipientEmail`, `recipientName`, `initiatedBy` to the `WorkerMessage` type in `src/types/actions.ts`.

## 6. `WorkerMessagesScreen.tsx` — show both directions

Messages from `getMyWorkerMessages()` now include ones the worker sent (`senderEmail === session.user.email`, `initiatedBy === 'WORKER'`) and ones sent to them (`recipientEmail === session.user.email`, `initiatedBy === 'STAFF'`). Keep the existing right-aligned bubble + "awaiting reply"/reply-bubble treatment exactly as-is for the worker's own outgoing messages. For incoming staff-initiated messages, render them left-aligned (mirroring the existing `replyBubble` visual style, since that's already the "message from someone else" look in this file) labeled with the sender's name (`m.senderName`) instead of "Supervisor replied" — and if `m.reply` is empty, show a small reply composer (same input+send pattern as `SupervisorMessagesScreen.tsx`'s reply section) calling `replyAsWorker(m.id, text)`. Once replied, show the worker's own reply similarly to how a completed reply currently renders.

Sort everything by `createdAt` into one combined, chronological list rather than two separate sections — it should read like one inbox.

## 7. `SupervisorMessagesScreen.tsx` — add a way to initiate

Add a tab row at the top (mirroring the `SupervisorGuestScreen.tsx` tab pattern): "Inbox" (existing behavior, unchanged — worker-initiated messages awaiting/having a supervisor reply) and "Message a Worker" (new).

The "Message a Worker" tab: fetch `getSiteWorkersForMessaging()` on tab open, show a simple picker list (name, tap to select — reuse a similar row style to the guest-type radio rows in `SupervisorGuestScreen.tsx`), then a text compose box + send button once a worker is selected, calling `sendMessageToWorker`. After sending, show a lightweight confirmation and let them send another.

In the existing "Inbox" tab's message list, messages where `initiatedBy === 'STAFF'` (i.e. ones a supervisor/safety officer sent out) should **not** show the reply composer (that's not this user's message to reply to) — instead show either "Awaiting {worker's first name}'s reply" or the worker's reply if `m.reply` is set, read-only. Only messages where `initiatedBy === 'WORKER'` and no reply yet should show the existing reply composer.

---

## Files touched (7)

Backend: new migration, `WorkerMessage.java`, `WorkerMessageRepository.java`, `WorkerMessageController.java`.
Frontend: `src/services/api.ts`, `src/types/actions.ts`, `WorkerMessagesScreen.tsx`, `SupervisorMessagesScreen.tsx`.

## Verification checklist

- A supervisor or safety officer can pick a specific worker at their site and send them a message; a worker outside their site is not selectable/reachable (403 if attempted directly via API).
- The target worker sees the new message in their inbox, can reply once, and that reply reaches the original sender (push + in-app notification).
- A worker cannot reply to a message that wasn't sent to them (`403` if they try another worker's message ID).
- The existing worker → supervisor flow (compose, any supervisor at site can reply) is completely unchanged and unaffected.
- Supervisor's "Inbox" tab correctly distinguishes messages needing their reply (worker-initiated) from messages they sent out awaiting a worker's reply (staff-initiated) — no duplicate/incorrect reply boxes.
- Worker's message screen shows one unified, chronological thread list mixing both directions correctly, with the right bubble alignment/labeling for each.
- 500-character limit and empty-message validation enforced on all new endpoints, same as the existing ones.
