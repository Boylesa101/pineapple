# copacetic.web client portal

Next.js 16 app on Supabase (project `dcupbtreveatutogouhl`). The build spec is in `../docs/PORTAL_SPEC.md`.

```bash
npm install
cp .env.example .env.local   # fill in
npm run dev                  # http://localhost:3000
npm test                     # unit tests
npm run typecheck
```

Database changes live in `supabase/migrations`, and the pgTAP tests are in `supabase/tests`.

## Setting up Asana sync (Phase 3)

Until these steps are done, submissions queue up in `integration_events` and nothing is lost.

1. **Team.** In Asana, create the **copacetic.web** team. Its ID is the number in the team page URL; put it in `ASANA_TEAM_GID`.
2. **Token.** Create a personal access token under Asana → My settings → Apps → Developer apps.
   - Ideally use a dedicated "copacetic.web portal" account that is a member of the team.
   - Set it as `ASANA_TOKEN`. It is server-only, so never give it a `NEXT_PUBLIC_` prefix.
3. **Supabase secret key.** Copy it from Project settings → API keys → Secret keys and set it as `SUPABASE_SECRET_KEY`. Only the job worker and the Asana webhook use it.
4. **Schedule.**
   - Generate a jobs secret with `openssl rand -hex 32` and set it as `JOBS_SECRET` in Vercel.
   - Then, in the Supabase SQL editor, store the same value plus the run URL:
     ```sql
     select vault.create_secret('<JOBS_SECRET value>', 'jobs_secret');
     select vault.create_secret('https://<portal domain>/api/jobs/run', 'jobs_url');
     ```
   - pg_cron then checks every minute and calls the portal only when jobs are due.
5. **Portal URL.** `PORTAL_URL` must be the public `https://` address. Asana delivers task changes there (`/api/webhooks/asana`). With a localhost URL, two-way sync stays off.

### What happens once it's set up

- **Adding a client** creates a project in the team with the sections Briefing, Content, Build, Review and Launch. It also registers a webhook.
- **Submitting the briefing or a content item** creates a task, assigned to `ASANA_ASSIGNEE_GID`, with a link back to the portal. Resubmitting updates the same task, marks it incomplete, and adds a comment.
- **Reopening** an item in the portal marks its task incomplete and adds a comment.
- **Completing a content task in Asana** approves that item in the portal. Un-completing it sends the item back to "submitted".
- **Failures** retry after 1 minute, 5 minutes, 30 minutes, 2 hours and 12 hours. After 8 attempts they show on **Admin → Asana sync**, where you can retry them.

Existing clients get their project on the first run. To use a project you already have, open the client's page and choose **Link existing project**.
