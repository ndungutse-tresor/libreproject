# Libra

Libra is a Next.js reading app. Render hosts the web service; Neon provides PostgreSQL. Accounts and sessions are managed by the app. Stripe checkout is supported for card payments.

## Run locally

1. Install Node.js 20 or newer.
2. Create a Neon project and copy its pooled connection string. Keep `sslmode=require` in the URL.
3. Run the contents of `schema.sql` against the Neon database using the Neon SQL Editor. Re-run it after pulling schema changes; its table and seed statements are designed to preserve existing records.
4. Create `.env.local` with `DATABASE_URL`, `SESSION_SECRET` (at least 32 random characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 12 characters). Add the Stripe settings if using payments.
5. Install and start the app:

   ```powershell
   npm ci
   npm run dev
   ```

The app is available at `http://localhost:3000`. Use `/login` and `/signup` for the shared account system. On the first login with the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`, Libra creates the super administrator account automatically. Keep these credentials private and use a unique, strong password.

## Deploy to Render

1. Push this project to a Git repository and create a Render **Web Service** from it. `render.yaml` contains the service configuration; choose the free plan or another plan when creating the service.
2. Set `DATABASE_URL` to the Neon pooled connection string in the Render service environment. The database must accept connections from Render; Neon pooled connection strings work with the `pg` driver.
3. Render generates `SESSION_SECRET` from `render.yaml`. If configuring manually, set it to a random value of at least 32 characters.
4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the Render environment. Use a unique email and a strong password of at least 12 characters; do not commit either value.
5. For Stripe payments, add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. In Stripe, create a webhook endpoint at `https://<your-render-domain>/api/webhooks/stripe` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
6. Set `SITE_URL` to the deployed HTTPS URL if you want to override `RENDER_EXTERNAL_URL`.
7. Run `schema.sql` against the Neon database before deployment, and re-run it after pulling schema updates. Then sign in with the configured administrator credentials to create the super administrator account.

Never expose `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, or Stripe secret keys in client-side variables or commit them to source control.

## Features and current limits

- Email/password signup and login with bcrypt password hashes and signed, HTTP-only session cookies.
- Sample library and reader pages. The sample reader serves only the free half to signed-out users; authenticated users can unlock the rest with reading time or an active Premium entitlement.
- The super administrator has a separate overview at `/admin`; delegated administrators land on a workspace dashboard showing only their granted sections.
- Only the super administrator can promote an administrator to super administrator. Super administrator accounts cannot be edited or deleted through the platform.
- Admin actions are recorded in a super-admin-only history at `/admin/history`. Reversible member, publishing, and platform-setting changes can be restored without notifying the original administrator; password resets, account creation, and promotions to super administrator are audit-only, and passwords are never stored.
- The admin workspace includes member search, reading-time and Premium-access management, and permission-controlled administrator roles.
- Readers and writers choose their account type at signup and login. New writers need administrator approval before submitting books, memes, and quotes; each submission is reviewed separately before it appears in the public library.
- Approved books support PDF, EPUB, and UTF-8 text uploads (up to 15 MB). Memes support text, JPEG/PNG/GIF/WebP images (up to 5 MB), or both; quotes are text submissions. Uploaded book and meme files are stored in PostgreSQL.
- Administrators manage writer access from Members and review, publish, or disable submissions from Publishing. Grant the `content` permission to an administrator role to allow publishing management.
- The read-only order history at `/admin/orders` supports search, status filters, and payment-status summaries for administrators with `payments` permission.
- Payment methods, plans, coupons, and currencies can be added, enabled or disabled, and removed from `/admin/payments` by an administrator with `payments` permission.
- Existing payment and platform settings can also be edited from `/admin/payments`.
- Card checkout uses Stripe. The signed Stripe webhook marks an order paid and grants the purchased time or Premium days.
- Stripe card checkout is currently integrated; PayPal and mobile-money methods are seeded as disabled placeholders and are not yet integrated.
- The sample reader text is local demo content; uploaded books are served from the database-backed library and reader routes.
