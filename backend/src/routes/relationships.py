from flask import Blueprint, request, jsonify
from src.models.database import DatabaseConnection
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

relationships_bp = Blueprint('relationships', __name__)

@relationships_bp.route('/relationships', methods=['GET'])
def get_relationships():
    """
    Get supply chain relationships for visualizations.
    Returns source_id, target_id, value for Sankey and Graph views.
    """
    try:
        db = DatabaseConnection()
        
        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Query relationships with component and supplier details
            cursor.execute("""
                SELECT 
                    r.id,
                    r.source_type,
                    r.source_id,
                    r.target_type, 
                    r.target_id,
                    r.relationship_type,
                    r.relationship_strength,
                    COALESCE(r.value_annual, r.relationship_strength, 1.0) as value,
                    
                    -- Source details
                    CASE 
                        WHEN r.source_type = 'supplier' THEN s.name
                        WHEN r.source_type = 'component' THEN c.part_name
                        ELSE CONCAT(r.source_type, '_', r.source_id)
                    END as source_name,
                    
                    CASE 
                        WHEN r.source_type = 'supplier' THEN s.country
                        WHEN r.source_type = 'component' THEN cs.country
                        ELSE 'Unknown'
                    END as source_country,
                    
                    -- Target details  
                    CASE 
                        WHEN r.target_type = 'supplier' THEN ts.name
                        WHEN r.target_type = 'component' THEN tc.part_name
                        ELSE CONCAT(r.target_type, '_', r.target_id)
                    END as target_name,
                    
                    CASE 
                        WHEN r.target_type = 'supplier' THEN ts.country
                        WHEN r.target_type = 'component' THEN tcs.country
                        ELSE 'Unknown'
                    END as target_country
                    
                FROM supply_chain_relationships r
                
                -- Join for source supplier details
                LEFT JOIN suppliers s ON r.source_type = 'supplier' AND r.source_id = s.id
                
                -- Join for source component details
                LEFT JOIN components c ON r.source_type = 'component' AND r.source_id = c.id
                LEFT JOIN suppliers cs ON c.supplier_id = cs.id
                
                -- Join for target supplier details
                LEFT JOIN suppliers ts ON r.target_type = 'supplier' AND r.target_id = ts.id
                
                -- Join for target component details
                LEFT JOIN components tc ON r.target_type = 'component' AND r.target_id = tc.id
                LEFT JOIN suppliers tcs ON tc.supplier_id = tcs.id
                
                ORDER BY r.id
                LIMIT 1000
            """)
            
            relationships = cursor.fetchall()
            
            # Convert to list of dictionaries
            relationship_list = []
            for row in relationships:
                relationship_list.append({
                    'id': row[0],
                    'source_type': row[1],
                    'source_id': row[2], 
                    'target_type': row[3],
                    'target_id': row[4],
                    'relationship_type': row[5],
                    'relationship_strength': row[6],
                    'value': float(row[7]) if row[7] else 1.0,
                    'source_name': row[8],
                    'source_country': row[9],
                    'target_name': row[10],
                    'target_country': row[11]
                })
            
            logger.info(f"Retrieved {len(relationship_list)} relationships")
            
            return jsonify({
                'success': True,
                'relationships': relationship_list,
                'total_count': len(relationship_list)
            })
            
    except Exception as e:
        logger.error(f"Error retrieving relationships: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'relationships': []
        }), 500

