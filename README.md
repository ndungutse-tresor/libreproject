# Libra

Libra is a Next.js reading app. Render hosts the web service; Neon provides PostgreSQL. Accounts and sessions are managed by the app. Stripe checkout is supported for card payments.

## Run locally

1. Install Node.js 20 or newer.
2. Create a Neon project and copy its pooled connection string. Keep `sslmode=require` in the URL.
3. Run the contents of `schema.sql` against the Neon database using the Neon SQL Editor.
4. Copy `.env.example` to `.env.local` and fill in the values.
5. Install and start the app:

   ```powershell
   npm ci
   npm run dev
   ```

The app is available at `http://localhost:3000`. Register through `/signup`. Make the first account a super administrator in the Neon SQL Editor:

```sql
UPDATE profiles SET role = 'super' WHERE email = 'you@example.com';
```

## Deploy to Render

1. Push this project to a Git repository and create a Render **Web Service** from it. `render.yaml` contains the service configuration; choose the free plan or another plan when creating the service.
2. Set `DATABASE_URL` to the Neon pooled connection string in the Render service environment. The database must accept connections from Render; Neon pooled connection strings work with the `pg` driver.
3. Render generates `SESSION_SECRET` from `render.yaml`. If configuring manually, set it to a random value of at least 32 characters.
4. For Stripe payments, add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. In Stripe, create a webhook endpoint at `https://<your-render-domain>/api/webhooks/stripe` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
5. Set `SITE_URL` to the deployed HTTPS URL if you want to override Render's `RENDER_EXTERNAL_URL`.
6. Run `schema.sql` once against the Neon database, deploy, register your account, then promote it to `super` with the SQL above.

Never expose `DATABASE_URL`, `SESSION_SECRET`, or Stripe secret keys in client-side variables or commit them to source control.

## Features and current limits

- Email/password signup and login with bcrypt password hashes and signed, HTTP-only session cookies.
- Sample library and reader pages. The sample reader serves only the free half to signed-out users; authenticated users can unlock the rest with reading time or an active Premium entitlement.
- Payment settings are stored in Neon and are editable from `/admin/payments` by a super administrator or an admin with `payments` permission.
- Card checkout uses Stripe. The signed Stripe webhook marks an order paid and grants the purchased time or Premium days.
- PayPal and mobile-money methods are seeded as disabled placeholders and are not yet integrated.
- The sample book text is local demo content; it is not yet loaded from the `books` and `book_pages` database tables.
