from flask import Blueprint, request, jsonify
from src.models.database import db
import logging

visualization_bp = Blueprint('visualization', __name__)

@visualization_bp.route('/visualization/sankey', methods=['GET'])
def get_sankey_data():
    """Get data formatted for Sankey diagram"""
    try:
        # Get query parameters
        category = request.args.get('category', '')
        supplier = request.args.get('supplier', '')
        max_nodes = int(request.args.get('maxNodes', 50))

        # Build query for supply chain relationships
        query = """
            SELECT 
                scr.source_type,
                scr.source_id,
                scr.target_type,
                scr.target_id,
                scr.relationship_type,
                scr.volume_annual,
                scr.value_annual,
                scr.relationship_strength,
                CASE 
                    WHEN scr.source_type = 'supplier' THEN s.name
                    WHEN scr.source_type = 'category' THEN cat.name
                    WHEN scr.source_type = 'component' THEN c.part_name
                END as source_name,
                CASE 
                    WHEN scr.target_type = 'supplier' THEN s2.name
                    WHEN scr.target_type = 'category' THEN cat2.name
                    WHEN scr.target_type = 'component' THEN c2.part_name
                END as target_name
            FROM supply_chain_relationships scr
            LEFT JOIN suppliers s ON scr.source_type = 'supplier' AND scr.source_id = s.id
            LEFT JOIN categories cat ON scr.source_type = 'category' AND scr.source_id = cat.id
            LEFT JOIN components c ON scr.source_type = 'component' AND scr.source_id = c.id
            LEFT JOIN suppliers s2 ON scr.target_type = 'supplier' AND scr.target_id = s2.id
            LEFT JOIN categories cat2 ON scr.target_type = 'category' AND scr.target_id = cat2.id
            LEFT JOIN components c2 ON scr.target_type = 'component' AND scr.target_id = c2.id
            WHERE 1=1
        """
        
        params = []
        
        # Add filters
        if category:
            query += " AND (cat.name ILIKE %s OR cat2.name ILIKE %s)"
            params.extend([f"%{category}%", f"%{category}%"])
        
        if supplier:
            query += " AND (s.name ILIKE %s OR s2.name ILIKE %s)"
            params.extend([f"%{supplier}%", f"%{supplier}%"])
        
        query += " ORDER BY scr.relationship_strength DESC LIMIT %s"
        params.append(max_nodes * 2)  # Get more relationships to ensure enough nodes

        with db.get_cursor() as (cursor, conn):
            cursor.execute(query, params)
            relationships = cursor.fetchall()

        # Transform to Sankey format
        nodes = set()
        links = []
        
        for rel in relationships:
            source_id = f"{rel['source_type']}_{rel['source_id']}"
            target_id = f"{rel['target_type']}_{rel['target_id']}"
            
            nodes.add((source_id, rel['source_name'], rel['source_type']))
            nodes.add((target_id, rel['target_name'], rel['target_type']))
            
            # Calculate link value (use relationship strength or default)
            value = rel['relationship_strength'] or 1.0
            if rel['volume_annual']:
                value = min(rel['volume_annual'] / 1000, 10)  # Scale down volume
            
            links.append({
                'source': source_id,
                'target': target_id,
                'value': float(value),
                'relationship_type': rel['relationship_type']
            })

        # Convert nodes to list format
        node_list = [
            {
                'id': node_id,
                'name': name,
                'type': node_type
            }
            for node_id, name, node_type in list(nodes)[:max_nodes]
        ]

        # Filter links to only include nodes in our node list
        node_ids = {node['id'] for node in node_list}
        filtered_links = [
            link for link in links 
            if link['source'] in node_ids and link['target'] in node_ids
        ]

        return jsonify({
            'nodes': node_list,
            'links': filtered_links
        })

    except Exception as e:
        logging.error(f"Error fetching Sankey data: {e}")
        return jsonify({'error': 'Failed to fetch Sankey data'}), 500

