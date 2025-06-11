-- Initialize database schema and seed data
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table  
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create components table
CREATE TABLE IF NOT EXISTS components (
    id SERIAL PRIMARY KEY,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    supplier_id INTEGER REFERENCES suppliers(id),
    category_id INTEGER REFERENCES categories(id),
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'EUR',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create relationships table
CREATE TABLE IF NOT EXISTS supply_chain_relationships (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES components(id),
    target_id INTEGER REFERENCES components(id),
    relationship_type VARCHAR(100),
    strength DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create IP screener usage tracking table
CREATE TABLE IF NOT EXISTS ip_screener_usage (
    id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES components(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    patent_count INTEGER DEFAULT 0,
    session_token VARCHAR(255),
    response_time_ms INTEGER,
    from_cache BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_components_supplier ON components(supplier_id);
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON supply_chain_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON supply_chain_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_usage_component ON ip_screener_usage(component_id);
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON ip_screener_usage(timestamp);

