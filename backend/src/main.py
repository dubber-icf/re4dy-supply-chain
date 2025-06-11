import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.routes.components import components_bp
from src.routes.visualization import visualization_bp
from src.routes.ip_screener import ip_screener_bp
from src.routes.relationships import relationships_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'supply_chain_visualiser_2024'

# Enable CORS for all routes
CORS(app, origins=['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180', 'http://localhost:5181', 'http://localhost:5182', 'http://localhost:5183', 'http://localhost:5184', 'http://localhost:5185', 'http://localhost:5190'])

# Register API blueprints
app.register_blueprint(components_bp, url_prefix='/api')
app.register_blueprint(visualization_bp, url_prefix='/api')
app.register_blueprint(ip_screener_bp, url_prefix='/api')
app.register_blueprint(relationships_bp, url_prefix='/api')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

@app.route('/health')
def health_check():
    return {'status': 'healthy', 'service': 'supply-chain-api'}, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

