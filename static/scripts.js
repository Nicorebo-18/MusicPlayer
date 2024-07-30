// ==========================================================
// Variables Globales y Configuraciones
// ==========================================================
const rootStyles = getComputedStyle(document.documentElement);
const musicList = document.getElementById('music-list');
const currentSong = document.getElementById('current-song');
const sidebar = document.getElementById('sidebar');
const logo = document.getElementById('logo');
const mainContent = document.querySelector('main');
const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');
const progressFill = document.querySelector('.progress-fill');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const volumeBar = document.querySelector('.volume-bar');
const volume = document.querySelector('.volume');
const volumeFill = document.querySelector('.volume-fill');
let audio = null; // Variable global para la instancia de audio
let isPlaying = false; // Estado de reproducción
let currentVolume = 1; // Variable global para el volumen, rango de 0.0 a 1.0
let previewAudio = null;
let previewTimeout = null;
let debounceTimer;

const previewDelay = 1000;



// ==========================================================
// Funciones Utilitarias
// ==========================================================
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}



// ==========================================================
// Funciones de la Barra de Progreso
// ==========================================================
function updateProgressBar() {
    if (!audio) return;

    const duration = audio.duration || 0; // Duración total de la canción
    const currentTime = audio.currentTime || 0; // Tiempo actual de reproducción
    const progressPercentage = (currentTime / duration) * 100 || 2; // Calcula el porcentaje de progreso
    progressFill.style.width = `${progressPercentage}%`; // Actualiza la anchura de la barra de progreso

    currentTimeElement.textContent = formatTime(currentTime);
    totalTimeElement.textContent = formatTime(duration);
}

progressBar.addEventListener('click', (e) => {
    if (!audio) return;
    const rect = progress.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const progressPercentage = (offsetX / rect.width) * 100;
    const newTime = (progressPercentage / 100) * audio.duration;
    progressFill.style.width = `${progressPercentage}%`;
    audio.currentTime = newTime;
    updateProgressBar();
});

progressBar.addEventListener('mousedown', () => {
    if (!audio) return;
    const onMouseMove = (e) => {
        const rect = progress.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        pauseAudio();
        isPlaying = false;
        if (offsetX >= 0 && offsetX <= rect.width) {
            const progressPercentage = (offsetX / rect.width) * 100;
            const newTime = (progressPercentage / 100) * audio.duration;
            progressFill.style.width = `${progressPercentage}%`;
            progressFill.style.background = "var(--main-color)";
            audio.currentTime = newTime;
            updateProgressBar();
        }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
        playAudio();
        progressFill.style.background = "";
        document.removeEventListener('mousemove', onMouseMove);
    }, { once: true });
});



// ==========================================================
// Funciones de Reproducción de Audio
// ==========================================================

function playSong(song, title, artist, imageUrl, otherdata = null) {

    // Si ya hay una canción reproduciéndose, deténla y elimina la instancia
    if (audio) {
        audio.pause();
        audio.src = ''; // Eliminar el src de la instancia anterior para liberar recursos
        audio = null;
    }

    // Crear una nueva instancia de audio y reproducirla
    audio = new Audio(song);
    //audio.volume = volume; // Establecer el volumen global
    isPlaying = true;
    audio.play();
    updatePlayButton();

    // Actualizar la barra de progreso y tiempos
    audio.addEventListener('timeupdate', updateProgressBar);

    // Asegurarse de que la duración total de la canción se muestre al cargar los metadatos
    audio.addEventListener('loadedmetadata', () => {
        totalTimeElement.textContent = formatTime(audio.duration);
    });

    // Manejar el evento 'ended' para actualizar el botón de reproducción al final de la canción
    audio.addEventListener('ended', () => {
        isPlaying = false;
        updatePlayButton();
    });

    // Actualizar el footer con la información de la canción actual
    updateFooter({
        title: title,
        artist: artist,
        image_url: imageUrl
    });

    updateMediaSession({otherdata});
}

function playAudio() {
    if (audio) {
        isPlaying = true;
        audio.play();
        updatePlayButton();
    }
}

function pauseAudio() {
    if (audio) {
        isPlaying = false;
        audio.pause();
        updatePlayButton();
    }
}

function togglePlay() {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
    updatePlayButton();
}

function updatePlayButton() {
    const playButton = document.querySelector('.play-button');
    
    // SVG para reproducir
    const playSVG = '<svg viewBox="0 0 16 16" class="play-icon"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path></svg>';

    // SVG para pausar
    const pauseSVG = '<svg viewBox="0 0 16 16" class="play-icon"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path></svg>';

    // Cambiar el contenido del botón según el estado isPlaying
    playButton.innerHTML = isPlaying ? pauseSVG : playSVG;
}

