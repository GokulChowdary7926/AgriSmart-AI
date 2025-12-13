-- PostgreSQL Database Schema for AgriSmart AI Agriculture Platform
-- Complete production-ready schema with all tables

-- Core Tables

-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'farmer' CHECK (role IN ('farmer', 'expert', 'admin', 'dealer')),
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml', 'pa')),
    location JSONB,
    soil_type VARCHAR(50),
    farm_size DECIMAL(10,2), -- in acres
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
    subscription_expires_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(50) CHECK (device_type IN ('android', 'ios', 'web', 'sms', 'whatsapp')),
    fcm_token VARCHAR(255),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop Database (75+ crops)
CREATE TABLE IF NOT EXISTS crops (
    id SERIAL PRIMARY KEY,
    crop_id VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),
    name_te VARCHAR(100),
    name_ta VARCHAR(100),
    name_ml VARCHAR(100),
    scientific_name VARCHAR(100),
    category VARCHAR(50) CHECK (category IN ('cereal', 'pulse', 'vegetable', 'fruit', 'oilseed', 'spice', 'plantation', 'forage', 'medicinal')),
    seasons JSONB, -- ['kharif', 'rabi', 'zaid']
    description JSONB, -- Multi-language descriptions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crop_cultivation (
    id SERIAL PRIMARY KEY,
    crop_id INTEGER REFERENCES crops(id) ON DELETE CASCADE,
    climate_requirements JSONB,
    soil_requirements JSONB,
    land_preparation JSONB,
    planting_info JSONB,
    nutrient_schedule JSONB,
    irrigation_schedule JSONB,
    intercultivation JSONB,
    harvest_info JSONB,
    yield_range JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pests_diseases (
    id SERIAL PRIMARY KEY,
    crop_id INTEGER REFERENCES crops(id) ON DELETE CASCADE,
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),
    type VARCHAR(20) CHECK (type IN ('pest', 'disease', 'deficiency')),
    symptoms JSONB,
    causes JSONB,
    organic_control JSONB,
    chemical_control JSONB,
    prevention JSONB,
    images JSONB, -- URLs to disease images
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Farms and Fields
CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location JSONB, -- {lat, lng, address, village, district, state}
    total_area DECIMAL(10,2), -- in acres
    soil_type VARCHAR(50),
    soil_ph DECIMAL(3,1),
    soil_nutrients JSONB, -- {N, P, K, organic_matter}
    irrigation_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fields (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    crop_id INTEGER REFERENCES crops(id),
    area DECIMAL(10,2), -- in acres
    sowing_date DATE,
    expected_harvest_date DATE,
    current_stage VARCHAR(50),
    irrigation_schedule JSONB,
    fertilizer_schedule JSONB,
    pest_control_schedule JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IoT Sensor Data
CREATE TABLE IF NOT EXISTS iot_sensors (
    id SERIAL PRIMARY KEY,
    field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    sensor_type VARCHAR(50) CHECK (sensor_type IN ('soil_moisture', 'temperature', 'humidity', 'rainfall', 'soil_ph', 'nutrient', 'camera')),
    location JSONB,
    last_readings JSONB,
    battery_level INTEGER,
    last_connected TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER REFERENCES iot_sensors(id) ON DELETE CASCADE,
    reading_type VARCHAR(50),
    value DECIMAL(10,2),
    unit VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location JSONB,
    metadata JSONB
);

-- Disease Detection with ML
CREATE TABLE IF NOT EXISTS disease_detections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES fields(id) ON DELETE SET NULL,
    crop_id INTEGER REFERENCES crops(id),
    image_url VARCHAR(500),
    image_hash VARCHAR(64),
    detection_result JSONB,
    confidence DECIMAL(5,4),
    disease_id INTEGER REFERENCES pests_diseases(id),
    recommendations JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'treated', 'resolved')),
    verified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market Data and Prices
CREATE TABLE IF NOT EXISTS market_prices (
    id SERIAL PRIMARY KEY,
    crop_id INTEGER REFERENCES crops(id) ON DELETE CASCADE,
    market_name VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    modal_price DECIMAL(10,2),
    arrival_quantity DECIMAL(10,2),
    date DATE NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_prices_crop_date ON market_prices(crop_id, date DESC);

-- Weather Data
CREATE TABLE IF NOT EXISTS weather_data (
    id SERIAL PRIMARY KEY,
    location JSONB,
    temperature DECIMAL(5,2),
    humidity INTEGER,
    rainfall DECIMAL(5,2),
    wind_speed DECIMAL(5,2),
    condition VARCHAR(50),
    forecast JSONB,
    date DATE NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Government Schemes and Data
CREATE TABLE IF NOT EXISTS government_schemes (
    id SERIAL PRIMARY KEY,
    scheme_id VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    name_hi VARCHAR(200),
    description JSONB,
    benefits JSONB,
    eligibility JSONB,
    application_process JSONB,
    documents_required JSONB,
    website_url VARCHAR(500),
    helpline VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS soil_health_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,
    card_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    soil_data JSONB,
    recommendations JSONB,
    testing_lab VARCHAR(200),
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat and Notifications
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expert_id INTEGER REFERENCES users(id),
    title VARCHAR(200),
    last_message TEXT,
    last_message_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'file')),
    content TEXT,
    attachments JSONB,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('weather_alert', 'pest_alert', 'irrigation_reminder', 'market_update', 'government_scheme', 'payment', 'system')),
    title JSONB,
    body JSONB,
    data JSONB,
    channel VARCHAR(50) DEFAULT 'app' CHECK (channel IN ('app', 'sms', 'whatsapp', 'email', 'all')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment and Subscriptions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50) CHECK (payment_method IN ('razorpay', 'paytm', 'phonepe', 'google_pay', 'card', 'upi')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description JSONB,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    features JSONB,
    max_farms INTEGER,
    max_fields INTEGER,
    ai_chat_access BOOLEAN DEFAULT TRUE,
    disease_detection_limit INTEGER,
    iot_sensor_limit INTEGER,
    priority_support BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, max_farms, max_fields) VALUES
('Free', 0, 0, '{"basic_crop_info": true, "weather_updates": true, "market_prices": true}', 1, 3),
('Basic', 99, 999, '{"disease_detection": 10, "ai_chat": true, "sms_alerts": true}', 3, 10),
('Premium', 299, 2999, '{"unlimited_disease_detection": true, "iot_integration": true, "expert_consultation": 2}', 10, 50),
('Enterprise', 999, 9999, '{"api_access": true, "custom_features": true, "dedicated_support": true}', 999, 9999)
ON CONFLICT DO NOTHING;

-- Offline Data Sync
CREATE TABLE IF NOT EXISTS offline_sync (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    operation VARCHAR(10) CHECK (operation IN ('create', 'update', 'delete')),
    data JSONB,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    device_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor ON sensor_readings(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_disease_detections_user ON disease_detections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON offline_sync(user_id, sync_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_sensors_updated_at BEFORE UPDATE ON iot_sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
