BEGIN;


CREATE TABLE IF NOT EXISTS subscription_plans (

  id UUID PRIMARY KEY
    DEFAULT uuid_generate_v4(),

  name VARCHAR(120) NOT NULL,

  business_type VARCHAR(30) NOT NULL
    CHECK (
      business_type IN (
        'PROVIDER',
        'RESTAURANT'
      )
    ),

  billing_period VARCHAR(20) NOT NULL
    CHECK (
      billing_period IN (
        'MONTHLY',
        'YEARLY'
      )
    ),

  amount_kes NUMERIC(12, 2) NOT NULL
    CHECK (
      amount_kes >= 0
    ),

  duration_days INTEGER NOT NULL
    CHECK (
      duration_days > 0
    ),

  is_active BOOLEAN NOT NULL
    DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (
    business_type,
    billing_period
  )

);


CREATE TABLE IF NOT EXISTS business_subscriptions (

  id UUID PRIMARY KEY
   DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  plan_id UUID NOT NULL
    REFERENCES subscription_plans(id)
    ON DELETE RESTRICT,

  business_type VARCHAR(30) NOT NULL
    CHECK (
      business_type IN (
        'PROVIDER',
        'RESTAURANT'
      )
    ),

  status VARCHAR(30) NOT NULL
    DEFAULT 'PENDING'
    CHECK (
      status IN (
        'PENDING',
        'ACTIVE',
        'EXPIRED',
        'CANCELLED',
        'SUSPENDED'
      )
    ),

  starts_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ,

  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP

);


CREATE TABLE IF NOT EXISTS subscription_payments (

  id UUID PRIMARY KEY
   DEFAULT uuid_generate_v4(),

  subscription_id UUID NOT NULL
    REFERENCES business_subscriptions(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  amount_kes NUMERIC(12, 2) NOT NULL
    CHECK (
      amount_kes >= 0
    ),

  currency VARCHAR(10) NOT NULL
    DEFAULT 'KES',

  provider VARCHAR(30) NOT NULL
    DEFAULT 'PAYSTACK',

  paystack_reference VARCHAR(255) UNIQUE,

  paystack_transaction_id VARCHAR(255),

  status VARCHAR(30) NOT NULL
    DEFAULT 'INITIALIZED'
    CHECK (
      status IN (
        'INITIALIZED',
        'SUCCESS',
        'FAILED',
        'ABANDONED',
        'REFUNDED'
      )
    ),

  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP

);


CREATE INDEX IF NOT EXISTS
  idx_business_subscriptions_user
ON business_subscriptions(user_id);


CREATE INDEX IF NOT EXISTS
  idx_business_subscriptions_status
ON business_subscriptions(status);


CREATE INDEX IF NOT EXISTS
  idx_business_subscriptions_expiry
ON business_subscriptions(expires_at);


CREATE INDEX IF NOT EXISTS
  idx_subscription_payments_reference
ON subscription_payments(paystack_reference);


INSERT INTO subscription_plans (

  name,
  business_type,
  billing_period,
  amount_kes,
  duration_days

)

VALUES

(
  'Provider Monthly',
  'PROVIDER',
  'MONTHLY',
  250,
  30
),

(
  'Provider Yearly',
  'PROVIDER',
  'YEARLY',
  1800,
  365
),

(
  'Restaurant Monthly',
  'RESTAURANT',
  'MONTHLY',
  350,
  30
),

(
  'Restaurant Yearly',
  'RESTAURANT',
  'YEARLY',
  2400,
  365
)


ON CONFLICT (
  business_type,
  billing_period
)

DO NOTHING;


COMMIT;