@visualization_bp.route('/visualization/graph', methods=['GET'])
def get_graph_data():
    """Get data formatted for force graph"""
    try:
        # Get query parameters
        category = request.args.get('category', '')
        supplier = request.args.get('supplier', '')
        max_nodes = int(request.args.get('maxNodes', 100))
        depth = int(request.args.get('depth', 2))

        # Get components with their relationships
        query = """
            WITH component_data AS (
                SELECT 
                    c.id,
                    c.part_name,
                    c.part_number,
                    s.name as supplier_name,
                    cat.name as category_name,
                    c.price_min,
                    c.price_max
                FROM components c
                JOIN suppliers s ON c.supplier_id = s.id
                JOIN categories cat ON c.category_id = cat.id
                WHERE c.is_active = true
        """
        
        params = []
        
        if category:
            query += " AND cat.name ILIKE %s"
            params.append(f"%{category}%")
        
        if supplier:
            query += " AND s.name ILIKE %s"
            params.append(f"%{supplier}%")
        
        query += f" ORDER BY c.part_name LIMIT {max_nodes}) SELECT * FROM component_data"

        with db.get_cursor() as (cursor, conn):
            cursor.execute(query, params)
            components = cursor.fetchall()

            # Get relationships for these components
            if components:
                component_ids = [str(c['id']) for c in components]
                rel_query = """
                    SELECT 
                        scr.source_type,
                        scr.source_id,
                        scr.target_type,
                        scr.target_id,
                        scr.relationship_type,
                        scr.relationship_strength
                    FROM supply_chain_relationships scr
                    WHERE (scr.source_type = 'component' AND scr.source_id = ANY(%s))
                       OR (scr.target_type = 'component' AND scr.target_id = ANY(%s))
                """
                
                cursor.execute(rel_query, (component_ids, component_ids))
                relationships = cursor.fetchall()
            else:
                relationships = []

        # Build nodes
        nodes = []
        node_map = {}
        
        # Add component nodes
        for comp in components:
            node_id = f"component_{comp['id']}"
            node = {
                'id': node_id,
                'name': comp['part_name'],
                'type': 'component',
                'group': 'component',
                'supplier': comp['supplier_name'],
                'category': comp['category_name'],
                'part_number': comp['part_number'],
                'price_range': f"€{comp['price_min']}-{comp['price_max']}" if comp['price_min'] else None
            }
            nodes.append(node)
            node_map[node_id] = node

        # Add supplier and category nodes from relationships
        suppliers_added = set()
        categories_added = set()
        
        for rel in relationships:
            # Add supplier nodes
            if rel['source_type'] == 'supplier' and rel['source_id'] not in suppliers_added:
                node_id = f"supplier_{rel['source_id']}"
                if node_id not in node_map:
                    # Get supplier name
                    cursor.execute("SELECT name FROM suppliers WHERE id = %s", (rel['source_id'],))
                    supplier = cursor.fetchone()
                    if supplier:
                        node = {
                            'id': node_id,
                            'name': supplier['name'],
                            'type': 'supplier',
                            'group': 'supplier'
                        }
                        nodes.append(node)
                        node_map[node_id] = node
                        suppliers_added.add(rel['source_id'])
            
            # Add category nodes
            if rel['source_type'] == 'category' and rel['source_id'] not in categories_added:
                node_id = f"category_{rel['source_id']}"
                if node_id not in node_map:
                    # Get category name
                    cursor.execute("SELECT name FROM categories WHERE id = %s", (rel['source_id'],))
                    category = cursor.fetchone()
                    if category:
                        node = {
                            'id': node_id,
                            'name': category['name'],
                            'type': 'category',
                            'group': 'category'
                        }
                        nodes.append(node)
                        node_map[node_id] = node
                        categories_added.add(rel['source_id'])

        # Build links
        links = []
        for rel in relationships:
            source_id = f"{rel['source_type']}_{rel['source_id']}"
            target_id = f"{rel['target_type']}_{rel['target_id']}"
            
            if source_id in node_map and target_id in node_map:
                links.append({
                    'source': source_id,
                    'target': target_id,
                    'value': rel['relationship_strength'] or 1.0,
                    'type': rel['relationship_type']
                })

        return jsonify({
            'nodes': nodes,
            'links': links
        })

    except Exception as e:
        logging.error(f"Error fetching graph data: {e}")
        return jsonify({'error': 'Failed to fetch graph data'}), 500

