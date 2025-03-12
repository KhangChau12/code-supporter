"""
WSGI entry point - Dùng cho Gunicorn và các WSGI servers khác
"""
from app import app

if __name__ == "__main__":
    app.run()