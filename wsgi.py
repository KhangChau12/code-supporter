"""
WSGI entry point - Dùng cho Gunicorn và các WSGI servers khác
"""
from app import app
from cors_middleware import CORSMiddleware
import os

# Wrap app với CORS middleware
app = CORSMiddleware(app)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)