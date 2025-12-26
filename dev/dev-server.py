#!/usr/bin/env python3
"""
Development server that mimics GitHub Pages clean URL behavior.
Maps /birdle/daily -> /birdle/daily.html automatically.
"""

import http.server
import socketserver
import os
from urllib.parse import unquote

PORT = 8000

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Decode the URL
        path = unquote(self.path)

        # Remove query string for file checking
        path_without_query = path.split('?')[0]

        # If path doesn't have an extension and file doesn't exist, try adding .html
        if '.' not in os.path.basename(path_without_query):
            # Try the path as-is first
            full_path = '.' + path_without_query
            if not os.path.exists(full_path) or os.path.isdir(full_path):
                # Try with .html extension
                html_path = path_without_query.rstrip('/') + '.html'
                if os.path.exists('.' + html_path):
                    self.path = html_path if '?' not in path else html_path + '?' + path.split('?')[1]

        return super().do_GET()

import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

with socketserver.TCPServer(("0.0.0.0", PORT), CleanURLHandler) as httpd:
    local_ip = get_local_ip()
    print(f"Server running at:")
    print(f"  Local:   http://localhost:{PORT}/birdle/")
    print(f"  Network: http://{local_ip}:{PORT}/birdle/")
    print("")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
