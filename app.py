from flask import Flask, render_template, jsonify, request
from datetime import datetime
from dotenv import load_dotenv
from requests import post, get
from spotipy.oauth2 import SpotifyClientCredentials
import base64
import json
import os
import spotipy
import sqlite3
import yt_dlp


load_dotenv()
app = Flask(__name__)
client_id = os.getenv('CLIENT_ID')
client_secret = os.getenv('CLIENT_SECRET')
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id=client_id, client_secret=client_secret))


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
            preview_url TEXT,
            spotify_artist_id TEXT,
            spotify_track_id TEXT,
            user_ids TEXT,
            play_count INTEGER DEFAULT 0,
            last_played TEXT,
            added_date TEXT NOT NULL
        )
    ''')

    # Confirmar los cambios y cerrar la conexión
    conn.commit()
    conn.close()
    print("Base de datos y tabla creadas con éxito en", db_path)

def insert_song(title, artist, album, genre, release_date, file_path, image_url, preview_url, spotify_artist_id, spotify_track_id, user_ids, dbpath='database/songs.db'):
    conn = sqlite3.connect(dbpath)
    cursor = conn.cursor()

    added_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute('''
        INSERT INTO songs (title, artist, album, genre, release_date, file_path, image_url, preview_url, spotify_artist_id, spotify_track_id, user_ids, added_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, artist, album, genre, release_date, file_path, image_url, preview_url, spotify_artist_id, spotify_track_id, user_ids, added_date))

    conn.commit()
    conn.close()


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

def search_and_download_song(title, artist, album, genre, release_date, image_url, preview_url, spotify_artist_id, spotify_track_id, user_ids, output_dir):
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
            # Realizar la búsqueda y descarga
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
                preview_url=preview_url,
                spotify_artist_id=spotify_artist_id,
                spotify_track_id=spotify_track_id,
                user_ids=user_ids
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
                "preview_url": preview_url,
                "spotify_artist_id": spotify_artist_id,
                "spotify_track_id": spotify_track_id,
                "user_ids": user_ids
            }
        
        except Exception as e:
            print(f"Error: {e}")
            return None
        


### FLASK FUNCTIONS ###

