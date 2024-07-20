from dotenv import load_dotenv
from requests import post, get
import os
import base64
import json
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials


load_dotenv()
client_id = os.getenv('CLIENT_ID')
client_secret = os.getenv('CLIENT_SECRET')
client_credentials_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

def get_recommendations(track_name):
    # Get track URI
    results = sp.search(q=track_name, type='track')
    track_uri = results['tracks']['items'][0]['uri']

    # Get recommended tracks
    recommendations = sp.recommendations(seed_tracks=[track_uri])['tracks']
    return recommendations

print(get_recommendations("mala mujer"))