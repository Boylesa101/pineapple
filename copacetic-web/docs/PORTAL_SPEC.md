# Client Portal — Build Spec

> Build one phase at a time. For each phase, propose a plan (tables, routes, files, open questions) and wait for approval before writing code. Commit each logical step separately. Do not build ahead.

---

## 1. What we're building

A portal for **copacetic.web**, a web design agency that builds websites for UK law firms. One app, two sides:

- **Agency admin** (Andrew): sees every client, their site, build versions, analytics, briefings, invoices and Asana sync status. Invites clients, and assigns draft builds and previews to them.
- **Client portal** (each law firm): completes the briefing and content, reviews draft builds, signs off, pays, then blogs and edits content through the CMS.

The portal is also the **CMS for every client site**. Client websites are separate Next.js deployments on Vercel that read their published content from the portal. This replaces a separate Payload CMS per client: one login, one admin, one database.

## 1a. Where it lives (decided 2026-09-26)

The portal is a **standalone copacetic.web product**. It has nothing to do with the Copacetic legal-practice app at copacetic.legal: it doesn't share its repo, Vercel project, Supabase project, users, secrets or integrations.

- **Code:** the `portal/` Next.js app in the copacetic.web repo, next to the marketing site. (It's temporarily in `pineapple/copacetic-web/portal` until the `copacetic-web` repo exists.)
- **Database and auth:** its own Supabase project, `copacetic-portal` (London, eu-west-2). Tables live in `public`, with RLS on every table.
- **Hosting:** its own Vercel project, served at `portal.<agency domain>`.
- **Integrations:** Asana, Stripe, Resend and Vercel use the agency's own accounts and keys, in `lib/` modules with their own environment variables.

## 2. Stack

- Next.js (App Router, TypeScript, Server Actions), deployed on Vercel
- Supabase: Auth, Postgres with Row Level Security, Storage
- Stripe: customers and invoices (hosted invoice page)
- Resend: transactional email
- Asana REST API: projects, sections, tasks
- Vercel REST API: projects, deployments, domains
- Rich text: Tiptap, stored as JSON
- Validation: Zod on every server boundary

All third-party secrets are server-only environment variables. Never expose the Vercel token, Stripe secret, Asana token or Supabase service role key to the browser. Never commit them.

## 3. The client journey (state machine)

Each site moves through these stages. Stage controls what the client can see and do.

| Stage | Client can | Agency does |
|---|---|---|
| `invited` | Accept invite, set up account | Sends invite |
| `onboarding` | Complete briefing and content sections, upload files | Watches progress |
| `content_submitted` | View submitted content (read-only unless reopened) | Content pushed to Asana; can reopen sections |
| `in_build` | See status only | Builds; links Vercel deployments |
| `in_review` | View shared draft builds, leave comments, request changes | Shares a build version; responds to comments |
| `signed_off` | View invoice and pay | Invoice issued automatically on sign-off |
| `paid` | Full CMS unlocked: blog, edit content sections | Prepares launch |
| `live` | CMS, analytics, invoices | Ongoing care plan |

Rules:
- Only an agency admin moves a site between stages, except: client submit (`onboarding → content_submitted`), client sign-off (`in_review → signed_off`), and Stripe payment (`signed_off → paid`, via webhook).
- Every stage change is written to `audit_log` and emails the relevant people.
- The invoice trigger is configurable per site: `invoice_on` = `sign_off` (default) or `deposit_and_sign_off` (50% on content submission, balance on sign-off).

## 4. Roles and permissions

- `agency_admin`: everything, across all organisations. Requires two-factor authentication.
- `client_owner`: manages their firm's users, signs off builds, sees invoices.
- `client_approver`: approves blog posts and signs off builds (usually the COLP or a partner).
- `client_editor`: writes content and blog drafts; cannot publish or sign off.

Enforce with Supabase RLS on every table, using `org_id` and membership role. Server actions must also check permissions: RLS is the backstop, not the only check. Add RLS tests for each table (a client from org A must never read or write org B).

## 5. Data model (starting point)

- `organisations`: id, name, slug, sra_number, created_at
- `profiles`: user_id, full_name, is_agency_admin
- `memberships`: org_id, user_id, role
- `invitations`: org_id, email, role, token_hash, expires_at (7 days), accepted_at, invited_by
- `sites`: org_id, name, stage, vercel_project_id, production_domain, asana_project_gid, stripe_customer_id, invoice_on, analytics_site_id, revalidate_url, revalidate_secret (encrypted)
- `briefings`: org_id, data (jsonb, same fields as the existing briefing form), status (`draft`/`submitted`), submitted_at, submitted_by
- `content_sections`: org_id, type, title, body (Tiptap JSON), fields (jsonb), sort_order, status (`draft`/`submitted`/`approved`), placement (for custom sections: which page and where), asana_task_gid, updated_by
- `media`: org_id, storage_path, alt_text, kind, uploaded_by
- `builds`: site_id, vercel_deployment_id, url, version_label, notes, shared_with_client, status (`in_review`/`changes_requested`/`approved`), created_at
- `build_comments`: build_id, user_id, page_path, comment, resolved
- `signoffs`: build_id, user_id, signed_at, ip_address, statement (snapshot of the exact sign-off wording)
- `invoices`: org_id, stripe_invoice_id, kind (`deposit`/`final`/`care_plan`), amount_pence, status, hosted_invoice_url, due_date
- `posts`: org_id, title, slug, excerpt, body (Tiptap JSON), cover_media_id, status (`draft`/`in_review`/`scheduled`/`published`), author_id, approved_by, publish_at, published_at, seo_title, seo_description
- `integration_events`: provider, action, payload, status, attempts, last_error (retry queue for Asana/Stripe/Vercel)
- `audit_log`: actor_id, org_id, action, entity, entity_id, before, after, created_at

## 6. Content sections (client side)

Structured sections the client completes during onboarding and edits after payment:

- **Briefing**: port the existing briefing form's eight sections (firm and regulatory, business, price and service info, branding, content and features, blog, technical, timing and budget). Keep PDF, email and Asana outputs working.
- **About us**: firm story, values, history
- **Services / practice areas** (repeatable): name, summary, full description, who it's for, key people
- **Team** (repeatable): name, role, photo, bio, qualifications, practising status, languages
- **Offices** (repeatable): address, phone, hours, map link
- **Price and service pages**: one per SRA Transparency Rules service ticked in the briefing, with fields for total cost or range, basis of charges, disbursements, VAT, inclusions and exclusions, key stages, timescales, staff experience and supervision
- **Testimonials**: quote, source, permission confirmed (checkbox required)
- **FAQs** (repeatable): question and answer
- **Custom sections**: the client creates them: title, content, target page, placement note, optional files

Each section shows completion progress. Autosave drafts. Submit per section or all at once.

**Asana sync:** on submission, each section creates or updates one task in the site's Asana project, in a "Content" section, with the content summary and links to files in the portal. Custom sections always create their own task. Store `asana_task_gid`; syncing must be idempotent (re-submitting updates the task, never duplicates it). Failed calls go to `integration_events` and retry with backoff. The admin sees sync status per section.

## 7. Build versions and review

- In Phase 1, the admin adds a preview by URL (with a label and notes) and shares it with the client.
- Phase 4 adds the rest. The admin links a Vercel project to a site and sees its deployments (listed via the Vercel API).
- The admin marks a deployment as a version for client review, with a label (for example "v2 — homepage revisions") and notes.
- The client sees shared versions only, newest first, and can open the preview and leave comments per page.
- **Vercel preview protection:** preview URLs are protected by default. Do not turn protection off for the account. Use Vercel's shareable-link or protection-bypass mechanism per shared deployment, generated server-side. Check Vercel's current docs for the right approach.
- **Sign-off:** a `client_approver` or `client_owner` signs off a specific version, confirming: *"I confirm this version is approved, and that the regulatory information shown is accurate."* Record the user, time, IP and exact wording in `signoffs`. Sign-off triggers the invoice (section 8).

## 8. Invoices (Stripe)

- Create a Stripe customer per organisation.
- On sign-off (or on content submission, for deposits), create and finalise a Stripe invoice and email the hosted invoice link.
- The Stripe webhook (`invoice.paid`, `invoice.payment_failed`) updates `invoices` and moves the site to `paid`. Verify webhook signatures. Make handlers idempotent.
- The client sees all invoices and their status. Care plan billing can come later (Stripe subscriptions).

## 9. CMS and blog (unlocked at `paid`)

- A Tiptap editor with headings, lists, links, images and quotes. No raw HTML.
- Workflow: an editor drafts and submits for review, then an approver publishes or schedules. Approvers can publish directly.
- SEO fields, slug, and a cover image with required alt text.
- Before publishing, show a short checklist: no client-identifying information, no guaranteed outcomes, claims accurate (SRA publicity rules).
- After launch, clients can also edit their content sections; changes to regulatory sections (price pages, company details) require approver sign-off.

**Serving content to client sites:**
- A read-only public API: `GET /api/public/sites/{siteId}/posts`, `/posts/{slug}`, `/sections`. Published content only. Cache and rate-limit.
- On publish or update, call the client site's revalidation endpoint (`revalidate_url`, with a secret header) so it refreshes via on-demand revalidation.
- Add a small reusable fetch module to the starter template client sites use.

## 10. Admin dashboard

- **All sites table:** firm, stage, days in stage, latest build, domain status, last Asana sync, invoice status, last blog post. Filter by stage.
- **Site detail:** briefing, content sections, builds and comments, sign-off record, invoices, audit log, integration errors.
- **Analytics:** pageviews, top pages and referrers per site for the last 7/30/90 days, behind a provider interface. Check whether Vercel exposes Web Analytics data through its API for this; if not, use Plausible's Stats API with `analytics_site_id`. Clients see their own site's analytics once `live`.
- **Invite client:** create the organisation and site, then invite by email with a role. Invites are single use and expire in 7 days.

## 11. Security and compliance requirements

- RLS on every table, with tests for cross-organisation access.
- Two-factor authentication required for `agency_admin`; optional for clients.
- Private storage buckets; files served through signed URLs scoped to the organisation.
- File uploads: allowlisted types (images, PDF, sanitised SVG), a size limit, and a virus scan if feasible.
- Rate limiting on auth, invites, the public API and uploads.
- Security headers (CSP, HSTS). No secrets in client bundles or Git history.
- UK GDPR: a privacy notice for the portal, data processing terms with clients, and the ability to export and delete an organisation's data.
- An audit log for stage changes, sign-offs, publishes, role changes and deletions.
- Accessible to WCAG 2.2 AA.

## 12. Build phases

Stop after each phase for review. Separate commits per logical step.

1. **Foundations:** schema and migrations, RLS and tests, auth (with 2FA for admins), roles, organisations, invites, admin and client layouts, audit log, and **simple preview sharing** (the admin adds a preview URL with a label and notes and shares it with the client, who sees their shared previews).
2. **Onboarding:** the briefing (ported from the existing form) and all content sections, with autosave, uploads and submission.
3. **Asana sync:** project creation from the briefing, a task per section, idempotent sync, a retry queue, and an admin status view.
4. **Builds and review:** Vercel project linking, the deployments list, sharing versions with protection bypass, comments and sign-off.
5. **Invoices:** Stripe customers, invoice on sign-off, webhooks, stage transitions, and the client invoice view.
6. **CMS and blog:** the editor, approval workflow, scheduling, public API, revalidation, and the starter template module.
7. **Admin dashboard and analytics:** the all-sites view, site detail, and the analytics provider.

## 13. Out of scope for now

Care plan subscriptions, in-portal chat, multi-language content, and white-labelling the portal per client.
