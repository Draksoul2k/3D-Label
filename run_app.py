"""
Script khởi động 3D Roll Label & Maket Studio
Tự động khởi chạy web server cục bộ và mở trình duyệt trên Windows
"""
import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"=====================================================")
            print(f"  3D ROLL LABEL & MAKET STUDIO DANG CHAY")
            print(f"  URL: http://localhost:{PORT}")
            print(f"  Thu muc: {DIRECTORY}")
            print(f"  Nhan Ctrl+C de dung server")
            print(f"=====================================================")
            httpd.serve_forever()
    except Exception as e:
        print(f"Loi khoi dong server: {e}")

if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    time.sleep(1.2)
    url = f"http://localhost:{PORT}"
    print(f"Dang mo trinh duyet tai: {url}")
    webbrowser.open(url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nDa tat server.")
        sys.exit(0)
