from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
from requests import post, get
import base64
import json
import os
import sqlite3
import yt_dlp

load_dotenv()
app = Flask(__name__)

client_id = os.getenv('CLIENT_ID')
client_secret = os.getenv('CLIENT_SECRET')

### DATABASE FUNCTIONS ###

def create_database(db_path='database/songs.db'):
    
    # Conectar a la base de datos (o crearla si no existe)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Crear la tabla con las nuevas columnas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            genre TEXT,
            release_date TEXT,
            file_path TEXT NOT NULL,
            image_url TEXT,
            preview_url TEXT
        )
    ''')

    # Confirmar los cambios y cerrar la conexión
    conn.commit()
    conn.close()
    print("Base de datos y tabla creadas con éxito en", db_path)

def insert_song(title, artist, album, genre, release_date, file_path, image_url, preview_url, db_path='database/songs.db'):
    # Conectar a la base de datos
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Insertar los datos
    cursor.execute('''
        INSERT INTO songs (title, artist, album, genre, release_date, file_path, image_url, preview_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, artist, album, genre, release_date, file_path, image_url, preview_url))

    # Confirmar los cambios y cerrar la conexión
    conn.commit()
    conn.close()
    print("Canción insertada con éxito.")

def check_and_create_database(db_path='database/songs.db'):
    
    # Verificar si el archivo de la base de datos existe
    if not os.path.exists(db_path):
        print("La base de datos no existe. Creando...")
        create_database(db_path)
    else:
        print("La base de datos ya existe.")


### OTHER FUNCTIONS ###

def get_token():
    auth_string = client_id + ':' + client_secret
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": "Basic " + auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}

    result = post(url, headers=headers, data=data)
    json_response = json.loads(result.content)
    token = json_response["access_token"]
    return token

def get_auth_header(token):
    return {"Authorization": "Bearer " + token}

def search_for_artist(token, artist_name):
    url = "https://api.spotify.com/v1/search"
    headers = get_auth_header(token)
    query = f"q={artist_name}&type=artist&limit=6"
    query_url = url + "?" + query

    result = get(query_url, headers=headers)
    json_result = json.loads(result.content)
    print(json_result)

def search_and_download_song(title, artist, album, genre, release_date, image_url, preview_url, output_dir):
    search_query = f"{title} {artist} lyric"
    
    # Crear la ruta del directorio basado en Artista/Álbum
    artist_dir = os.path.join(output_dir, artist)
    album_dir = os.path.join(artist_dir, album)
    
    # Crear directorios si no existen
    os.makedirs(album_dir, exist_ok=True)
    
    # Establecer la ruta completa del archivo
    output_path = os.path.join(album_dir, f"{title}.mp3")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path,
        'noplaylist': True,
        'quiet': True,
        'default_search': 'ytsearch1:',  # Limit to 1 search result
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            # Perform search and download
            info_dict = ydl.extract_info(search_query, download=True)
            
            # Insertar en la base de datos
            insert_song(
                title=title,
                artist=artist,
                album=album,
                genre=genre,
                release_date=release_date,
                file_path=output_path,
                image_url=image_url,
                preview_url=preview_url
            )
            
            # Regresar un diccionario con todos los detalles de la canción
            return {
                "title": title,
                "artist": artist,
                "album": album,
                "genre": genre,
                "release_date": release_date,
                "file_path": output_path,
                "image_url": image_url,
                "preview_url": preview_url
            }
        
        except Exception as e:
            print(f"Error: {e}")
            return None
        


### FLASK FUNCTIONS ###

@app.route('/')
def index():
    # Datos simulados para las categorías de álbumes
    categorias = {
        "Escuchado Recientemente": [
            {"title": "Clancy", "artist": "Twenty One Pilots", "audio_file": "static/songs/Twenty One Pilots/Clancy/Vignette.mp3", "cover_url": "https://www.emp-online.es/dw/image/v2/BBQV_PRD/on/demandware.static/-/Sites-master-emp/default/dw7f84522c/images/5/6/9/1/569187.jpg?sfrm=png"},
            {"title": "Álbum 2", "cover_url": ""},
            {"title": "Álbum 1", "cover_url": ""},
            {"title": "Álbum 2", "cover_url": ""},
            {"title": "Álbum 1", "cover_url": ""},
            {"title": "Álbum 2", "cover_url": ""},
            {"title": "Álbum 1", "cover_url": ""},
            {"title": "Álbum 2", "cover_url": ""},
            {"title": "Álbum 1", "cover_url": ""},
            {"title": "Álbum 2", "cover_url": ""},
            {"title": "Álbum 1", "cover_url": ""},
            {"title": "Álbum 2", "cover_url": ""},
            {"title": "Álbum 3", "cover_url": ""}
        ],
        "Tus Favoritos": [
            {"title": "Álbum 4", "cover_url": ""},
            {"title": "Álbum 5", "cover_url": ""},
            {"title": "Álbum 6", "cover_url": ""}
        ],
        "Descubrimientos Recientes": [
            {"title": "Álbum 7", "cover_url": ""},
            {"title": "Álbum 8", "cover_url": ""},
            {"title": "Álbum 9", "cover_url": ""}
        ]
    }

    return render_template('index.html', categorias=categorias)



