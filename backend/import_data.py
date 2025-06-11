#!/usr/bin/env python3
"""
Data import script for RE4DY Supply Chain Database
Seeds the database with automotive components, suppliers, and relationships
"""

import os
import sys
from sqlalchemy import create_engine, text
import pandas as pd
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variable"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    return database_url

def create_tables(engine):
    """Create database tables if they don't exist"""
    logger.info("Creating database tables...")
    
    with engine.connect() as conn:
        # Create categories table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create suppliers table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                country VARCHAR(100),
                website VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create components table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS components (
                id SERIAL PRIMARY KEY,
                part_name VARCHAR(200) NOT NULL,
                part_number VARCHAR(100),
                subcategory VARCHAR(100),
                description TEXT,
                specifications TEXT,
                price_min DECIMAL(10,2),
                price_max DECIMAL(10,2),
                currency VARCHAR(3) DEFAULT 'EUR',
                supplier_id INTEGER REFERENCES suppliers(id),
                category_id INTEGER REFERENCES categories(id),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create relationships table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS relationships (
                id SERIAL PRIMARY KEY,
                source_component_id INTEGER REFERENCES components(id),
                target_component_id INTEGER REFERENCES components(id),
                relationship_type VARCHAR(50),
                strength DECIMAL(3,2) DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        conn.commit()
        logger.info("Database tables created successfully")

def seed_categories(engine):
    """Seed categories table"""
    logger.info("Seeding categories...")
    
    categories = [
        ('Braking System', 'Components related to vehicle braking'),
        ('Engine', 'Engine components and parts'),
        ('Transmission', 'Transmission and drivetrain components'),
        ('Suspension', 'Suspension and steering components'),
        ('Electrical', 'Electrical and electronic components'),
        ('Body & Exterior', 'Body panels and exterior components'),
        ('Interior', 'Interior components and accessories'),
        ('Exhaust System', 'Exhaust and emission control components'),
        ('Cooling System', 'Cooling and thermal management'),
        ('Fuel System', 'Fuel delivery and management components')
    ]
    
    with engine.connect() as conn:
        for name, description in categories:
            conn.execute(text("""
                INSERT INTO categories (name, description) 
                VALUES (:name, :description) 
                ON CONFLICT (name) DO NOTHING
            """), {"name": name, "description": description})
        conn.commit()
    
    logger.info(f"Seeded {len(categories)} categories")

def seed_suppliers(engine):
    """Seed suppliers table"""
    logger.info("Seeding suppliers...")
    
    suppliers = [
        ('AP Racing', 'United Kingdom', 'https://apracing.com'),
        ('Continental AG', 'Germany', 'https://continental.com'),
        ('ATE', 'Germany', 'https://ate-brakes.com'),
        ('Bosch', 'Germany', 'https://bosch.com'),
        ('ZF Friedrichshafen', 'Germany', 'https://zf.com'),
        ('Magna International', 'Canada', 'https://magna.com'),
        ('Valeo', 'France', 'https://valeo.com'),
        ('Denso', 'Japan', 'https://denso.com'),
        ('Aisin', 'Japan', 'https://aisin.com'),
        ('Schaeffler', 'Germany', 'https://schaeffler.com'),
        ('Mahle', 'Germany', 'https://mahle.com'),
        ('Faurecia', 'France', 'https://faurecia.com'),
        ('Tenneco', 'United States', 'https://tenneco.com'),
        ('BorgWarner', 'United States', 'https://borgwarner.com'),
        ('Aptiv', 'Ireland', 'https://aptiv.com')
    ]
    
    with engine.connect() as conn:
        for name, country, website in suppliers:
            conn.execute(text("""
                INSERT INTO suppliers (name, country, website) 
                VALUES (:name, :country, :website)
            """), {"name": name, "country": country, "website": website})
        conn.commit()
    
    logger.info(f"Seeded {len(suppliers)} suppliers")

def seed_components(engine):
    """Seed components table with automotive parts"""
    logger.info("Seeding components...")
    
    # Get category and supplier IDs
    with engine.connect() as conn:
        categories = dict(conn.execute(text("SELECT name, id FROM categories")).fetchall())
        suppliers = dict(conn.execute(text("SELECT name, id FROM suppliers")).fetchall())
    
    components = [
        # Braking System
        ('AP Racing Brake Caliper', 'CP9040', 'Brake Calipers', 'High-performance 4-piston brake caliper', 'Aluminium construction, 4-piston design', 2000, 3000, 'AP Racing', 'Braking System'),
        ('AP Racing Carbon Brake Pads', 'CP1234', 'Brake Pads', 'Carbon-ceramic brake pads for racing', 'Carbon-ceramic compound, high temperature resistance', 300, 450, 'AP Racing', 'Braking System'),
        ('ATE Brake Fluid DOT 4', 'ATE-DOT4', 'Brake Fluid', 'High-performance brake fluid', 'DOT 4 specification, high boiling point', 10, 15, 'ATE', 'Braking System'),
        ('Continental Brake Disc', 'CONT-BD-001', 'Brake Discs', 'Ventilated brake disc', 'Cast iron, ventilated design', 150, 250, 'Continental AG', 'Braking System'),
        ('Bosch ABS Control Unit', 'BOSCH-ABS-9', 'ABS Systems', 'Anti-lock braking system control unit', 'Electronic control unit with sensors', 800, 1200, 'Bosch', 'Braking System'),
        
        # Engine Components
        ('Bosch Fuel Injector', 'BOSCH-INJ-001', 'Fuel Injection', 'High-pressure fuel injector', 'Piezo technology, precise fuel delivery', 200, 350, 'Bosch', 'Engine'),
        ('Mahle Piston Set', 'MAHLE-PST-001', 'Pistons', 'Forged aluminium piston set', 'Lightweight aluminium alloy construction', 400, 600, 'Mahle', 'Engine'),
        ('Continental Turbocharger', 'CONT-TC-001', 'Turbochargers', 'Variable geometry turbocharger', 'VGT technology, improved efficiency', 1500, 2500, 'Continental AG', 'Engine'),
        ('Denso Spark Plugs', 'DENSO-SP-001', 'Ignition', 'Iridium spark plugs', 'Iridium electrode, long life', 25, 40, 'Denso', 'Engine'),
        ('Schaeffler Timing Chain', 'SCHAEF-TC-001', 'Timing', 'Duplex timing chain', 'High-strength steel construction', 150, 250, 'Schaeffler', 'Engine'),
        
        # Transmission
        ('ZF 8-Speed Automatic', 'ZF-8HP', 'Automatic Transmission', 'Eight-speed automatic transmission', 'Torque converter, electronic control', 3000, 4500, 'ZF Friedrichshafen', 'Transmission'),
        ('Aisin Manual Gearbox', 'AISIN-MG-001', 'Manual Transmission', 'Six-speed manual transmission', 'Synchronised gears, lightweight design', 2000, 3000, 'Aisin', 'Transmission'),
        ('BorgWarner Transfer Case', 'BW-TC-001', 'Transfer Cases', 'All-wheel drive transfer case', 'Electronic control, multiple drive modes', 1800, 2800, 'BorgWarner', 'Transmission'),
        ('Schaeffler Clutch Kit', 'SCHAEF-CK-001', 'Clutches', 'Single-plate clutch kit', 'Organic friction material, pressure plate', 300, 500, 'Schaeffler', 'Transmission'),
        
        # Suspension
        ('Tenneco Shock Absorber', 'TENN-SA-001', 'Shock Absorbers', 'Gas-filled shock absorber', 'Monotube design, adjustable damping', 200, 350, 'Tenneco', 'Suspension'),
        ('ZF Steering Rack', 'ZF-SR-001', 'Steering', 'Electric power steering rack', 'Electric assist, variable ratio', 800, 1200, 'ZF Friedrichshafen', 'Suspension'),
        ('Continental Air Spring', 'CONT-AS-001', 'Air Suspension', 'Air suspension spring', 'Rubber bellows, electronic control', 400, 600, 'Continental AG', 'Suspension'),
        ('Schaeffler Wheel Bearing', 'SCHAEF-WB-001', 'Wheel Bearings', 'Sealed wheel bearing unit', 'Double-row ball bearing, integrated ABS sensor', 80, 120, 'Schaeffler', 'Suspension'),
        
        # Electrical
        ('Bosch ECU', 'BOSCH-ECU-001', 'Engine Control', 'Engine control unit', 'Multi-core processor, CAN bus communication', 1000, 1500, 'Bosch', 'Electrical'),
        ('Continental Instrument Cluster', 'CONT-IC-001', 'Displays', 'Digital instrument cluster', 'TFT display, customisable interface', 600, 900, 'Continental AG', 'Electrical'),
        ('Aptiv Wiring Harness', 'APTIV-WH-001', 'Wiring', 'Engine wiring harness', 'Copper conductors, weather-resistant connectors', 200, 350, 'Aptiv', 'Electrical'),
        ('Denso Alternator', 'DENSO-ALT-001', 'Charging', 'High-output alternator', '150A output, compact design', 300, 450, 'Denso', 'Electrical'),
        ('Valeo Starter Motor', 'VALEO-SM-001', 'Starting', 'Gear reduction starter', 'Permanent magnet design, high torque', 250, 400, 'Valeo', 'Electrical'),
        
        # Body & Exterior
        ('Magna Door Panel', 'MAGNA-DP-001', 'Body Panels', 'Aluminium door panel', 'Lightweight aluminium construction', 400, 600, 'Magna International', 'Body & Exterior'),
        ('Valeo Headlight Assembly', 'VALEO-HL-001', 'Lighting', 'LED headlight assembly', 'Adaptive LED technology, automatic levelling', 800, 1200, 'Valeo', 'Body & Exterior'),
        ('Continental Mirror Assembly', 'CONT-MA-001', 'Mirrors', 'Electric folding mirror', 'Heated glass, integrated indicators', 150, 250, 'Continental AG', 'Body & Exterior'),
        ('Faurecia Bumper Cover', 'FAUR-BC-001', 'Bumpers', 'Front bumper cover', 'Thermoplastic construction, integrated sensors', 300, 500, 'Faurecia', 'Body & Exterior'),
        
        # Interior
        ('Faurecia Seat Frame', 'FAUR-SF-001', 'Seating', 'Driver seat frame', 'Steel construction, multiple adjustment points', 400, 600, 'Faurecia', 'Interior'),
        ('Continental Dashboard', 'CONT-DB-001', 'Dashboard', 'Instrument panel assembly', 'Soft-touch materials, integrated airbag', 600, 900, 'Continental AG', 'Interior'),
        ('Magna Centre Console', 'MAGNA-CC-001', 'Console', 'Centre console assembly', 'Storage compartments, cup holders', 200, 350, 'Magna International', 'Interior'),
        ('Valeo Climate Control', 'VALEO-CC-001', 'HVAC', 'Automatic climate control unit', 'Dual-zone control, air quality sensor', 500, 750, 'Valeo', 'Interior'),
        
        # Exhaust System
        ('Tenneco Catalytic Converter', 'TENN-CC-001', 'Emission Control', 'Three-way catalytic converter', 'Ceramic substrate, precious metal coating', 400, 600, 'Tenneco', 'Exhaust System'),
        ('Faurecia Exhaust Manifold', 'FAUR-EM-001', 'Manifolds', 'Stainless steel exhaust manifold', 'Cast stainless steel, integrated heat shield', 300, 450, 'Faurecia', 'Exhaust System'),
        ('Tenneco Muffler', 'TENN-MF-001', 'Silencers', 'Rear silencer assembly', 'Stainless steel construction, sound dampening', 150, 250, 'Tenneco', 'Exhaust System'),
        
        # Cooling System
        ('Mahle Radiator', 'MAHLE-RAD-001', 'Radiators', 'Aluminium radiator', 'Aluminium core, plastic tanks', 200, 350, 'Mahle', 'Cooling System'),
        ('Continental Water Pump', 'CONT-WP-001', 'Water Pumps', 'Electric water pump', 'Brushless motor, variable flow rate', 300, 450, 'Continental AG', 'Cooling System'),
        ('Mahle Thermostat', 'MAHLE-TH-001', 'Thermostats', 'Engine thermostat', 'Wax element, precise temperature control', 25, 40, 'Mahle', 'Cooling System'),
        ('Valeo Cooling Fan', 'VALEO-CF-001', 'Cooling Fans', 'Electric cooling fan', 'Variable speed control, low noise', 150, 250, 'Valeo', 'Cooling System'),
        
        # Fuel System
        ('Continental Fuel Pump', 'CONT-FP-001', 'Fuel Pumps', 'In-tank fuel pump', 'Electric pump, integrated filter', 200, 350, 'Continental AG', 'Fuel System'),
        ('Bosch Fuel Rail', 'BOSCH-FR-001', 'Fuel Rails', 'High-pressure fuel rail', 'Stainless steel construction, pressure sensor', 150, 250, 'Bosch', 'Fuel System'),
        ('Mahle Fuel Filter', 'MAHLE-FF-001', 'Fuel Filters', 'Inline fuel filter', 'Paper element, water separation', 20, 35, 'Mahle', 'Fuel System')
    ]
    
    with engine.connect() as conn:
        for part_name, part_number, subcategory, description, specifications, price_min, price_max, supplier_name, category_name in components:
            supplier_id = suppliers.get(supplier_name)
            category_id = categories.get(category_name)
            
            if supplier_id and category_id:
                conn.execute(text("""
                    INSERT INTO components (part_name, part_number, subcategory, description, specifications, 
                                          price_min, price_max, supplier_id, category_id) 
                    VALUES (:part_name, :part_number, :subcategory, :description, :specifications, 
                            :price_min, :price_max, :supplier_id, :category_id)
                """), {
                    "part_name": part_name,
                    "part_number": part_number,
                    "subcategory": subcategory,
                    "description": description,
                    "specifications": specifications,
                    "price_min": price_min,
                    "price_max": price_max,
                    "supplier_id": supplier_id,
                    "category_id": category_id
                })
        conn.commit()
    
    logger.info(f"Seeded {len(components)} components")

def seed_relationships(engine):
    """Seed relationships between components"""
    logger.info("Seeding component relationships...")
    
    with engine.connect() as conn:
        # Get component IDs
        components = dict(conn.execute(text("SELECT part_name, id FROM components")).fetchall())
        
        # Define relationships (source, target, type, strength)
        relationships = [
            ('AP Racing Brake Caliper', 'AP Racing Carbon Brake Pads', 'compatible', 0.95),
            ('AP Racing Brake Caliper', 'ATE Brake Fluid DOT 4', 'requires', 0.90),
            ('Continental Brake Disc', 'AP Racing Brake Caliper', 'compatible', 0.85),
            ('Bosch ABS Control Unit', 'Continental Brake Disc', 'controls', 0.80),
            ('Bosch Fuel Injector', 'Bosch ECU', 'controlled_by', 0.95),
            ('Continental Turbocharger', 'Bosch ECU', 'controlled_by', 0.90),
            ('ZF 8-Speed Automatic', 'Bosch ECU', 'controlled_by', 0.85),
            ('Schaeffler Clutch Kit', 'Aisin Manual Gearbox', 'compatible', 0.90),
            ('Tenneco Shock Absorber', 'ZF Steering Rack', 'works_with', 0.75),
            ('Continental Air Spring', 'Tenneco Shock Absorber', 'alternative', 0.70),
            ('Bosch ECU', 'Continental Instrument Cluster', 'communicates_with', 0.90),
            ('Aptiv Wiring Harness', 'Bosch ECU', 'connects', 0.95),
            ('Denso Alternator', 'Valeo Starter Motor', 'electrical_system', 0.80),
            ('Valeo Headlight Assembly', 'Continental Mirror Assembly', 'exterior_lighting', 0.70),
            ('Faurecia Seat Frame', 'Continental Dashboard', 'interior_system', 0.65),
            ('Tenneco Catalytic Converter', 'Faurecia Exhaust Manifold', 'exhaust_system', 0.90),
            ('Mahle Radiator', 'Continental Water Pump', 'cooling_system', 0.95),
            ('Continental Fuel Pump', 'Bosch Fuel Rail', 'fuel_system', 0.90)
        ]
        
        for source_name, target_name, rel_type, strength in relationships:
            source_id = components.get(source_name)
            target_id = components.get(target_name)
            
            if source_id and target_id:
                conn.execute(text("""
                    INSERT INTO relationships (source_component_id, target_component_id, relationship_type, strength) 
                    VALUES (:source_id, :target_id, :rel_type, :strength)
                """), {
                    "source_id": source_id,
                    "target_id": target_id,
                    "rel_type": rel_type,
                    "strength": strength
                })
        
        conn.commit()
    
    logger.info(f"Seeded {len(relationships)} component relationships")

def main():
    """Main function to seed the database"""
    try:
        # Get database URL
        database_url = get_database_url()
        logger.info(f"Connecting to database...")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        
        # Create tables and seed data
        create_tables(engine)
        seed_categories(engine)
        seed_suppliers(engine)
        seed_components(engine)
        seed_relationships(engine)
        
        logger.info("Database seeding completed successfully!")
        
        # Print summary
        with engine.connect() as conn:
            component_count = conn.execute(text("SELECT COUNT(*) FROM components")).scalar()
            relationship_count = conn.execute(text("SELECT COUNT(*) FROM relationships")).scalar()
            logger.info(f"Total components: {component_count}")
            logger.info(f"Total relationships: {relationship_count}")
        
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

