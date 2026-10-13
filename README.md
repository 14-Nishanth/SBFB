# SBFB — Sri Balamurugan Fly Ash Bricks

A web-based management app for Sri Balamurugan Fly Ash Bricks, designed to be opened as a **Telegram Mini App** and backed by **Supabase** for cloud data storage.

> **Project status:** The initial app and backend are in the repository. Finish the setup steps below and test the deployed app before using it for live business records. Advanced production-recipe, FIFO payment, editing, and profit workflows are still in progress and must not be assumed operational.

## Features in the current app

- Dashboard summaries for stock, sales, customers, and employees
- Material inward / stock-entry records
- Sales and outward records
- Customer and supplier records
- Employee records, attendance, and work entries
- Production-entry form with manually entered cost components
- Rate Master
- Weekly and monthly turnover reports
- Customer receivables and supplier payables summaries
- Record-by-record deletion

The feature set depends on the version of the Supabase Edge Function currently deployed. Verify all actions in a test run before relying on them for business operations.

## Architecture

- **Frontend:** HTML, CSS, and JavaScript (management.html, management.css, management.js)
- **Database:** Supabase Postgres
- **Backend API:** Supabase Edge Function in supabase/functions/sbfb-api/
- **Hosting:** GitHub Pages
- **Telegram integration:** Telegram Mini App WebApp data; the backend validates Telegram init data
- **Secrets:** Telegram bot token and Supabase service-role key stay on the server and must never be committed to this repository or exposed in browser code

The public company website in index.html is kept separate from the management app.

## Project structure

    .
    ├── index.html
    ├── management.html
    ├── management.css
    ├── management.js
    ├── .github/
    │   └── workflows/
    │       └── pages.yml
    └── supabase/
        └── functions/
            └── sbfb-api/
                ├── index.ts
                └── deno.json

## Setup and deployment

### 1. Publish with GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Set the build/deployment source to **GitHub Actions**.
3. Wait for the Pages workflow to complete successfully in the **Actions** tab.
4. Open the management app at:

   https://14-nishanth.github.io/SBFB/management.html

If the page returns 404, confirm that Pages is enabled and the workflow completed successfully.

### 2. Configure Supabase

The frontend calls this project's Edge Function endpoint:

https://kfqakkbqtczoilisoydj.supabase.co/functions/v1/sbfb-api

In the Supabase project dashboard, configure the Edge Function secrets required by the backend:

- TELEGRAM_BOT_TOKEN — token for your Telegram bot
- ADMIN_TELEGRAM_IDS — allow-listed numeric Telegram user ID(s), in the format expected by the function
- SUPABASE_SERVICE_ROLE_KEY — the project's server-side service-role secret, if required by the deployed function runtime

Use Supabase's secret-management interface. **Never paste secret values into this README, source files, GitHub issues, or chat messages.** Do not put the service-role key in frontend JavaScript.

After changing backend code, deploy the Edge Function from the supabase/functions/sbfb-api/ directory and confirm that the deployed version includes the intended changes. A GitHub commit by itself does not update the already-deployed Supabase function.

### 3. Configure the Telegram menu button

In Telegram, open [@BotFather](https://t.me/BotFather):

1. Send /setmenubutton.
2. Select the SBFB bot.
3. Set the button label to SBFB Management.
4. Set the URL to https://14-nishanth.github.io/SBFB/management.html.

Open the bot from Telegram to test the Mini App. Authentication relies on Telegram WebApp data, so opening the app in an ordinary browser may not behave like an authenticated Telegram session.

## Database and data safety

- Supabase is the persistent cloud database; GitHub Pages serves the frontend and does not store business records.
- Keep the Supabase service-role key server-side only.
- Use an allow-list for authorized Telegram user IDs.
- Test inserts, updates, deletes, reporting, and permissions with sample records before live use.
- Do not run destructive SQL or clear existing tables unless you have verified backups and explicitly intend to remove those records.
- Confirm database backups and recovery procedures in Supabase before depending on the system for important business records.

## Development checklist

- [ ] Enable GitHub Pages using GitHub Actions and confirm the published URL works.
- [ ] Configure the required Supabase Edge Function secrets.
- [ ] Deploy the latest Edge Function code and verify its deployed version.
- [ ] Configure the Telegram menu button in BotFather.
- [ ] Test login/authentication and each data-entry/reporting workflow.
- [ ] Complete and test recipe-based production costing and raw-material stock deduction.
- [ ] Complete and test FIFO customer receipts and supplier payments.
- [ ] Complete record-editing screens and business-expense/profit reporting.
- [ ] Verify backups and restore procedure before using the app for critical records.

## Security

Never commit .env files, bot tokens, database passwords, or Supabase service-role keys. If a token is accidentally exposed, revoke or rotate it immediately and update the server-side secret.

## Links

- Repository: https://github.com/14-Nishanth/SBFB
- Management app: https://14-nishanth.github.io/SBFB/management.html
- Supabase project: https://supabase.com/dashboard/project/kfqakkbqtczoilisoydj
- Telegram BotFather: https://t.me/BotFather
