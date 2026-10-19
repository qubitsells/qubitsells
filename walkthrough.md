# Capsule lifecycle

The server is authoritative for capsule ownership, note content, lock state, partner approvals, and media references. Browser storage is not a fallback for successful saves.

| State | Content access | Allowed transition |
| --- | --- | --- |
| Solo sealed | Metadata for creator; content withheld | Creator opens after selected date, or when an open-when condition is appropriate |
| Shared draft / pending approval | Creator can read/edit content; partner receives approval metadata | Partner accepts or rejects co-sealing |
| Shared sealed | Both partners see metadata; content withheld | Each partner approves opening after the selected date |
| Shared opened | Both current couple members can read/edit content | Authorized deletion or content edits |

Uploads start as private pending assets. Saving a capsule attaches only that user's pending uploads, in the same transaction as the capsule save. Closing an unsaved wizard removes its pending media; closing the saved partner waiting screen preserves the saved media. Closing during an upload is deferred, and microphone tracks stop on cancellation/unmount.

Deleting a capsule removes only its exact ID and queues its registered assets for cleanup. Editing out an individual asset also queues it. Provider failures retain media records under an expiring lease so the worker can retry; cleanup never claims successful destruction simply because a request was attempted.

Legacy content/media must be migrated before production rollout as described in [SECURITY.md](SECURITY.md). New content is encrypted at rest with AES-256-GCM. Files use authenticated Cloudinary delivery and the app verifies access before streaming them.
