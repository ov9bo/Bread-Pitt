# Glossary

This glossary defines Bread Pitt terms in plain language.

## A

**Action (Server Action)**  
A server-side function triggered by form/button interactions in Next.js App Router.

**Admin seed**  
Initial creation of the single user account using script or startup env variables.

## B

**Bake day**  
A process template focused on preparing and executing a baking timeline.

**Boot reconciliation**  
Scheduler behavior that summarizes reminders missed while app was offline.

## C

**Callback route**  
A route third-party services redirect to after OAuth or webhook events.

## D

**Discard jar**  
Tracked container of leftover starter. The app records amount and usage history.

**Drizzle**  
Type-safe ORM and migration toolkit used with SQLite.

## F

**FTS5**  
SQLite full-text search engine used for troubleshooting and library search.

## G

**Google account linkage**  
Stored OAuth token and calendar metadata used for Calendar sync.

## I

**Integration**  
Optional external service connection, currently Telegram or Google Calendar.

## J

**Journal**  
UI section that shows historical and active process runs.

## K

**Knowledge sync**  
Script process that parses markdown guides and writes searchable DB records.

## M

**Middleware**  
Next.js request-time layer used here for route authentication checks.

## P

**Process**  
A single run of a sourdough routine (starter build, bake day, etc.).

**Process step**  
One scheduled action inside a process timeline.

## Q

**Quiet hours**  
Configured time range where reminder sends are deferred.

## R

**Reminder**  
Durable queue item with a scheduled fire time and delivery status.

## S

**Scheduler**  
Background cron loop that dispatches due reminders and retries failures.

**Session**  
Authentication state represented by both JWT cookie and DB row.

## T

**Template (process template)**  
Code that generates process steps and reminders from start-time inputs.

**Telegram pairing**  
Linking app user with Telegram chat using short-lived code.

## U

**User preferences**  
Per-user settings for temperature, notifications, quiet hours, and theme.

## W

**WAL mode**  
SQLite write-ahead logging mode used for better reliability and concurrency.

