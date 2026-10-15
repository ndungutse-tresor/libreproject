-- Run this once against the Neon database from the Render Shell or Neon SQL Editor.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super')),
  perms text[] NOT NULL DEFAULT '{}',
  reading_seconds integer NOT NULL DEFAULT 300 CHECK (reading_seconds >= 0),
  premium_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique ON profiles (lower(email));

CREATE TABLE IF NOT EXISTS books (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  author text,
  language text NOT NULL DEFAULT 'en',
  cover_url text,
  file_path text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_pages (
  book_id bigint NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  lang text NOT NULL,
  page_no integer NOT NULL CHECK (page_no > 0),
  content text NOT NULL,
  PRIMARY KEY (book_id, lang, page_no)
);

CREATE TABLE IF NOT EXISTS interactions (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id bigint NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('like', 'love', 'save')),
  PRIMARY KEY (user_id, book_id, kind)
);

CREATE TABLE IF NOT EXISTS progress (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id bigint NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_no integer NOT NULL DEFAULT 1 CHECK (page_no > 0),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS currencies (
  code text PRIMARY KEY,
  symbol text NOT NULL,
  rate_to_usd numeric NOT NULL CHECK (rate_to_usd > 0),
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  provider text NOT NULL,
  currencies text[] NOT NULL DEFAULT ARRAY['USD', 'GBP', 'RWF'],
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS plans (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('time', 'premium')),
  name text NOT NULL,
  minutes integer CHECK (minutes IS NULL OR minutes > 0),
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  price_usd numeric NOT NULL CHECK (price_usd >= 0),
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY,
  percent_off integer NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  expires_at timestamptz,
  enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id),
  plan_id bigint NOT NULL REFERENCES plans(id),
  method_id bigint NOT NULL REFERENCES payment_methods(id),
  currency text NOT NULL REFERENCES currencies(code),
  amount numeric NOT NULL CHECK (amount >= 0),
  coupon text REFERENCES coupons(code),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO currencies (code, symbol, rate_to_usd) VALUES
  ('USD', '$', 1),
  ('GBP', '£', 0.79),
  ('RWF', 'RWF ', 1450)
ON CONFLICT (code) DO NOTHING;

INSERT INTO payment_methods (key, label, provider, enabled) VALUES
  ('card', 'Credit / Debit card', 'stripe', true),
  ('paypal', 'PayPal', 'paypal', false),
  ('momo', 'MTN MoMo', 'flutterwave', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO plans (kind, name, minutes, price_usd) VALUES
  ('time', '30 minutes', 30, 2),
  ('time', '2 hours', 120, 5),
  ('time', '10 hours', 600, 15),
  ('premium', 'Premium (1 month)', NULL, 9.99);
