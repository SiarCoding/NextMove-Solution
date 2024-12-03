CREATE TABLE IF NOT EXISTS customer_checklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    payment_option TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    company_info TEXT NOT NULL,
    web_design JSONB NOT NULL,
    market_research JSONB NOT NULL,
    legal_info JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
