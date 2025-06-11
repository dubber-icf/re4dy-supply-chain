from flask import Blueprint, request, jsonify
from flask_sqlalchemy import current_app as app
from sqlalchemy import text
import logging

components_bp = Blueprint('components', __name__)

@components_bp.route('/components', methods=['GET'])
def get_components():
    """Get all components with optional filtering and pagination"""
    try:
        # Get query parameters
        search = request.args.get('search', '')
        category = request.args.get('category', '')
        supplier = request.args.get('supplier', '')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 200))
        offset = (page - 1) * limit

        with app.app_context():
            engine = app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                # Build query
                query = """
                    SELECT 
                        c.id,
                        c.part_name,
                        c.part_number,
                        c.subcategory,
                        c.description,
                        c.specifications,
                        c.price_min,
                        c.price_max,
                        c.currency,
                        s.name as original_supplier,
                        s.country as supplier_country,
                        cat.name as category_name
                    FROM components c
                    JOIN suppliers s ON c.supplier_id = s.id
                    JOIN categories cat ON c.category_id = cat.id
                    WHERE c.is_active = true
                """
                
                params = {}
                
                # Add search filter
                if search:
                    query += " AND (c.part_name ILIKE :search OR c.description ILIKE :search OR s.name ILIKE :search)"
                    params['search'] = f"%{search}%"
                
                # Add category filter
                if category:
                    query += " AND cat.name ILIKE :category"
                    params['category'] = f"%{category}%"
                
                # Add supplier filter
                if supplier:
                    query += " AND s.name ILIKE :supplier"
                    params['supplier'] = f"%{supplier}%"
                
                # Add ordering and pagination
                query += " ORDER BY c.part_name LIMIT :limit OFFSET :offset"
                params.update({'limit': limit, 'offset': offset})

                result = conn.execute(text(query), params)
                components = [dict(r._mapping) for r in result]
                
                # Get total count for pagination
                count_query = """
                    SELECT COUNT(*)
                    FROM components c
                    JOIN suppliers s ON c.supplier_id = s.id
                    JOIN categories cat ON c.category_id = cat.id
                    WHERE c.is_active = true
                """
                count_params = {}
                
                if search:
                    count_query += " AND (c.part_name ILIKE :search OR c.description ILIKE :search OR s.name ILIKE :search)"
                    count_params['search'] = f"%{search}%"
                
                if category:
                    count_query += " AND cat.name ILIKE :category"
                    count_params['category'] = f"%{category}%"
                
                if supplier:
                    count_query += " AND s.name ILIKE :supplier"
                    count_params['supplier'] = f"%{supplier}%"
                
                count_result = conn.execute(text(count_query), count_params)
                total_count = count_result.scalar()

        return jsonify({
            'success': True,
            'components': components,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logging.error(f"Error fetching components: {e}")
        return jsonify({'success': False, 'error': 'Failed to fetch components'}), 500

@components_bp.route('/components/<int:component_id>', methods=['GET'])
def get_component_by_id(component_id):
    """Get detailed component information by ID"""
    try:
        with app.app_context():
            engine = app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = """
                    SELECT 
                        c.*,
                        s.name as supplier_name,
                        s.country as supplier_country,
                        s.website as supplier_website,
                        cat.name as category_name,
                        cat.description as category_description
                    FROM components c
                    JOIN suppliers s ON c.supplier_id = s.id
                    JOIN categories cat ON c.category_id = cat.id
                    WHERE c.id = :component_id AND c.is_active = true
                """

                result = conn.execute(text(query), {'component_id': component_id})
                component = result.fetchone()
                
                if not component:
                    return jsonify({'error': 'Component not found'}), 404

        return jsonify(dict(component._mapping)), 200

    except Exception as e:
        logging.error(f"Error fetching component {component_id}: {e}")
        return jsonify({'error': 'Failed to fetch component'}), 500

@components_bp.route('/components/<int:component_id>/compatibility', methods=['GET'])
def get_component_compatibility(component_id):
    """Get vehicle compatibility for a component"""
    try:
        with app.app_context():
            engine = app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = """
                    SELECT 
                        vm.id,
                        vm.model_name,
                        vm.model_year_start,
                        vm.model_year_end,
                        vm.vehicle_type,
                        vm.generation,
                        man.name as manufacturer_name,
                        man.country as manufacturer_country
                    FROM component_compatibility cc
                    JOIN vehicle_models vm ON cc.vehicle_model_id = vm.id
                    JOIN vehicle_manufacturers man ON vm.manufacturer_id = man.id
                    WHERE cc.component_id = :component_id
                    ORDER BY man.name, vm.model_name
                """

                result = conn.execute(text(query), {'component_id': component_id})
                compatibility = [dict(r._mapping) for r in result]

        return jsonify(compatibility), 200

    except Exception as e:
        logging.error(f"Error fetching compatibility for component {component_id}: {e}")
        return jsonify({'error': 'Failed to fetch compatibility data'}), 500

@components_bp.route('/suppliers', methods=['GET'])
def get_suppliers():
    """Get all suppliers"""
    try:
        with app.app_context():
            engine = app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = """
                    SELECT id, name, country, website, 
                           COUNT(c.id) as component_count
                    FROM suppliers s
                    LEFT JOIN components c ON s.id = c.supplier_id AND c.is_active = true
                    GROUP BY s.id, s.name, s.country, s.website
                    ORDER BY s.name
                """

                result = conn.execute(text(query))
                suppliers = [dict(r._mapping) for r in result]

        return jsonify(suppliers), 200

    except Exception as e:
        logging.error(f"Error fetching suppliers: {e}")
        return jsonify({'error': 'Failed to fetch suppliers'}), 500

@components_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    try:
        with app.app_context():
            engine = app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = """
                    SELECT id, name, description,
                           COUNT(c.id) as component_count
                    FROM categories cat
                    LEFT JOIN components c ON cat.id = c.category_id AND c.is_active = true
                    GROUP BY cat.id, cat.name, cat.description
                    ORDER BY cat.name
                """

                result = conn.execute(text(query))
                categories = [dict(r._mapping) for r in result]

        return jsonify(categories), 200

    except Exception as e:
        logging.error(f"Error fetching categories: {e}")
        return jsonify({'error': 'Failed to fetch categories'}), 500

@components_bp.route('/components/search', methods=['GET'])
def search_components():
    """Search components with full-text search"""
    try:
        query_param = request.args.get('q', '')
        if not query_param:
            return jsonify({'components': []}), 200

        with app.app_context():
            engine = app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = """
                    SELECT 
                        c.id,
                        c.part_name,
                        c.part_number,
                        c.description,
                        s.name as supplier_name,
                        cat.name as category_name
                    FROM components c
                    JOIN suppliers s ON c.supplier_id = s.id
                    JOIN categories cat ON c.category_id = cat.id
                    WHERE c.is_active = true
                    AND (
                        c.part_name ILIKE :search
                        OR c.description ILIKE :search
                        OR s.name ILIKE :search
                    )
                    ORDER BY c.part_name
                    LIMIT 20
                """

                search_param = f"%{query_param}%"
                result = conn.execute(text(query), {'search': search_param})
                results = [dict(r._mapping) for r in result]

        return jsonify({'components': results}), 200

    except Exception as e:
        logging.error(f"Error searching components: {e}")
        return jsonify({'error': 'Search failed'}), 500
