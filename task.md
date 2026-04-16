# Task

## Title
Fix blank/white page when Writing Copilot is served from a subpath

## Milestones
- [x] Reproduce the blank page under a subpath deployment and confirm the asset-path failure.
- [x] Change the Vite base so built assets resolve relatively.
- [x] Rebuild and verify the app loads from both root and subpath URLs.
- [x] Serve `web/dist` from API server for non-`/api` requests (including `/` and `/assets/*`), so opening the backend URL does not show a blank page.

## Notes
- Root dev mode still works.
- The fix only changes frontend asset URL generation.
