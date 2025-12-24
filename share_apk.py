import http.server
import socketserver
import socket
import os
import sys

# Configuration
PORT = 8000
APK_DIR = os.path.join("frontend", "android", "app", "build", "outputs", "apk", "debug")
APK_NAME = "app-debug.apk"

def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def serve():
    if not os.path.exists(APK_DIR):
        print(f"ERREUR: Le dossier de l'APK n'existe pas encore: {APK_DIR}")
        print("Avez-vous lance 'build_apk.bat' ?")
        return

    os.chdir(APK_DIR)
    
    if not os.path.exists(APK_NAME):
        print(f"ATTENTION: Le fichier '{APK_NAME}' est introuvable.")
        print("List files:")
        print(os.listdir("."))
    
    Handler = http.server.SimpleHTTPRequestHandler
    
    ip = get_ip_address()
    url = f"http://{ip}:{PORT}/{APK_NAME}"
    
    print("="*50)
    print("SERVEUR DE TELECHARGEMENT APK")
    print("="*50)
    print(f"1. Connectez votre telephone au meme Wifi que ce PC.")
    print(f"2. Ouvrez Chrome/Safari sur votre telephone.")
    print(f"3. Tapez cette adresse exacte :")
    print("")
    print(f"   {url}")
    print("")
    print("="*50)
    print("Appuyez sur Ctrl+C pour arreter le serveur.")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    serve()
