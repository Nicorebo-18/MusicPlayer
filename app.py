from flask import Flask, render_template
from dotenv import load_dotenv
from requests import post, get
import os
import base64
import json

load_dotenv()
app = Flask(__name__)

client_id = os.getenv('CLIENT_ID')
client_secret = os.getenv('CLIENT_SECRET')




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



if __name__ == '__main__':
    app.run(port=3210, debug=False)
