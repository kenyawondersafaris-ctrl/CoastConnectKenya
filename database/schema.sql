CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county VARCHAR(100) NOT NULL,
    town VARCHAR(100) NOT NULL,
    area VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    service_area VARCHAR(150),
    profile_photo TEXT,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    availability_status VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',
    average_rating DECIMAL(3, 2) NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    opening_time TIME,
    closing_time TIME,
    price_range VARCHAR(50),
    is_halal BOOLEAN NOT NULL DEFAULT FALSE,
    offers_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    average_rating DECIMAL(3, 2) NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    price_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    pricing_type VARCHAR(30) NOT NULL DEFAULT 'FIXED',
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_service_id UUID REFERENCES provider_services(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES provider_profiles(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    service_address TEXT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_hours DECIMAL(5, 2),
    instructions TEXT,
    estimated_price DECIMAL(10, 2),
    booking_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES provider_profiles(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        provider_id IS NOT NULL
        OR restaurant_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(location_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);


ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS delivery_zone_id UUID;

ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'checkout_sessions_delivery_zone_id_fkey'
  ) THEN
    ALTER TABLE checkout_sessions
    ADD CONSTRAINT
      checkout_sessions_delivery_zone_id_fkey
    FOREIGN KEY (
      delivery_zone_id
    )
    REFERENCES restaurant_delivery_zones(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS
idx_checkout_sessions_delivery_zone
ON checkout_sessions (
  delivery_zone_id
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    full_name VARCHAR(120) NOT NULL,

    email VARCHAR(180) NOT NULL,

    subject VARCHAR(60) NOT NULL,

    message TEXT NOT NULL,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'OPEN',

    admin_notes TEXT,

    resolved_at TIMESTAMP WITH TIME ZONE,

created_at TIMESTAMP WITH TIME ZONE
    NOT NULL
    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
idx_contact_messages_status
ON contact_messages(status);

CREATE INDEX IF NOT EXISTS
idx_contact_messages_created
ON contact_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS provider_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    provider_id UUID NOT NULL
        REFERENCES provider_profiles(id)
        ON DELETE CASCADE,

    status VARCHAR(30) NOT NULL
        DEFAULT 'DRAFT',

    qualification_summary TEXT,

    portfolio_description TEXT,

    portfolio_url TEXT,

    provider_notes TEXT,

    admin_notes TEXT,

    reviewed_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMP WITH TIME ZONE,

    submitted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(provider_id)
);


CREATE TABLE IF NOT EXISTS provider_verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    verification_id UUID NOT NULL
        REFERENCES provider_verifications(id)
        ON DELETE CASCADE,

    document_type VARCHAR(50) NOT NULL,

    document_name VARCHAR(200) NOT NULL,

    document_url TEXT NOT NULL,

    qualification_name VARCHAR(200),

    issuing_organization VARCHAR(200),

    document_number VARCHAR(150),

    expiry_date DATE,

    status VARCHAR(30) NOT NULL
        DEFAULT 'PENDING',

    admin_notes TEXT,

    reviewed_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    reviewed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS
idx_provider_verifications_provider
ON provider_verifications(provider_id);

CREATE INDEX IF NOT EXISTS
idx_provider_verifications_status
ON provider_verifications(status);

CREATE INDEX IF NOT EXISTS
idx_provider_verification_documents_verification
ON provider_verification_documents(verification_id);

CREATE INDEX IF NOT EXISTS
idx_provider_verification_documents_status
ON provider_verification_documents(status);

