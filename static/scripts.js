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


function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}




function toggleSidebar() {
    sidebar.classList.toggle('active');
    logo.classList.toggle('active');
}

function activateSearch() {
    document.getElementById('searchInput').focus();
}



function showSearchResults() {
    const searchInput = document.getElementById('search-input').value;
    const searchResults = document.getElementById('search-results');

    if (searchInput.length > 0) {
        // Simular resultados de búsqueda
        const artists = ["Artista 1", "Artista 2", "Artista 3", "Artista 4", "Artista 5"];
        const songs = ["Album 1", "Album 2", "Album 3", "Album 4", "Album 5"];
        const albums = ["Canción 1", "Canción 2", "Canción 3", "Canción 4", "Canción 5"];

        const artistsList = document.getElementById('artists-list');
        const albumsList = document.getElementById('albums-list');
        const songsList = document.getElementById('songs-list');

        // Limpiar listas anteriores
        artistsList.innerHTML = '';
        albumsList.innerHTML = '';
        songsList.innerHTML = '';

        // Añadir nuevos resultados
        artists.forEach(artist => {
            const li = document.createElement('li');
            li.textContent = artist;
            artistsList.appendChild(li);
        });

        albums.forEach(album => {
            const li = document.createElement('li');
            li.textContent = album;
            albumsList.appendChild(li);
        });

        songs.forEach(song => {
            const li = document.createElement('li');
            li.textContent = song;
            songsList.appendChild(li);
        });

        searchResults.style.opacity = "1";
        searchResults.style.transform = "translateX(-50%) translateY(0);";
    } else {
        searchResults.style.opacity = "0";
        searchResults.style.transform = "translateX(-50%) translateY(-20px);";
    }
}

function hideSearchResults() {  // Agrega esta función para ocultar los resultados al perder el foco
    const searchResults = document.getElementById('search-results');
    searchResults.style.opacity = "0";
    searchResults.style.transform = "translateX(-50%) translateY(-20px);";
}


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

    if(isPlaying){
        audio.pause();
    }else{
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
        pauseAudio()
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

// Función para actualizar la barra de progreso
function updateProgressBar() {
    const duration = audio.duration || 0; // Duración total de la canción
    const currentTime = audio.currentTime || 0; // Tiempo actual de reproducción
    const progressPercentage = (currentTime / duration) * 96 + 2 || 2; // Calcula el porcentaje de progreso
    progressFill.style.width = `${progressPercentage}%`; // Actualiza la anchura de la barra de progreso

    currentTimeElement.textContent = formatTime(currentTime);
    totalTimeElement.textContent = formatTime(duration);
}




// Configura el intervalo para llamar a updateProgressBar cada segundo
setInterval(updateProgressBar, 1000);

// También puedes actualizar la barra de progreso durante el evento 'timeupdate'
audio.addEventListener('timeupdate', updateProgressBar);

document.getElementById('search-input').addEventListener('focus', showSearchResults);  // Cambia 'input' a 'focus'
document.getElementById('search-input').addEventListener('blur', hideSearchResults);  // Agrega esta línea para ocultar los resultados al perder el foco

document.addEventListener('click', function(event) {
    var sidebar = document.getElementById('sidebar');
    var toggleButton = document.getElementById('toggle-button');

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



/*window.onload = () => {
    searchMusic();
};*/