@app.route('/')
@app.route('/')
def home():
    # Conectar a la base de datos
    conn = sqlite3.connect('database/songs.db')
    cursor = conn.cursor()

    # Obtener la lista de todas las canciones del usuario
    cursor.execute('SELECT * FROM songs')
    all_songs = cursor.fetchall()
    conn.close()

    # Funciones auxiliares
    def get_recently_listened():
        return sorted(all_songs, key=lambda x: x[7], reverse=True)[:10]  # Asume que la columna 7 es la fecha de la última reproducción

    def get_favorites():
        return sorted(all_songs, key=lambda x: x[8], reverse=True)[:10]  # Asume que la columna 8 es el número de reproducciones

    def get_recently_added():
        return sorted(all_songs, key=lambda x: x[6], reverse=True)[:10]  # Asume que la columna 6 es la fecha de adición (esto es opcional si tienes una columna para esto)

    def removeduplicates(x):
        return list(dict.fromkeys(x))

    def get_recommendations():
        # Obtener las canciones más populares para usar como semilla para las recomendaciones
        popular_songs = sorted(all_songs, key=lambda x: x[8], reverse=True)[:5]  # Top 5 canciones más reproducidas
        seed_tracks = [f'spotify:track:{song[10]}' for song in popular_songs if song[10]]
        seed_artists = [f'spotify:artist:{song[9]}' for song in popular_songs if song[9]]
        
        recommendations = []
        valid_track_uris = removeduplicates([track_uri for track_uri in seed_tracks if isinstance(track_uri, str) and track_uri.startswith('spotify:track:')])
        valid_artist_uris = removeduplicates([artist_uri for artist_uri in seed_artists if isinstance(artist_uri, str) and artist_uri.startswith('spotify:artist:')])

        search_params = {
            "min_danceability": 0.5, 
            "max_danceability": 1.0, 
            "min_energy": 0.5, 
            "max_energy": 1.0, 
            "target_valence": 0.5
            }
        
        # Hacer la llamada a la API de Spotify con las URIs válidas
        try:
            recs = sp.recommendations(seed_tracks=valid_track_uris, seed_artists=valid_artist_uris, limit=20, **search_params)['tracks']
            recommendations = recs
        except Exception as e:
            print(f"Error obteniendo recomendaciones: {e}")
            recommendations = []

        return recommendations


    # Crear las categorías
    categorias = {
        "Escuchado Recientemente": [
            {"title": song[1], "artist": song[2], "audio_file": song[6], "cover_url": song[7]}  # Asume que la columna 6 es el file_path y 7 es el image_url
            for song in get_recently_listened()
        ],
        "Tus Favoritos": [
            {"title": song[1], "artist": song[2], "audio_file": song[6], "cover_url": song[7]}
            for song in get_favorites()
        ],
        "Descubrimientos Recientes": [
            {"title": song[1], "artist": song[2], "audio_file": song[6], "cover_url": song[7]}
            for song in get_recently_added()
        ],
        "Canciones que podrían gustarte": [
            {"title": rec['name'], "artist": rec['artists'][0]['name'], "audio_file": rec['preview_url'], "cover_url": rec['album']['images'][0]['url']}
            for rec in get_recommendations()
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
        'artists': [],
        'albums': []  # Añadir sección para álbumes
    }
    
    # Procesar canciones
    for item in data['tracks']['items']:
        album_images = item['album']['images']
        image_url = album_images[1]['url'] if len(album_images) > 1 else ''  # URL de imagen de tamaño mediano
        
        results['tracks'].append({
            'id': item['id'],  # ID de la canción
            'name': item['name'],
            'artist': item['artists'][0]['name'],
            'artist_id': item['artists'][0]['id'],  # ID del artista
            'album': item['album']['name'],
            'album_id': item['album']['id'],  # ID del álbum
            'preview_url': item['preview_url'],
            'image_url': image_url
        })
    
    # Procesar artistas
    for item in data['artists']['items']:
        results['artists'].append({
            'id': item['id'],  # ID del artista
            'name': item['name'],
            'genres': item['genres'],
            'followers': item['followers']['total'],
            'image_url': item['images'][0]['url'] if item['images'] else None
        })
    
    # Obtener detalles del álbum (agregar información sobre álbumes)
    for item in data['tracks']['items']:
        album_id = item['album']['id']
        if album_id not in [album['id'] for album in results['albums']]:
            album_details_url = f"https://api.spotify.com/v1/albums/{album_id}"
            album_response = get(album_details_url, headers=headers)
            album_data = album_response.json()
            album_images = album_data['images']
            album_image_url = album_images[1]['url'] if len(album_images) > 1 else ''  # URL de imagen de tamaño mediano
            
            results['albums'].append({
                'id': album_data['id'],  # ID del álbum
                'name': album_data['name'],
                'release_date': album_data['release_date'],
                'total_tracks': album_data['total_tracks'],
                'image_url': album_image_url
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
        SELECT title, artist, album, file_path, image_url
        FROM songs
        WHERE title = ? AND artist = ? AND album = ?
    ''', (title, artist, album))
    song = cursor.fetchone()

    conn.close()

    if song:
        song_info = {
            'title': song[0],
            'artist': song[1],
            'album': song[2],
            'file_url': song[3],
            'image_url': song[4]
        }
        return jsonify({"exists": True, "song": song_info}), 200
    else:
        return jsonify({"exists": False}), 200

@app.route('/download', methods=['POST'])
def download_song():
    data = request.json
    title = data.get('title')
    track_id = data.get('song_id')
    artist = data.get('artist')
    artist_id = data.get('artist_id')
    album = data.get('album')
    genre = data.get('genre', '')  # Valor predeterminado vacío si no se proporciona
    release_date = data.get('release_date', '')  # Valor predeterminado vacío si no se proporciona
    image_url = data.get('image_url', '')  # Valor predeterminado vacío si no se proporciona
    preview_url = data.get('preview_url', '')  # Valor predeterminado vacío si no se proporciona
    
    # Verificar si faltan datos necesarios
    if not title or not artist or not album:
        print("[ERROR] Missing title, artist, or album")
        return jsonify({"error": "Missing title, artist, or album"}), 400

    output_dir = 'static/songs/'
    song_data = search_and_download_song(
        title, artist, album, genre, release_date, image_url, preview_url, artist_id, track_id, "Nicorebo18", output_dir
    )
    
    if song_data:
        print(f"[INFO] Downloaded: {song_data['title']}")
        return jsonify({"message": f"Downloaded: {song_data['title']}", "song": song_data}), 200

    else:
        print("[ERROR] Failed to download song")
        return jsonify({"error": "Failed to download song"}), 500





if __name__ == '__main__':
    auth_token = get_token()
    check_and_create_database()  # Verificar y crear la base de datos si es necesario
    app.run(port=3210, debug=False)