function updateVolumeBar(percentage) {
    const volPercentage = Math.max(0, Math.min(percentage * 100, 100)); // Asegura que el porcentaje esté entre 0 y 100
    volumeFill.style.width = `${volPercentage}%`; // Actualiza la anchura de la barra de progreso
    setVolume(percentage); // Establece el volumen de la canción
}

volumeBar.addEventListener('click', (e) => {
    const rect = volumeBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const volumePercentage = offsetX / rect.width;
    updateVolumeBar(volumePercentage);
});

volumeBar.addEventListener('mousedown', () => {
    const onMouseMove = (e) => {
        const rect = volumeBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        if (offsetX >= 0 && offsetX <= rect.width) {
            const volumePercentage = offsetX / rect.width;
            updateVolumeBar(volumePercentage);
        }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMouseMove);
    }, { once: true });
});

function setVolume(volume) {
    currentVolume = Math.max(0, Math.min(volume, 1)); // Asegura que el volumen esté entre 0 y 1
    if (audio) {
        audio.volume = currentVolume; // Establece el volumen de la instancia de audio
    }
}

function updateFooter(song) {
    const albumCover = document.getElementById('footer-album-cover');
    const songTitle = document.getElementById('footer-song-title');
    const songArtist = document.getElementById('footer-song-artist');

    if (song.image_url) {
        albumCover.src = song.image_url;
    } else {
        albumCover.src = 'static/imgs/song-placeholder.png'; // Imagen de reserva
    }

    songTitle.textContent = song.title || 'Escoge una canción';
    songArtist.textContent = song.artist || ';P';
}

function updateMediaSession(songmeta) {
    if ('mediaSession' in navigator) {

        const song = songmeta.otherdata || {};
        const defaultImage = 'static/imgs/icontr.png'; // Imagen de reserva
        const imgArtwork = song.image_url ? [
            { src: song.image_url, sizes: '96x96', type: 'image/png' },
            { src: song.image_url, sizes: '128x128', type: 'image/png' },
            { src: song.image_url, sizes: '192x192', type: 'image/png' },
            { src: song.image_url, sizes: '256x256', type: 'image/png' },
            { src: song.image_url, sizes: '384x384', type: 'image/png' },
            { src: song.image_url, sizes: '512x512', type: 'image/png' }
        ] : [
            { src: defaultImage, sizes: '96x96', type: 'image/png' },
            { src: defaultImage, sizes: '128x128', type: 'image/png' },
            { src: defaultImage, sizes: '192x192', type: 'image/png' },
            { src: defaultImage, sizes: '256x256', type: 'image/png' },
            { src: defaultImage, sizes: '384x384', type: 'image/png' },
            { src: defaultImage, sizes: '512x512', type: 'image/png' }
        ];

        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title || 'Canción Desconocida',
            artist: song.artist || 'Reproduciendo en Music® by Nicorebo18',
            album: song.album || 'Unknown Album',
            artwork: imgArtwork 
        });

        navigator.mediaSession.setActionHandler('play', () => playAudio());
        navigator.mediaSession.setActionHandler('pause', () => pauseAudio());
        //navigator.mediaSession.setActionHandler('seekbackward', (details) => {items
        //    // Implement seek back functionality
        //});
        //navigator.mediaSession.setActionHandler('seekforward', (details) => {
        //    // Implement seek forward functionality
        //});
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            // Implement previous track functionality
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            // Implement next track functionality
        });
    }
}

function updateProgressCircle(circle, progress) {
    const fgCircle = circle.querySelector('.fg');

    if (!fgCircle || fgCircle.getTotalLength === undefined) {
        return;
    }

    // Asegúrate de que el progreso esté entre 0 y 1
    progress = Math.max(0, Math.min(progress, 1));

    if (progress < 0) progress = 0;
    if (progress > 0.99) progress = 1;

    const circumference = fgCircle.getTotalLength();
    const offset = circumference * (1 - progress) + 9;

    // Actualiza el stroke-dashoffset del círculo de progreso
    fgCircle.style.strokeDashoffset = offset;
}

