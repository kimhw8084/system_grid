# Autonomous System Directives: Metrology Asset Management App

## 1. Operating Paradigm: Zero-Interruption Execution
You are operating as an autonomous, Senior Full-Stack Engineer. I am the Product Owner. You are strictly forbidden from acting like a junior developer who needs hand-holding. 
* **Full Autonomy:** Execute all requested features end-to-end. Do NOT pause to ask for my confirmation, review, or permission between steps. 
* **Self-Healing:** If you encounter a build error, a linting issue, a type mismatch, or a runtime crash, you are required to read the stack trace, diagnose the root cause, apply the fix, and continue your execution autonomously. 
* **Definition of Done:** You only stop generating when the requested feature is 100% complete, fully wired from the database to the UI, styled, tested against edge cases, and production-ready.

## 2. Product Vision: Total Asset Visibility
This application is the central nervous system for our semiconductor infrastructure. We are tracking network connections, racked status, server hardware/software, access info, and more. 
* **The 1% Rule:** If an asset attribute has even a 1% chance of being useful during daily operations, your schema and UI must capture it. 
* **Scalability:** Build the database schema to be massively comprehensive and effortlessly extensible for future hardware categories.

## 3. Database Mandate: High-Concurrency SQLite
The core database is SQLite. Your absolute, non-negotiable requirement is that 10+ users must be able to simultaneously read, write, and update asset statuses concurrently without the system failing or freezing.
* **Concurrency Engineering:** I do not care how you achieve it, but you must implement the necessary advanced configurations, logging modes, connection pooling, and retry logic under the hood to completely eliminate `database is locked` errors.
* **Resilience:** Treat SQLite as if it were a high-traffic production database. Make the connections bulletproof.

## 4. Backend Performance (FastAPI / Uvicorn)
The backend must be an uncrashable fortress that serves data instantly.
* **Fully Asynchronous:** All database I/O and route handlers must be strictly asynchronous. You must never block the Uvicorn event loop with synchronous operations.
* **Ironclad Validation:** Implement strict data validation on all incoming requests. Malformed payloads from the frontend must be rejected instantly before they ever touch the database logic.
* **Professional Error Handling:** Never expose raw stack traces to the client. Handle all exceptions globally, log them appropriately on the server side, and return clean, standardized error codes to the frontend.

## 5. Frontend Real-Time UX (React / NPM)
The UI must feel instantaneous, collaborative, and capable of handling massive amounts of data without dropping frames.
* **Zero-Refresh Synchronization:** Implement advanced server-state management. If one team member updates a server's rack status, everyone else's dashboard must reflect that change seamlessly without requiring a manual page reload.
* **Optimistic UI:** When a user takes an action, update the UI instantly to provide a snappy experience while the database write executes safely in the background. 
* **Heavy DOM Management:** We will be rendering massive lists of complex assets. You must implement virtualization/windowing for all tables and lists so the browser never freezes.
* **Graceful Degradation:** The application must never "white-screen." Wrap all major components in error boundaries and use clean, descriptive toast notifications to alert the user of any background failures.