@relationships_bp.route('/relationships/nodes', methods=['GET'])
def get_nodes():
    """
    Get unique nodes for graph visualization.
    Returns all suppliers and components as nodes with metadata.
    """
    try:
        db = DatabaseConnection()
        
        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get all suppliers as nodes
            cursor.execute("""
                SELECT 
                    CONCAT('supplier_', id) as node_id,
                    'supplier' as type,
                    name,
                    country,
                    id as original_id
                FROM suppliers
                ORDER BY name
            """)
            
            supplier_nodes = cursor.fetchall()
            
            # Get all components as nodes
            cursor.execute("""
                SELECT 
                    CONCAT('component_', c.id) as node_id,
                    'component' as type,
                    c.part_name as name,
                    s.country,
                    c.id as original_id
                FROM components c
                JOIN suppliers s ON c.supplier_id = s.id
                ORDER BY c.part_name
            """)
            
            component_nodes = cursor.fetchall()
            
            # Combine and format nodes
            nodes = []
            
            # Add supplier nodes
            for row in supplier_nodes:
                nodes.append({
                    'id': row[0],
                    'type': row[1], 
                    'name': row[2],
                    'country': row[3],
                    'original_id': row[4],
                    'group': 'supplier'
                })
            
            # Add component nodes
            for row in component_nodes:
                nodes.append({
                    'id': row[0],
                    'type': row[1],
                    'name': row[2], 
                    'country': row[3],
                    'original_id': row[4],
                    'group': 'component'
                })
            
            logger.info(f"Retrieved {len(nodes)} nodes ({len(supplier_nodes)} suppliers, {len(component_nodes)} components)")
            
            return jsonify({
                'success': True,
                'nodes': nodes,
                'total_count': len(nodes),
                'supplier_count': len(supplier_nodes),
                'component_count': len(component_nodes)
            })
            
    except Exception as e:
        logger.error(f"Error retrieving nodes: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'nodes': []
        }), 500

@relationships_bp.route('/relationships/sankey', methods=['GET'])
def get_sankey_data():
    """
    Get data formatted specifically for Sankey diagram.
    Returns nodes and links in the format expected by @nivo/sankey.
    """
    try:
        db = DatabaseConnection()
        
        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get relationships with aggregated values
            cursor.execute("""
                SELECT 
                    CASE 
                        WHEN r.source_type = 'supplier' THEN s.name
                        WHEN r.source_type = 'component' THEN c.part_name
                        ELSE CONCAT(r.source_type, '_', r.source_id)
                    END as source,
                    
                    CASE 
                        WHEN r.target_type = 'supplier' THEN ts.name
                        WHEN r.target_type = 'component' THEN tc.part_name
                        ELSE CONCAT(r.target_type, '_', r.target_id)
                    END as target,
                    
                    SUM(COALESCE(r.value_annual, r.relationship_strength, 1.0)) as value
                    
                FROM supply_chain_relationships r
                
                -- Join for source details
                LEFT JOIN suppliers s ON r.source_type = 'supplier' AND r.source_id = s.id
                LEFT JOIN components c ON r.source_type = 'component' AND r.source_id = c.id
                
                -- Join for target details
                LEFT JOIN suppliers ts ON r.target_type = 'supplier' AND r.target_id = ts.id
                LEFT JOIN components tc ON r.target_type = 'component' AND r.target_id = tc.id
                
                GROUP BY source, target
                HAVING SUM(COALESCE(r.value_annual, r.relationship_strength, 1.0)) > 0
                ORDER BY value DESC
                LIMIT 100
            """)
            
            relationships = cursor.fetchall()
            
            # Extract unique nodes
            nodes = set()
            links = []
            
            for row in relationships:
                source, target, value = row
                if source and target:  # Ensure both source and target exist
                    nodes.add(source)
                    nodes.add(target)
                    links.append({
                        'source': source,
                        'target': target, 
                        'value': float(value)
                    })
            
            # Convert nodes set to list of objects
            node_list = [{'id': node} for node in sorted(nodes)]
            
            logger.info(f"Sankey data: {len(node_list)} nodes, {len(links)} links")
            
            return jsonify({
                'success': True,
                'nodes': node_list,
                'links': links,
                'node_count': len(node_list),
                'link_count': len(links)
            })
            
    except Exception as e:
        logger.error(f"Error retrieving Sankey data: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'nodes': [],
            'links': []
        }), 500