function setupPreviewListeners() {
    document.querySelectorAll('#songs-list li').forEach(item => {
        item.addEventListener('mouseover', (event) => {
            const li = event.target.closest('li');
            if (!li) return;
            
            const previewUrl = li.dataset.previewUrl;

            if (previewUrl) {
                // Espera 2 segundos antes de empezar a reproducir la vista previa
                previewTimeout = setTimeout(() => {
                    if (previewAudio) {
                        previewAudio.pause(); // Pausar cualquier vista previa en reproducción
                    }

                    previewAudio = new Audio(previewUrl);

                    if(audio){
                        previewAudio.volume = audio.volume;
                        audio.volume = 0.15;
                    } else {
                        previewAudio.volume = 1;
                    }

                    previewAudio.play();
                    let progress = 0;

                    // Añadir el círculo de progreso
                    const imgContainer = li.querySelector('.img-container');
                    if (imgContainer) {
                        imgContainer.classList.add('darkened');

                        let circle = imgContainer.querySelector('.progress-circle');
                        if (!circle) {
                            circle = document.createElement('div');
                            circle.className = 'progress-circle';
                            circle.innerHTML = `
                                <svg class="circular-progress" viewBox="0 0 24 24">
                                    <circle class="bg" cx="12" cy="12" r="9"></circle>
                                    <circle class="fg" cx="12" cy="12" r="9"></circle>
                                </svg>`;
                            imgContainer.appendChild(circle);
                        }

                        previewAudio.addEventListener('timeupdate', () => {
                            if (previewAudio) {
                                progress = previewAudio.currentTime / 30;
                                updateProgressCircle(circle, progress);
                            }
                        });

                        previewAudio.addEventListener('ended', () => {
                            if (circle) {
                                circle.remove();
                            }
                            imgContainer.classList.remove('darkened');
                        });
                    }

                }, previewDelay);
            }
        });

        item.addEventListener('mouseout', () => {
            clearTimeout(previewTimeout); // Cancela el temporizador si el ratón sale antes de 2 segundos

            if(audio){
                if (previewAudio) {
                    audio.volume = previewAudio.volume;
                } else {
                    audio.volume = 1;
                }
            }

            if (previewAudio) {
                previewAudio.pause();
                previewAudio = null;
            }

            // Eliminar el círculo de progreso al salir del elemento
            const imgContainer = item.querySelector('.img-container');
            if (imgContainer) {
                const circle = imgContainer.querySelector('.progress-circle');

                if (circle) {
                    circle.remove();
                }

                imgContainer.classList.remove('darkened');
            }
        });
    });
}






// ==========================================================
// Funciones de Búsqueda
// ==========================================================

function showSearchResults() {
    const searchInput = document.getElementById('search-input').value;
    const searchResults = document.getElementById('search-results');
    searchResults.style.display = "block";
    searchResults.style.opacity = "1";
    searchResults.style.transform = "translateX(-50%) translateY(0);";

    if (searchInput.length > 0) {
        fetch(`/search?q=${searchInput}`)
            .then(response => response.json())
            .then(data => {
                const artistsList = document.getElementById('artists-list');
                const songsList = document.getElementById('songs-list');

                // Limpiar listas anteriores
                artistsList.innerHTML = '';
                songsList.innerHTML = '';

                // Añadir nuevos resultados
                data.artists.forEach(artist => {
                    const li = document.createElement('li');
                    const img = document.createElement('img');
                    img.src = artist.image_url ? artist.image_url : 'static/imgs/user-placeholder.png'; // Asegúrate de tener una imagen de reserva en caso de que no haya imagen del artista
                    img.alt = artist.name;
                    li.appendChild(img);
                    const span = document.createElement('span');
                    span.textContent = artist.name;
                    li.appendChild(span);
                    artistsList.appendChild(li);
                });

                data.tracks.forEach(track => {
                    const li = document.createElement('li');
                    li.dataset.artist = track.artist || '';
                    li.dataset.album = track.album || '';
                    li.dataset.genre = track.genre || ''; // Agregar género si está disponible
                    li.dataset.releaseDate = track.release_date || ''; // Agregar fecha de lanzamiento si está disponible
                    li.dataset.previewUrl = track.preview_url || ''; // Agregar URL de vista previa si está disponible
                    li.dataset.songId = track.id || '';
                    li.dataset.artistId = track.artist_id || '';
                    li.dataset.albumId = track.album_id || '';

                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'img-container';

                    const img = document.createElement('img');
                    img.src = track.image_url ? track.image_url : 'static/imgs/song-placeholder.png'; // Similarmente, una imagen de reserva para las canciones
                    img.alt = track.name;
                    const span = document.createElement('span');
                    span.textContent = track.name;
                    imgContainer.appendChild(img);
                    li.appendChild(imgContainer);
                    li.appendChild(span);
                    songsList.appendChild(li);
                });

                setupPreviewListeners();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        searchResults.style.display = "none";
        searchResults.style.opacity = "0";
        searchResults.style.transform = "translateX(-50%) translateY(-20px);";
    }
}

const debouncedShowSearchResults = debounce(showSearchResults, 250);

document.getElementById('search-input').addEventListener('input', debouncedShowSearchResults);  // Asocia la función debounced al evento oninput

function showResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.style.opacity = "1";
    searchResults.style.display = "block";
    searchResults.style.transform = "translateX(-50%) translateY(0);";
}

function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.style.opacity = "0";
    searchResults.style.transform = "translateX(-50%) translateY(-20px);";

    if (previewAudio) {
        previewAudio.pause();
        previewAudio = null;
    }

    setTimeout(function() {
        searchResults.style.display = "none";
    }, 500);
}

