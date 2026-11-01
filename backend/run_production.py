import os
import sys

# Ensure current directory is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from waitress import serve
from core.wsgi import application

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"==================================================")
    print(f"  Supportroot AI — Production WSGI Server")
    print(f"  Serving on: http://127.0.0.1:{port}")
    print(f"  Production ready (Waitress multi-threaded)")
    print(f"==================================================")
    serve(application, host='127.0.0.1', port=port, threads=8)

