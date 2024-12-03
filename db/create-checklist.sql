DROP TABLE IF EXISTS customer_checklist;

CREATE TABLE customer_checklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    payment_option VARCHAR(255) NOT NULL,
    tax_id VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    target_audience VARCHAR(255) NOT NULL,
    company_info VARCHAR(255) NOT NULL,
    web_design VARCHAR(255) NOT NULL,
    market_research VARCHAR(255) NOT NULL,
    legal_info VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id)
);