function handleSongClick(event) {
    const li = event.target.closest('li');
    if (!li) return;

    const songName = li.querySelector('span').textContent;
    const songImageUrl = li.querySelector('img').src;
    const artist = li.dataset.artist || '';
    const album = li.dataset.album || '';
    const artistId = li.dataset.artistId || ''; // Asumir que estos datos están disponibles en los atributos data
    const albumId = li.dataset.albumId || '';
    const songId = li.dataset.songId || '';

    // Verificar si la canción ya está en la base de datos
    fetch(`/check_song?title=${encodeURIComponent(songName)}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                console.log('La canción ya está en la base de datos.');
                const songInfo = data.song;
                // Reproducir la canción
                playSong(songInfo.file_url, songInfo.title, songInfo.artist, songInfo.image_url, songInfo);
            } else {
                // Descargar la canción si no está en la base de datos
                const requestData = {
                    title: songName,
                    artist: artist,
                    album: album,
                    genre: li.dataset.genre || '',
                    release_date: li.dataset.releaseDate || '',
                    image_url: songImageUrl,
                    preview_url: li.dataset.previewUrl || '',
                    artist_id: artistId,
                    album_id: albumId,
                    song_id: songId
                };

                fetch('/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.error || 'Unknown error occurred');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.song) {
                        const songData = data.song;
                        console.log('Canción descargada:', songData.title);
                        // Reproducir la canción
                        playSong(songData.file_path, songData.title, songData.artist, songData.image_url, songData);
                        loadCategories();
                    } else {
                        console.log('Unexpected response format');
                    }
                })
                .catch(error => {
                    console.log('Failed to download song: ' + error.message);
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            console.log('Error checking song existence: ' + error.message);
        });
}




// ==========================================================
// Categories Loader
// ==========================================================

$(document).ready(function() {
    loadCategories();
});

function loadCategories() {
    $.ajax({
        url: '/categories',
        type: 'GET',
        success: function(response) {
            updateCategories(response);
        },
        error: function(error) {
            console.error('Error loading categories:', error);
        }
    });
}

// Function to update the categories and songs in the HTML
function updateCategories(categorias) {
    const container = $('#categories-container');
    container.empty();  // Clear the current content

    categorias.forEach(categoryData => {
        const { categoria, items } = categoryData;

        const categoryDiv = $('<div>').addClass('category').attr('id', categoria);
        const categoryHeader = $('<h2>').text(categoria.charAt(0).toUpperCase() + categoria.slice(1));
        categoryDiv.append(categoryHeader);

        const itemsDiv = $('<div>').addClass('items');
        if (items.length) {
            items.forEach(item => {
                const coverDiv = $('<div>').addClass('cover').attr('onclick', `playSong('${item.audio_file}', '${item.title}', '${item.artist}', '${item.cover_url}', ${JSON.stringify(item)})`);
                
                const img = $('<img>').attr('src', item.cover_url || 'static/imgs/placeholder.gif').attr('alt', item.title);
                coverDiv.append(img);

                const titleDiv = $('<div>').addClass('title').text(item.title || 'Loading...');
                coverDiv.append(titleDiv);

                const artistDiv = $('<div>').addClass('artist').text(item.artist || 'Unknown');
                coverDiv.append(artistDiv);

                itemsDiv.append(coverDiv);
            });
        } else {
            itemsDiv.append($('<p>').text('No albums available in this category.'));
        }

        categoryDiv.append(itemsDiv);
        container.append(categoryDiv);
    });
}







// ==========================================================
// Event Listeners
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('songs-list').addEventListener('click', handleSongClick);
});

document.getElementById('search-input').addEventListener('focus', showSearchResults);  // Mostrar resultados al enfocar
document.getElementById('search-input').addEventListener('blur', hideSearchResults);  // Ocultar resultados al perder el foco

document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggle-button');
    const logo = document.querySelector('.logo');

    // Verificar si el clic fue fuera del sidebar y del botón de toggle
    if (!sidebar.contains(event.target) && event.target !== toggleButton) {
        sidebar.classList.remove('active'); // Remover la clase 'active' del sidebar
        logo.classList.remove('active'); // Remover la clase 'active' del logo
    } else if (event.target === toggleButton) {
        sidebar.classList.toggle('active'); // Alternar la clase 'active' del sidebar al hacer clic en el botón de toggle
        logo.classList.toggle('active'); // Alternar la clase 'active' del logo al hacer clic en el botón de toggle
    }
});

window.addEventListener('scroll', function() {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});