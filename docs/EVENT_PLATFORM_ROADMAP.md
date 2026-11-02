# Hoople product timeline — From lite to Community OS

**Status:** Product direction / planning, not a committed release schedule. Updated 30 October 2026.

Hoople lite is the interactive entry point into a future end-to-end event and community operating system. The ambition is to help independent EOs, agencies, brands, venues and community organizers run professional experiences without stitching together unrelated tools.

## 01 — Hoople lite (current React prototype)

Digital passport, treasure hunt, multiple-choice quiz, QR/photo/check-in mission simulation, points/rewards, branding, editor, onboarding and preview. Browser-local state only; no server-authoritative points, production accounts or transaction processing. Validate no-code creation and participant engagement first.

## 02 — Event Platform (next build)

| Capability | Minimum product definition |
| --- | --- |
| Event workspace | Organizer and agency tenants; event identity, venue, dates and status |
| Landing page builder | Event-specific sections, brand assets, responsive themes, published subdomain and verified custom domain |
| Ticketing and checkout | Ticket tiers, quota, discount code, order state, server-authoritative inventory and Midtrans checkout/webhook |
| Registration | Custom questions, attendee roster, ticket QR and transactional notifications |
| Classes / sessions | Class capacity, instructors, schedules, booking, waitlist and per-session attendance |
| Reporting | Orders, revenue, conversion, attendance and operational exports, with access controls |

**Core flow:** Organizer creates event → configures landing, ticket tiers and sessions → previews → publishes → attendees register/pay → receive tickets → staff validates check-in → event insights are recorded.

Production essentials: verified payment webhooks, idempotent orders, explicit refunds/cancellations, event access control, per-tenant permissions and audit logs.

## 03 — On-site Experience

Add QR ticket and session check-in/check-out, crew-scoped devices, anti-replay verification, live venue occupancy (only where justified), photobooth capture and shareable galleries, interactive challenge modules, leaderboard and reward fulfillment. Support reliable network-degraded operation with safe re-sync and duplicate suppression.

For photobooth and participant photos: first-use purpose disclosure, age/guardian safeguards when applicable, moderation, short retention and self-service deletion requests.

## 04 — Smart Event Layer

Explore facial recognition only when there is a defensible legal basis, explicit purpose-specific consent where required, a proportionate retention policy, security controls and a **non-biometric alternative**. Never make facial enrollment a condition for ordinary event participation. Face enrollment, matching and auto check-in/out require independent risk review, testing across demographics, human override and clear appeal routes.

Other smart features: AI-assisted landing/experience drafts, operational recommendations, session demand forecasts and consent-respecting attendee journeys. All generated content should require organizer confirmation before publication.

## 05 — Community OS

Member directory and segmentation with permissions, recurring events and subscriptions, loyalty/stamps, community communication tools, retention analytics, reusable agency/client workspaces, white-label custom domains, integrations and recurring revenue reporting. The aim is not just event attendance but meaningful engagement before, during and after an event.

## Architecture implications

Preserve Hoople lite as a bounded `Experience` module and introduce a parent `Event` domain. A single event can have multiple tickets, sessions, attendee registrations, photobooth activations and interactive experiences.

Suggested domain entities (in addition to the current experience blueprint):

- `events`, `event_versions`, `venues`, `event_domains`, `event_pages`, `page_blocks`
- `ticket_types`, `ticket_inventory`, `orders`, `order_items`, `payments`, `refunds`, `issued_tickets`
- `registrations`, `attendees`, `attendee_consent`, `checkin_events`
- `sessions`, `session_bookings`, `session_checkins`, `waitlists`
- `photobooth_sessions`, `media_assets`, `photo_share_links`, `retention_jobs`
- `community_members`, `segments`, `member_consents`, `campaigns`, `loyalty_ledger`
- Optional later: `biometric_enrollments`, `recognition_attempts`, `biometric_consents`, `manual_overrides` — isolate tightly, encrypt, restrict access and avoid raw biometric retention where possible.

Prefer a modular TypeScript backend and PostgreSQL multi-tenant model for MVP, with event, ticketing, classes, experiences, onsite and community modules. Use a validated queue for payment updates, media safety and notifications. Publish versioned public event pages and keep all ticket, point and attendance decisions server-side.

## Milestones and decision gates

| Phase | Product gate |
| --- | --- |
| Lite pilot | EO/community users can independently create, test and share a safe demo experience |
| Event Core pilot | One paid event can be created, published, paid for, checked in and reconciled end-to-end |
| On-site pilot | Crew can operate check-in, sessions and photobooth with measurable reliability and support paths |
| Smart pilot | Privacy/legal review completed; opt-in and manual alternative tested; errors and bias monitored |
| Community pilot | Organizers can show repeat-engagement value across multiple events |

No calendar dates are promised until scope, compliance, delivery capacity and validated customer demand are agreed.
