import sys
import os
import threading
import time
import webbrowser

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def open_browser():
    time.sleep(1.2)
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception:
        pass

# Ensure character assets are synced to assets/images
try:
    import shutil
    from pathlib import Path
    op_src = Path(r"C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763553226.png")
    hk_src = Path(r"C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763583932.png")
    dest_dir = Path(__file__).resolve().parent.parent / "assets" / "images"
    dest_dir.mkdir(parents=True, exist_ok=True)
    if op_src.exists() and not (dest_dir / "grid_operator.png").exists():
        shutil.copy(op_src, dest_dir / "grid_operator.png")
    if hk_src.exists() and not (dest_dir / "hacker.png").exists():
        shutil.copy(hk_src, dest_dir / "hacker.png")
except Exception:
    pass

if __name__ == "__main__":
    print("===================================================")
    print("  GRIDSEC - Power Grid Resilience Platform")
    print("  Starting server on http://127.0.0.1:8000...")
    print("===================================================")
    threading.Thread(target=open_browser, daemon=True).start()
    
    try:
        import uvicorn
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info", access_log=True)
    except Exception as e:
        print(f"\n[ERROR] FastAPI/Uvicorn server encountered an issue: {e}")
        import traceback
        traceback.print_exc()
        print("\nStarting fallback static web server on port 8000 so you can use the platform...")
        import http.server
        import socketserver
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(root_dir)
        Handler = http.server.SimpleHTTPRequestHandler
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("127.0.0.1", 8000), Handler) as httpd:
            print(f"Serving UI from {root_dir} on http://127.0.0.1:8000 (Ctrl+C to stop)")
            httpd.serve_forever()
