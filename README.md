# Music® by Nicorebo18

![Music® Logo](static/imgs/logo.png)

## Description

Music® is a web application that allows users to search, download, and play songs. It uses the Spotify API to fetch song information and metadata, enabling users to create custom playlists. The application also offers recommendations based on recently played and downloaded songs.

## Features

- Search for songs by title, artist, or album.
- Download songs and store them locally.
- Play downloaded songs with an integrated audio player.
- Create and manage custom playlists.
- Get song recommendations based on listening history.
- User-friendly interface.

## Installation

### Requirements

- Python 3.8 or higher
- pip (Python package manager)
- Spotify API credentials

### Clone the repository

```bash
git clone https://github.com/Nicorebo-18/MusicPlayer.git
cd MusicPlayer
```

### Environment Configuration
Create a .env file in the root directory of the project and add your Spotify API credentials:
```bash
CLIENT_ID="your_client_id"
CLIENT_SECRET="your_client_secret"
```

### Install Dependencies
```bash
pip install -r requirements.txt
```