@visualization_bp.route('/visualization/component/<int:component_id>/relationships', methods=['GET'])
def get_component_relationships(component_id):
    """Get relationships for a specific component"""
    try:
        with db.get_cursor() as (cursor, conn):
            # Get the component details
            cursor.execute("""
                SELECT c.*, s.name as supplier_name, cat.name as category_name
                FROM components c
                JOIN suppliers s ON c.supplier_id = s.id
                JOIN categories cat ON c.category_id = cat.id
                WHERE c.id = %s
            """, (component_id,))
            
            component = cursor.fetchone()
            if not component:
                return jsonify({'error': 'Component not found'}), 404

            # Get all relationships for this component
            cursor.execute("""
                SELECT 
                    scr.source_type,
                    scr.source_id,
                    scr.target_type,
                    scr.target_id,
                    scr.relationship_type,
                    scr.relationship_strength
                FROM supply_chain_relationships scr
                WHERE (scr.source_type = 'component' AND scr.source_id = %s)
                   OR (scr.target_type = 'component' AND scr.target_id = %s)
            """, (component_id, component_id))
            
            relationships = cursor.fetchall()

        # Build focused graph
        nodes = [{
            'id': f"component_{component['id']}",
            'name': component['part_name'],
            'type': 'component',
            'group': 'component',
            'central': True
        }]
        
        links = []
        related_entities = set()
        
        for rel in relationships:
            if rel['source_type'] == 'component' and rel['source_id'] == component_id:
                # Component is source
                target_id = f"{rel['target_type']}_{rel['target_id']}"
                related_entities.add((rel['target_type'], rel['target_id']))
                links.append({
                    'source': f"component_{component_id}",
                    'target': target_id,
                    'value': rel['relationship_strength'] or 1.0,
                    'type': rel['relationship_type']
                })
            elif rel['target_type'] == 'component' and rel['target_id'] == component_id:
                # Component is target
                source_id = f"{rel['source_type']}_{rel['source_id']}"
                related_entities.add((rel['source_type'], rel['source_id']))
                links.append({
                    'source': source_id,
                    'target': f"component_{component_id}",
                    'value': rel['relationship_strength'] or 1.0,
                    'type': rel['relationship_type']
                })

        # Add related entity nodes
        for entity_type, entity_id in related_entities:
            if entity_type == 'supplier':
                cursor.execute("SELECT name FROM suppliers WHERE id = %s", (entity_id,))
                entity = cursor.fetchone()
                if entity:
                    nodes.append({
                        'id': f"supplier_{entity_id}",
                        'name': entity['name'],
                        'type': 'supplier',
                        'group': 'supplier'
                    })
            elif entity_type == 'category':
                cursor.execute("SELECT name FROM categories WHERE id = %s", (entity_id,))
                entity = cursor.fetchone()
                if entity:
                    nodes.append({
                        'id': f"category_{entity_id}",
                        'name': entity['name'],
                        'type': 'category',
                        'group': 'category'
                    })

        return jsonify({
            'nodes': nodes,
            'links': links,
            'central_component': dict(component)
        })

    except Exception as e:
        logging.error(f"Error fetching component relationships: {e}")
        return jsonify({'error': 'Failed to fetch component relationships'}), 500

@visualization_bp.route('/visualization/statistics', methods=['GET'])
def get_statistics():
    """Get aggregated statistics for dashboard"""
    try:
        with db.get_cursor() as (cursor, conn):
            # Get component count by category
            cursor.execute("""
                SELECT cat.name, COUNT(c.id) as count
                FROM categories cat
                LEFT JOIN components c ON cat.id = c.category_id AND c.is_active = true
                GROUP BY cat.id, cat.name
                ORDER BY count DESC
            """)
            categories = cursor.fetchall()

            # Get component count by supplier country
            cursor.execute("""
                SELECT s.country, COUNT(c.id) as count
                FROM suppliers s
                LEFT JOIN components c ON s.id = c.supplier_id AND c.is_active = true
                GROUP BY s.country
                ORDER BY count DESC
                LIMIT 10
            """)
            countries = cursor.fetchall()

            # Get total counts
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM components WHERE is_active = true) as total_components,
                    (SELECT COUNT(*) FROM suppliers) as total_suppliers,
                    (SELECT COUNT(*) FROM categories) as total_categories,
                    (SELECT COUNT(*) FROM supply_chain_relationships) as total_relationships
            """)
            totals = cursor.fetchone()

        return jsonify({
            'totals': dict(totals),
            'categories': [dict(cat) for cat in categories],
            'countries': [dict(country) for country in countries]
        })

    except Exception as e:
        logging.error(f"Error fetching statistics: {e}")
        return jsonify({'error': 'Failed to fetch statistics'}), 500

