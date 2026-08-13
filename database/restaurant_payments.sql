CREATE TABLE restaurant_payments (

    id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    order_id UUID NOT NULL
        REFERENCES restaurant_orders(id)
        ON DELETE CASCADE,

    restaurant_id UUID NOT NULL
        REFERENCES restaurants(id)
        ON DELETE CASCADE,

    customer_id UUID
        REFERENCES users(id),

    payment_reference VARCHAR(120) UNIQUE,

    checkout_request_id VARCHAR(120),

    merchant_request_id VARCHAR(120),

    transaction_id VARCHAR(120),

    payment_method VARCHAR(30)
        NOT NULL,

    payment_provider VARCHAR(40)
        NOT NULL,

    phone_number VARCHAR(20),

    amount DECIMAL(10,2)
        NOT NULL,

    currency VARCHAR(10)
        DEFAULT 'KES',

    status VARCHAR(30)
        DEFAULT 'PENDING',

    provider_response JSONB,

    callback_payload JSONB,

    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW()
);