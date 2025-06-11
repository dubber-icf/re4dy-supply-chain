import os
import hashlib
import json
import requests
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class IPScreenerAPIError(Exception):
    """Custom exception for IP Screener API errors"""
    def __init__(self, message, error_type="general", retry_after=None):
        super().__init__(message)
        self.error_type = error_type
        self.retry_after = retry_after

class IPScreenerAPI:
    """
    Live IP Screener Data API integration.
    Testing multiple authentication formats to resolve API issues.
    """
    
    def __init__(self):
        # API keys from environment
        self.data_key = os.getenv('IPS_DATA_KEY')
        self.ux_key = os.getenv('IPS_UX_KEY')
        
        # API endpoints
        self.data_api_url = os.getenv('IPS_DATA_API_URL', 'https://my.ipscreener.com/api/data/case')
        self.pdf_api_url = os.getenv('IPS_PDF_API_URL', 'https://my.ipscreener.com/api/data/pdf')
        self.stats_api_url = os.getenv('IPS_STATS_API_URL', 'https://my.ipscreener.com/api/data/stats')
        
        # Configuration
        self.cache_ttl_hours = int(os.getenv('IPS_CACHE_TTL_HOURS', '24'))
        self.throttle_minutes = int(os.getenv('IPS_QUERY_THROTTLE_MINUTES', '5'))
        self.default_rows = int(os.getenv('IPS_DEFAULT_ROWS', '25'))
        self.max_rows = int(os.getenv('IPS_MAX_ROWS', '100'))
        self.timeout_seconds = int(os.getenv('IPS_TIMEOUT_SECONDS', '45'))
        self.max_retries = int(os.getenv('IPS_MAX_RETRIES', '3'))
        
        # Validate configuration
        if not self.data_key:
            raise IPScreenerAPIError("IPS_DATA_KEY environment variable is required", "configuration")
    
    def _compute_query_hash(self, title: str, summary: str, reference: str = "") -> str:
        """Compute SHA256 hash for query caching."""
        query_string = f"{title}|{summary}|{reference}"
        return hashlib.sha256(query_string.encode('utf-8')).hexdigest()
    
    def _make_request_variant_1(self, method: str, url: str, data: Dict[str, Any], timeout: int = None) -> requests.Response:
        """Test variant 1: Direct API key in Authorization header"""
        headers = {
            'Authorization': self.data_key,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        timeout = timeout or self.timeout_seconds
        
        if method.upper() == 'POST':
            response = requests.post(url, data=data, headers=headers, timeout=timeout)
        else:
            response = requests.get(url, params=data, headers=headers, timeout=timeout)
        
        return response
    
    def _make_request_variant_2(self, method: str, url: str, data: Dict[str, Any], timeout: int = None) -> requests.Response:
        """Test variant 2: Bearer token format"""
        headers = {
            'Authorization': f'Bearer {self.data_key}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        timeout = timeout or self.timeout_seconds
        
        if method.upper() == 'POST':
            response = requests.post(url, data=data, headers=headers, timeout=timeout)
        else:
            response = requests.get(url, params=data, headers=headers, timeout=timeout)
        
        return response
    
    def _make_request_variant_3(self, method: str, url: str, data: Dict[str, Any], timeout: int = None) -> requests.Response:
        """Test variant 3: API-Key format"""
        headers = {
            'Authorization': f'API-Key {self.data_key}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        timeout = timeout or self.timeout_seconds
        
        if method.upper() == 'POST':
            response = requests.post(url, data=data, headers=headers, timeout=timeout)
        else:
            response = requests.get(url, params=data, headers=headers, timeout=timeout)
        
        return response
    
    def _make_request_variant_4(self, method: str, url: str, data: Dict[str, Any], timeout: int = None) -> requests.Response:
        """Test variant 4: Key in request body (as backup)"""
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        # Add key to data
        data_with_key = data.copy()
        data_with_key['key'] = self.data_key
        
        timeout = timeout or self.timeout_seconds
        
        if method.upper() == 'POST':
            response = requests.post(url, data=data_with_key, headers=headers, timeout=timeout)
        else:
            response = requests.get(url, params=data_with_key, headers=headers, timeout=timeout)
        
        return response
    
    def submit_query(self, title: str, summary: str, reference: str = "RE4DY_VIS", 
                    rows: int = None) -> Tuple[str, Dict[str, Any]]:
        """
        Submit query to IP Screener Data API.
        Tests multiple authentication formats to find working one.
        """
        rows = rows or self.default_rows
        if rows > self.max_rows:
            rows = self.max_rows
        
        # Validate input lengths
        if len(title) > 200:
            raise IPScreenerAPIError("Title too long (max 200 characters)", "validation")
        if len(summary) > 2000:
            raise IPScreenerAPIError("Summary too long (max 2000 characters)", "validation")
        
        request_data = {
            'username': 'tester@ipscreener.com',
            'reference': reference,
            'title': title,
            'summary': summary,
            'rows': str(rows)
        }
        
        logger.info(f"Testing IP Screener API with multiple authentication formats...")
        
        # Try different authentication variants
        variants = [
            ("Direct API key", self._make_request_variant_1),
            ("Bearer token", self._make_request_variant_2),
            ("API-Key format", self._make_request_variant_3),
            ("Key in body", self._make_request_variant_4)
        ]
        
        last_error = None
        
        for variant_name, request_func in variants:
            try:
                logger.info(f"Trying {variant_name}...")
                response = request_func('POST', self.data_api_url, request_data)
                
                logger.info(f"{variant_name} - Status: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        logger.info(f"{variant_name} - Success! Full response: {response_data}")
                        
                        # Check for session token in correct response structure
                        session_token = None
                        if 'data' in response_data and isinstance(response_data['data'], dict):
                            session_token = response_data['data'].get('token')
                            logger.info(f"Found session token in data.token: {session_token}")
                        else:
                            # Fallback to direct token field
                            session_token = response_data.get('token') or response_data.get('session') or response_data.get('ticket')
                            if session_token:
                                logger.info(f"Found session token in direct field: {session_token}")
                            else:
                                logger.warning(f"No session token found. Response structure: {response_data}")
                        
                        if session_token:
                            logger.info(f"Session token received: {session_token[:10]}...")
                            return session_token, response_data
                        elif 'results' in response_data or 'patents' in response_data:
                            logger.info("Immediate results received (no session token)")
                            return None, response_data
                        else:
                            logger.warning(f"{variant_name} - No session token or results in response")
                            last_error = f"No session token or results (format: {variant_name})"
                            continue
                            
                    except json.JSONDecodeError as e:
                        logger.error(f"{variant_name} - Invalid JSON: {e}")
                        last_error = f"Invalid JSON response ({variant_name})"
                        continue
                        
                elif response.status_code == 401:
                    logger.warning(f"{variant_name} - Authentication failed")
                    last_error = f"Authentication failed ({variant_name})"
                    continue
                    
                else:
                    logger.warning(f"{variant_name} - HTTP {response.status_code}: {response.text[:200]}")
                    last_error = f"HTTP {response.status_code} ({variant_name})"
                    continue
                    
            except Exception as e:
                logger.error(f"{variant_name} - Exception: {e}")
                last_error = f"Exception in {variant_name}: {str(e)}"
                continue
        
        # If all variants failed, raise the last error
        raise IPScreenerAPIError(f"All authentication variants failed. Last error: {last_error}", "authentication")
    
    def get_results(self, session_token: str, include_family: bool = True) -> Dict[str, Any]:
        """Retrieve results using session token (if session-based API)"""
        request_data = {
            'token': session_token,
            'family': 'true' if include_family else 'false'
        }
        
        # Use the same authentication format that worked for submit_query
        response = self._make_request_variant_1('GET', self.data_api_url, request_data)
        
        if response.status_code != 200:
            raise IPScreenerAPIError(
                f"Results request failed with status {response.status_code}: {response.text}",
                "api_error"
            )
        
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            raise IPScreenerAPIError("Invalid JSON response when retrieving results", "response_format")
        
        return response_data

class IPScreenerCache:
    """Simple file-based cache for IP Screener results"""
    
    def __init__(self, cache_dir: str = "/tmp/ip_screener_cache", ttl_hours: int = 24, throttle_minutes: int = 5):
        self.cache_dir = cache_dir
        self.ttl_hours = ttl_hours
        self.throttle_minutes = throttle_minutes
        
        # Create cache directory
        os.makedirs(cache_dir, exist_ok=True)
    
    def get(self, query_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached result if available and not expired"""
        cache_file = os.path.join(self.cache_dir, f"{query_hash}.json")
        
        if not os.path.exists(cache_file):
            return None
        
        try:
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
            
            # Check if expired
            cached_time = datetime.fromisoformat(cached_data['timestamp'])
            if datetime.now() - cached_time > timedelta(hours=self.ttl_hours):
                os.remove(cache_file)
                return None
            
            return cached_data['result']
            
        except (json.JSONDecodeError, KeyError, ValueError):
            # Remove corrupted cache file
            try:
                os.remove(cache_file)
            except:
                pass
            return None
    
    def set(self, query_hash: str, result: Dict[str, Any]) -> None:
        """Cache result with timestamp"""
        cache_file = os.path.join(self.cache_dir, f"{query_hash}.json")
        
        cached_data = {
            'timestamp': datetime.now().isoformat(),
            'result': result
        }
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(cached_data, f)
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")
    
    def is_throttled(self, query_hash: str) -> bool:
        """Check if query is throttled (too recent)"""
        cache_file = os.path.join(self.cache_dir, f"{query_hash}.json")
        
        if not os.path.exists(cache_file):
            return False
        
        try:
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
            
            cached_time = datetime.fromisoformat(cached_data['timestamp'])
            return datetime.now() - cached_time < timedelta(minutes=self.throttle_minutes)
            
        except:
            return False

class IPScreenerService:
    """
    Main service class for IP Screener integration.
    Handles API calls, caching, and error recovery.
    """
    
    def __init__(self):
        self.api = IPScreenerAPI()
        self.cache = IPScreenerCache()
        
        logger.info("IP Screener service initialized successfully")
    
    def analyze_component(self, component_name: str, component_description: str, 
                         reference: str = "RE4DY_VIS") -> Dict[str, Any]:
        """
        Analyze component using IP Screener API with caching and error handling.
        """
        # Generate cache key
        query_hash = self.api._compute_query_hash(component_name, component_description, reference)
        
        # Check cache first
        cached_result = self.cache.get(query_hash)
        if cached_result:
            logger.info(f"Returning cached result for: {component_name}")
            cached_result['from_cache'] = True
            return cached_result
        
        # Check throttling
        if self.cache.is_throttled(query_hash):
            logger.warning(f"Query throttled for: {component_name}")
            return {
                'success': False,
                'error': f'Query throttled. Please wait {self.cache.throttle_minutes} minutes between requests.',
                'error_type': 'throttled',
                'throttled': True,
                'retry_after': self.cache.throttle_minutes * 60,
                'patents': [],
                'from_cache': False
            }
        
        try:
            # Submit query to API
            session_token, initial_response = self.api.submit_query(
                title=component_name,
                summary=component_description,
                reference=reference
            )
            
            # Handle immediate results (no session token)
            if session_token is None:
                result = self._process_api_response(initial_response, component_name)
                result['from_cache'] = False
                
                # Cache successful results
                if result.get('success'):
                    self.cache.set(query_hash, result)
                
                return result
            
            # Handle session-based results (poll for completion)
            # For now, return the initial response
            result = self._process_api_response(initial_response, component_name)
            result['from_cache'] = False
            
            # Cache successful results
            if result.get('success'):
                self.cache.set(query_hash, result)
            
            return result
            
        except IPScreenerAPIError as e:
            logger.error(f"IP Screener API error for {component_name}: {e}")
            
            error_result = {
                'success': False,
                'error': str(e),
                'error_type': e.error_type,
                'retry_after': e.retry_after,
                'patents': [],
                'from_cache': False,
                'throttled': e.error_type == 'rate_limit',
                'query_info': {
                    'title': component_name,
                    'summary': component_description,
                    'reference': reference
                }
            }
            
            return error_result
            
        except Exception as e:
            logger.error(f"Unexpected error analyzing {component_name}: {e}")
            
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'error_type': 'unexpected',
                'patents': [],
                'from_cache': False,
                'throttled': False,
                'query_info': {
                    'title': component_name,
                    'summary': component_description,
                    'reference': reference
                }
            }
    
    def _process_api_response(self, response_data: Dict[str, Any], component_name: str) -> Dict[str, Any]:
        """Process API response and convert to standard format"""
        try:
            # Extract patents from response
            patents = response_data.get('results', response_data.get('patents', []))
            
            # Convert to standard format
            processed_patents = []
            for patent in patents:
                processed_patent = {
                    'patent_number': patent.get('publication_number', patent.get('patent_number', 'UNKNOWN')),
                    'title': patent.get('title', 'Patent Title'),
                    'applicant': patent.get('applicant', patent.get('assignee', 'Unknown')),
                    'publication_date': patent.get('publication_date', patent.get('filing_date', '2024-01-01')),
                    'relevance_score': float(patent.get('score', patent.get('relevance_score', 0.5)))
                }
                processed_patents.append(processed_patent)
            
            return {
                'success': True,
                'patents': processed_patents,
                'patent_count': len(processed_patents),
                'component_name': component_name,
                'query_info': {
                    'title': component_name,
                    'summary': response_data.get('query_summary', ''),
                    'reference': response_data.get('reference', 'RE4DY_VIS')
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing API response: {e}")
            return {
                'success': False,
                'error': f'Error processing API response: {str(e)}',
                'error_type': 'processing',
                'patents': []
            }

