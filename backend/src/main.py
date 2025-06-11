import os
import sys
# DON’T CHANGE THIS!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from src.routes.components import components_bp
from src.routes.visualization import visualization_bp
from src.routes.ip_screener import ip_screener_bp
from src.routes.relationships import relationships_bp

# Initialise the Flask application and point to the static folder
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), 'static')
)

# Application configuration
app.config['SECRET_KEY'] = 'supply_chain_visualiser_2024'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialise extensions
db = SQLAlchemy(app)
CORS(app)

# Register API blueprints under the /api prefix
app.register_blueprint(components_bp, url_prefix='/api')
app.register_blueprint(visualization_bp, url_prefix='/api')
app.register_blueprint(ip_screener_bp, url_prefix='/api')
app.register_blueprint(relationships_bp, url_prefix='/api')

# Serve React’s single-page app from the static folder
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder = app.static_folder
    requested = os.path.join(static_folder, path)
    if path and os.path.exists(requested):
        return send_from_directory(static_folder, path)
    index = os.path.join(static_folder, 'index.html')
    if os.path.exists(index):
        return send_from_directory(static_folder, 'index.html')
    return "index.html not found", 404

# A simple health-check endpoint
@app.route('/health')
def health_check():
    return {'status': 'healthy', 'service': 'supply-chain-api'}, 200

if __name__ == '__main__':
    # Only used when running locally; in production use Gunicorn
    app.run(host='0.0.0.0', port=5000, debug=True)