from flask import Blueprint, request, jsonify
from src.models.database import DatabaseConnection
from src.services.ip_screener_live import IPScreenerService
import logging
import json
import hashlib
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ip_screener_bp = Blueprint('ip_screener', __name__)

# Initialize IP Screener service
ip_service = IPScreenerService()

@ip_screener_bp.route('/analyze', methods=['POST'])
def analyze_component():
    """
    Analyze component using live IP Screener API.
    Expects JSON: {"component_name": "...", "component_description": "..."}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'JSON data required'
            }), 400
        
        component_name = data.get('component_name', '').strip()
        component_description = data.get('component_description', '').strip()
        reference = data.get('reference', 'RE4DY_VIS')
        
        if not component_name:
            return jsonify({
                'success': False,
                'error': 'component_name is required'
            }), 400
        
        if not component_description:
            return jsonify({
                'success': False,
                'error': 'component_description is required'
            }), 400
        
        logger.info(f"Analyzing component: {component_name}")
        
        # Call live IP Screener service
        result = ip_service.analyze_component(
            component_name=component_name,
            component_description=component_description,
            reference=reference
        )
        
        # Log result for debugging
        if result.get('success'):
            patent_count = len(result.get('patents', []))
            from_cache = result.get('from_cache', False)
            logger.info(f"Analysis complete: {patent_count} patents found (cached: {from_cache})")
        else:
            logger.warning(f"Analysis failed: {result.get('error', 'Unknown error')}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"IP Screener analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'patents': []
        }), 500

@ip_screener_bp.route('/ip-screener/analyze', methods=['POST'])
def analyze_component_legacy():
    """
    Legacy endpoint for backward compatibility.
    Converts old format to new format and calls live API.
    """
    try:
        data = request.get_json()
        component_id = data.get('componentId')
        force_refresh = data.get('forceRefresh', False)
        
        if not component_id:
            return jsonify({'error': 'Component ID is required'}), 400

        # Get component details from database
        db = DatabaseConnection()
        
        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
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

                # Convert to new format
                component_name = component['part_name']
                component_description = component.get('description', f"{component['part_name']} from {component['supplier_name']}")
                
                # Check cache first if not forcing refresh
                if not force_refresh:
                    query_text = f"{component_name} {component_description}"
                    query_hash = hashlib.md5(query_text.encode()).hexdigest()
                    
                    cursor.execute("""
                        SELECT * FROM ip_screener_cache 
                        WHERE query_hash = %s AND expires_at > %s
                    """, (query_hash, datetime.now()))
                    
                    cached_result = cursor.fetchone()
                    if cached_result:
                        cached_data = json.loads(cached_result['response_data'])
                        return jsonify({
                            'componentId': component_id,
                            'analysisDate': cached_result['created_at'].isoformat(),
                            'cached': True,
                            **cached_data
                        })
                
                # Call live IP Screener service
                result = ip_service.analyze_component(
                    component_name=component_name,
                    component_description=component_description,
                    reference=f"RE4DY_COMP_{component_id}"
                )
                
                # Convert result to legacy format
                legacy_result = convert_to_legacy_format(result, component)
                
                # Cache the result in database
                if result.get('success'):
                    query_text = f"{component_name} {component_description}"
                    query_hash = hashlib.md5(query_text.encode()).hexdigest()
                    expires_at = datetime.now() + timedelta(hours=24)
                    
                    cursor.execute("""
                        INSERT INTO ip_screener_cache 
                        (query_hash, part_name, description, response_data, is_simulation, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (query_hash) 
                        DO UPDATE SET 
                            response_data = EXCLUDED.response_data,
                            is_simulation = EXCLUDED.is_simulation,
                            expires_at = EXCLUDED.expires_at,
                            created_at = CURRENT_TIMESTAMP
                    """, (
                        query_hash,
                        component_name,
                        component_description,
                        json.dumps(legacy_result),
                        False,  # Not simulation anymore
                        expires_at
                    ))
                    conn.commit()
                
                return jsonify({
                    'componentId': component_id,
                    'analysisDate': datetime.now().isoformat(),
                    'cached': False,
                    **legacy_result
                })
                
            except Exception as e:
                logger.error(f"Database error in legacy endpoint: {e}")
                return jsonify({'error': 'Database error'}), 500

    except Exception as e:
        logger.error(f"Error analyzing component: {e}")
        return jsonify({'error': 'Analysis failed'}), 500

def convert_to_legacy_format(api_result, component):
    """Convert new API result format to legacy format for backward compatibility"""
    if not api_result.get('success'):
        # Return simulation fallback for errors
        return simulate_ip_analysis(component)
    
    patents = api_result.get('patents', [])
    patent_count = len(patents)
    
    # Convert patents to legacy format
    legacy_patents = []
    for patent in patents[:8]:  # Limit to 8 for UI
        legacy_patents.append({
            'id': patent.get('patent_number', 'UNKNOWN'),
            'title': patent.get('title', 'Patent Title'),
            'assignee': patent.get('applicant', 'Unknown Assignee'),
            'filingDate': patent.get('publication_date', '2024-01-01'),
            'similarityScore': patent.get('relevance_score', 0.5),
            'status': 'granted',  # Assume granted for now
            'relevanceScore': int((patent.get('relevance_score', 0.5) * 100))
        })
    
    # Generate innovation score based on patent count and relevance
    avg_relevance = sum(p.get('relevance_score', 0.5) for p in patents) / max(len(patents), 1)
    innovation_score = min(95, int(avg_relevance * 100 + (patent_count / 10) * 10))
    
    # Generate mock innovations (keep for UI consistency)
    innovations = generate_mock_innovations(component)
    
    # Determine risk level
    risk_level = 'high' if innovation_score > 80 else 'medium' if innovation_score > 60 else 'low'
    
    return {
        'patentCount': patent_count,
        'innovationScore': innovation_score,
        'isSimulated': False,  # Real data now
        'patents': legacy_patents,
        'innovations': innovations,
        'summary': {
            'riskLevel': risk_level,
            'recommendedActions': get_recommended_actions(innovation_score),
            'keyFindings': generate_key_findings_from_api(component, patent_count, innovation_score, patents)
        }
    }

def generate_key_findings_from_api(component, patent_count, innovation_score, patents):
    """Generate key findings from real API data"""
    findings = []
    
    if patent_count > 30:
        findings.append(f"High patent density ({patent_count} patents) indicates active innovation area")
    elif patent_count > 15:
        findings.append(f"Moderate patent activity ({patent_count} patents) in this technology space")
    else:
        findings.append(f"Limited patent activity ({patent_count} patents) suggests opportunity for innovation")
    
    # Analyze top applicants
    if patents:
        applicants = [p.get('applicant', 'Unknown') for p in patents[:5]]
        top_applicants = list(set(applicants))[:3]
        if top_applicants:
            findings.append(f"Key patent holders: {', '.join(top_applicants)}")
    
    # Add relevance-based findings
    if patents:
        high_relevance = [p for p in patents if p.get('relevance_score', 0) > 0.8]
        if high_relevance:
            findings.append(f"{len(high_relevance)} highly relevant patents found")
    
    return findings

@ip_screener_bp.route('/status', methods=['GET'])
def get_status():
    """
    Get IP Screener service status and configuration.
    """
    try:
        # Test basic service initialization
        service_status = {
            'service_available': True,
            'api_key_configured': bool(ip_service.api.data_key),
            'cache_enabled': True,
            'cache_ttl_hours': ip_service.cache.ttl_hours,
            'throttle_minutes': ip_service.cache.throttle_minutes,
            'default_rows': ip_service.api.default_rows,
            'max_rows': ip_service.api.max_rows,
            'mode': 'live_api'  # Changed from simulation
        }
        
        return jsonify({
            'success': True,
            'status': service_status
        })
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'status': {'service_available': False}
        }), 500

@ip_screener_bp.route('/cache/clear', methods=['POST'])
def clear_cache():
    """
    Clear IP Screener cache (admin function).
    """
    try:
        import os
        import shutil
        
        cache_dir = ip_service.cache.cache_dir
        if os.path.exists(cache_dir):
            shutil.rmtree(cache_dir)
            os.makedirs(cache_dir, exist_ok=True)
        
        logger.info("IP Screener cache cleared")
        
        return jsonify({
            'success': True,
            'message': 'Cache cleared successfully'
        })
        
    except Exception as e:
        logger.error(f"Cache clear error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ip_screener_bp.route('/test', methods=['POST'])
def test_api():
    """
    Test IP Screener API with a simple query.
    For debugging and validation.
    """
    try:
        # Simple test query with longer description to pass language detection
        test_result = ip_service.analyze_component(
            component_name="BMW Carbon Fiber Roof Test Component",
            component_description="This is a comprehensive test of the BMW Carbon Fiber Roof component designed for high-performance automotive applications. The component features advanced carbon fiber composite materials that provide exceptional strength-to-weight ratio, making it ideal for luxury and sports vehicles. The roof system incorporates innovative manufacturing techniques and aerodynamic design principles to enhance vehicle performance while maintaining structural integrity and safety standards.",
            reference="TEST_QUERY"
        )
        
        return jsonify({
            'success': True,
            'test_result': test_result,
            'message': 'API test completed'
        })
        
    except Exception as e:
        logger.error(f"API test error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'API test failed'
        }), 500

# Keep legacy functions for backward compatibility
def simulate_ip_analysis(component):
    """Fallback simulation for when API fails"""
    import random
    
    base_count = 15
    if 'engine' in component['part_name'].lower():
        base_count = 25
    elif 'transmission' in component['part_name'].lower():
        base_count = 20
    elif 'brake' in component['part_name'].lower():
        base_count = 18
    
    patent_count = base_count + random.randint(-5, 15)
    innovation_score = random.randint(55, 95)
    
    patents = generate_mock_patents(component, min(patent_count, 8))
    innovations = generate_mock_innovations(component)
    
    risk_level = 'high' if innovation_score > 80 else 'medium' if innovation_score > 60 else 'low'
    
    return {
        'patentCount': patent_count,
        'innovationScore': innovation_score,
        'isSimulated': True,  # Fallback simulation
        'patents': patents,
        'innovations': innovations,
        'summary': {
            'riskLevel': risk_level,
            'recommendedActions': get_recommended_actions(innovation_score),
            'keyFindings': generate_key_findings(component, patent_count, innovation_score)
        }
    }

def generate_mock_patents(component, count):
    """Generate realistic mock patents for fallback"""
    import random
    from datetime import datetime, timedelta
    
    assignees = [
        'Robert Bosch GmbH', 'Continental AG', 'ZF Friedrichshafen AG',
        'Schaeffler Group', 'Magna International', 'Valeo SA'
    ]
    
    patents = []
    for i in range(count):
        filing_date = datetime.now() - timedelta(days=random.randint(365, 2555))
        patents.append({
            'id': f"{'EP' if random.random() > 0.5 else 'US'}{random.randint(1000000, 9999999)}",
            'title': f"Advanced {component['part_name']} Technology",
            'assignee': random.choice(assignees),
            'filingDate': filing_date.strftime('%Y-%m-%d'),
            'similarityScore': round(random.uniform(0.65, 0.95), 2),
            'status': 'granted',
            'relevanceScore': random.randint(70, 95)
        })
    
    return sorted(patents, key=lambda x: x['similarityScore'], reverse=True)

def generate_mock_innovations(component):
    """Generate mock innovation opportunities"""
    import random
    
    innovations = [
        {
            'title': 'AI-Powered Predictive Maintenance',
            'description': 'Machine learning algorithms for component failure prediction',
            'marketPotential': 'High',
            'developmentStage': 'Research',
            'estimatedTimeToMarket': '2-3 years',
            'investmentRequired': '€3-7M'
        },
        {
            'title': 'Next-Generation Material Technology',
            'description': 'Advanced composite materials for improved performance',
            'marketPotential': 'Medium',
            'developmentStage': 'Prototype',
            'estimatedTimeToMarket': '1-2 years',
            'investmentRequired': '€2-5M'
        }
    ]
    
    return random.sample(innovations, random.randint(1, 2))

def generate_key_findings(component, patent_count, innovation_score):
    """Generate key findings summary"""
    findings = []
    
    if patent_count > 30:
        findings.append(f"High patent density ({patent_count} patents) indicates active innovation area")
    elif patent_count > 15:
        findings.append(f"Moderate patent activity ({patent_count} patents) in this technology space")
    else:
        findings.append(f"Limited patent activity ({patent_count} patents) suggests opportunity for innovation")
    
    if innovation_score > 80:
        findings.append("Strong innovation potential with multiple development opportunities")
    elif innovation_score > 60:
        findings.append("Good innovation potential with selective development focus")
    else:
        findings.append("Focus on incremental improvements and cost optimization")
    
    return findings

def get_recommended_actions(score):
    """Get recommended actions based on innovation score"""
    if score > 80:
        return [
            'Consider patent filing for key innovations',
            'Conduct comprehensive freedom-to-operate analysis',
            'Monitor competitor patent activity closely'
        ]
    elif score > 60:
        return [
            'Review existing patent landscape thoroughly',
            'Identify potential innovation gaps',
            'Consider R&D investment priorities'
        ]
    else:
        return [
            'Focus on incremental improvements',
            'Monitor industry trends',
            'Consider partnership opportunities'
        ]

