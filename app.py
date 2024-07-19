from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
from requests import post, get
import sqlite3
import os
import base64
import json

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

auth_token = get_token()
#search_for_artist(auth_token, "Twen")


@app.route('/')
def index():
    # Datos simulados para las categorías de álbumes
    categorias = {
        "Escuchado Recientemente": [
            {"title": "Clancy", "artist": "Twenty One Pilots", "audio_file": "/static/song1.mp3", "cover_url": "https://www.emp-online.es/dw/image/v2/BBQV_PRD/on/demandware.static/-/Sites-master-emp/default/dw7f84522c/images/5/6/9/1/569187.jpg?sfrm=png"},
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


if __name__ == '__main__':
    check_and_create_database()  # Verificar y crear la base de datos si es necesario
    app.run(port=3210, debug=False)
