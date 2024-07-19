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
const progressFill = document.querySelector('.progress-fill');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
let isPlaying = false;
let audio = null;
let debounceTimer;



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
    const progressPercentage = (currentTime / duration) * 96 + 2 || 2; // Calcula el porcentaje de progreso
    progressFill.style.width = `${progressPercentage}%`; // Actualiza la anchura de la barra de progreso

    currentTimeElement.textContent = formatTime(currentTime);
    totalTimeElement.textContent = formatTime(duration);
}

progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const progressPercentage = (offsetX / rect.width) * 100;
    const newTime = (progressPercentage / 100) * audio.duration;
    progressFill.style.width = `${progressPercentage}%`;
    audio.currentTime = newTime;
    updateProgressBar();
});

progressBar.addEventListener('mousedown', () => {
    const onMouseMove = (e) => {
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        pauseAudio();
        isPlaying = false;
        if (offsetX >= 0 && offsetX <= rect.width) {
            const progressPercentage = (offsetX / rect.width) * 100;
            const newTime = (progressPercentage / 100) * audio.duration;
            progressFill.style.width = `${progressPercentage}%`;
            audio.currentTime = newTime;
            updateProgressBar();
        }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
        playAudio();
        document.removeEventListener('mousemove', onMouseMove);
    }, { once: true });
});



// ==========================================================
// Funciones de Reproducción de Audio
// ==========================================================

function playSong(song) {
    // Si ya hay una canción reproduciéndose, deténla y elimina la instancia
    if (audio) {
        audio.pause();
        audio.src = ''; // Eliminar el src de la instancia anterior para liberar recursos
        audio = null;
    }

    // Crear una nueva instancia de audio y reproducirla
    audio = new Audio(`${song}`);
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
}

function playAudio() {
    isPlaying = true;
    audio.play();
    updatePlayButton();
}

function pauseAudio() {
    isPlaying = false;
    audio.pause();
    updatePlayButton();
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
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



// ==========================================================
// Funciones de Búsqueda
// ==========================================================

function showSearchResults() {
    const searchInput = document.getElementById('search-input').value;
    const searchResults = document.getElementById('search-results');
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
                    const img = document.createElement('img');
                    img.src = track.image_url ? track.image_url : 'static/imgs/song-placeholder.png'; // Similarmente, una imagen de reserva para las canciones
                    img.alt = track.name;
                    li.appendChild(img);
                    const span = document.createElement('span');
                    span.textContent = track.name;
                    li.appendChild(span);
                    songsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        searchResults.style.opacity = "0";
        searchResults.style.transform = "translateX(-50%) translateY(-20px);";
    }
}

const debouncedShowSearchResults = debounce(showSearchResults, 200);

document.getElementById('search-input').addEventListener('input', debouncedShowSearchResults);  // Asocia la función debounced al evento oninput

function showResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.style.opacity = "1";
    searchResults.style.transform = "translateX(-50%) translateY(0);";
}

function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.style.opacity = "0";
    searchResults.style.transform = "translateX(-50%) translateY(-20px);";
}



// ==========================================================
// Event Listeners
// ==========================================================

document.getElementById('search-input').addEventListener('focus', showSearchResults);  // Mostrar resultados al enfocar
document.getElementById('search-input').addEventListener('blur', hideSearchResults);  // Ocultar resultados al perder el foco

document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggle-button');

    // Verificar si el clic fue fuera del sidebar y del botón de toggle
    if (!sidebar.contains(event.target) && event.target !== toggleButton) {
        sidebar.classList.remove('active'); // Remover la clase 'active' del sidebar
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