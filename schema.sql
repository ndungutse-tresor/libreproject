-- Apply against the Neon database from the Render Shell or Neon SQL Editor.
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
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'reader',
  ADD COLUMN IF NOT EXISTS writer_status text NOT NULL DEFAULT 'disabled',
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age smallint,
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS favorite_genres text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_image_data bytea,
  ADD COLUMN IF NOT EXISTS profile_image_mime_type text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_type_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('reader', 'writer'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_writer_status_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_writer_status_check CHECK (writer_status IN ('disabled', 'pending', 'approved'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gender_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check CHECK (gender IS NULL OR gender IN ('male', 'female', 'prefer_not_to_say'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_age_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_age_check CHECK (age IS NULL OR age BETWEEN 1 AND 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_profile_image_mime_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_profile_image_mime_check
      CHECK (profile_image_mime_type IS NULL OR profile_image_mime_type IN ('image/jpeg', 'image/png', 'image/webp'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_profile_image_pair_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_profile_image_pair_check
      CHECK ((profile_image_data IS NULL) = (profile_image_mime_type IS NULL));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique ON profiles (lower(email));

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('profile', 'payment_setting', 'submission')),
  entity_id text NOT NULL,
  target_name text NOT NULL,
  summary text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  can_restore boolean NOT NULL DEFAULT false,
  restored_at timestamptz,
  related_event_id bigint REFERENCES admin_audit_log(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx ON admin_audit_log (entity_type, entity_id, created_at DESC);

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

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

CREATE TABLE IF NOT EXISTS content_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('book', 'meme', 'quote')),
  title text NOT NULL,
  author text,
  attribution text,
  body text,
  file_name text,
  mime_type text,
  file_data bytea,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'book' AND file_name IS NOT NULL AND mime_type IS NOT NULL AND file_data IS NOT NULL)
    OR (kind = 'meme' AND (file_data IS NOT NULL OR NULLIF(btrim(body), '') IS NOT NULL))
    OR (kind = 'quote' AND NULLIF(btrim(body), '') IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS content_submissions_status_created_idx ON content_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_submissions_creator_created_idx ON content_submissions (creator_id, created_at DESC);

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS source_submission_id uuid REFERENCES content_submissions(id);
CREATE UNIQUE INDEX IF NOT EXISTS books_source_submission_unique ON books (source_submission_id) WHERE source_submission_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('meme', 'quote')),
  title text NOT NULL,
  body text NOT NULL,
  attribution text,
  source_submission_id uuid NOT NULL UNIQUE REFERENCES content_submissions(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_posts_published_created_idx ON content_posts (is_published, created_at DESC);

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

INSERT INTO plans (kind, name, minutes, price_usd)
SELECT 'time', '30 minutes', 30, 2
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = '30 minutes');
INSERT INTO plans (kind, name, minutes, price_usd)
SELECT 'time', '2 hours', 120, 5
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = '2 hours');
INSERT INTO plans (kind, name, minutes, price_usd)
SELECT 'time', '10 hours', 600, 15
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = '10 hours');
INSERT INTO plans (kind, name, minutes, duration_days, price_usd)
SELECT 'premium', 'Premium (1 month)', NULL, 30, 9.99
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium (1 month)');