@app.route('/search', methods=['GET'])
def search():
    token = get_token()
    headers = get_auth_header(token)
    query = request.args.get('q')
    url = f"https://api.spotify.com/v1/search?q={query}&type=track,artist&limit=5"
    
    response = get(url, headers=headers)
    data = response.json()
    
    results = {
        'tracks': [],
        'artists': []
    }
    
    # Procesar canciones
    for item in data['tracks']['items']:
        album_images = item['album']['images']
        image_url = album_images[1]['url'] if len(album_images) > 1 else ''  # URL de imagen de tamaño mediano
        
        results['tracks'].append({
            'name': item['name'],
            'artist': item['artists'][0]['name'],
            'album': item['album']['name'],
            'preview_url': item['preview_url'],
            'image_url': image_url
        })
    
    for item in data['artists']['items']:
        results['artists'].append({
            'name': item['name'],
            'genres': item['genres'],
            'followers': item['followers']['total'],
            'image_url': item['images'][0]['url'] if item['images'] else None
        })
    
    return jsonify(results)

@app.route('/check_song', methods=['GET'])
def check_song():
    title = request.args.get('title')
    artist = request.args.get('artist')
    album = request.args.get('album')

    if not title or not artist or not album:
        return jsonify({"error": "Missing title, artist, or album"}), 400

    # Conectar a la base de datos
    conn = sqlite3.connect('database/songs.db')
    cursor = conn.cursor()

    # Verificar si la canción ya está en la base de datos
    cursor.execute('''
        SELECT * FROM songs
        WHERE title = ? AND artist = ? AND album = ?
    ''', (title, artist, album))
    song = cursor.fetchone()

    conn.close()

    if song:
        return jsonify({"exists": True, "song": song}), 200
    else:
        return jsonify({"exists": False}), 200

@app.route('/download', methods=['POST'])
def download_song():
    data = request.json
    title = data.get('title')
    artist = data.get('artist')
    album = data.get('album')
    genre = data.get('genre', '')  # Valor predeterminado vacío si no se proporciona
    release_date = data.get('release_date', '')  # Valor predeterminado vacío si no se proporciona
    image_url = data.get('image_url', '')  # Valor predeterminado vacío si no se proporciona
    preview_url = data.get('preview_url', '')  # Valor predeterminado vacío si no se proporciona
    
    # Verificar si faltan datos necesarios
    if not title or not artist or not album:
        print("[ERROR] Missing title, artist, or album")
        return jsonify({"error": "Missing title, artist, or album"}), 400

    output_dir = 'static/songs'
    song_data = search_and_download_song(
        title, artist, album, genre, release_date, image_url, preview_url, output_dir
    )
    
    if song_data:
        print(f"[INFO] Downloaded: {song_data['title']}")
        return jsonify({"message": f"Downloaded: {song_data['title']}", "song": song_data}), 200

    else:
        print("[ERROR] Failed to download song")
        return jsonify({"error": "Failed to download song"}), 500
    
@app.route('/get_song_info', methods=['GET'])
def get_song_info():
    title = request.args.get('title')
    artist = request.args.get('artist')
    album = request.args.get('album')

    conn = sqlite3.connect('database/songs.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT title, artist, album, file_path, image_url
        FROM songs
        WHERE title = ? AND artist = ? AND album = ?
    ''', (title, artist, album))
    row = cursor.fetchone()
    conn.close()

    if row:
        song_info = {
            'title': row[0],
            'artist': row[1],
            'album': row[2],
            'file_url': row[3],
            'image_url': row[4]
        }
        return jsonify(song_info)
    else:
        return jsonify({'error': 'Song not found'}), 404





if __name__ == '__main__':
    auth_token = get_token()
    check_and_create_database()  # Verificar y crear la base de datos si es necesario
    app.run(port=3210, debug=False)
