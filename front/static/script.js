document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const timeDisplay = document.getElementById('time-display');
    const volumeSlider = document.getElementById('volume-slider');
    const player = document.getElementById('player');
    const tracks = Array.from(document.querySelectorAll('.track'));
    const nowPlayingTitle = document.getElementById('now-playing-title');
    let currentTrackIndex = -1;
    let isLooping = false;
    let isShuffled = false;

    // Инициализация элементов управления
    document.getElementById('prev-btn').addEventListener('click', playPrev);
    document.getElementById('next-btn').addEventListener('click', playNext);
    document.getElementById('loop-btn').addEventListener('click', toggleLoop);
    document.getElementById('shuffle-btn').addEventListener('click', toggleShuffle);
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);

    // Назначение обработчиков для треков
    tracks.forEach((track, index) => {
        track.addEventListener('click', (e) => {
            if (!e.target.classList.contains('play-btn')) return;
            playTrack(index);
        });
    });

    // Обработчики плеера
    player.addEventListener('timeupdate', updateProgress);
    player.addEventListener('ended', handleTrackEnd);
    player.addEventListener('play', updatePlayState);
    player.addEventListener('pause', updatePlayState);
    player.addEventListener('error', handlePlayerError);

    progressContainer.addEventListener('click', setProgress);
    volumeSlider.addEventListener('input', setVolume);

    function playTrack(index) {
        if (index < 0 || index >= tracks.length) return;

        const track = tracks[index];
        const filename = track.dataset.filename;
        const title = track.querySelector('h3').textContent;

        // Остановить текущее воспроизведение перед загрузкой нового трека
        player.pause();
        player.src = `/music/${encodeURIComponent(filename)}`;

        player.play()
            .then(() => {
                currentTrackIndex = index;
                nowPlayingTitle.textContent = title;
                updateUI();
            })
            .catch(e => {
                console.error('Play error:', e);
                nowPlayingTitle.textContent = `Error: ${e.message}`;
            });
    }

    function togglePlayPause() {
        if (player.paused) {
            if (player.src) {
                player.play();
            } else if (tracks.length > 0) {
                playTrack(0); // Начать с первого трека, если ничего не играет
            }
        } else {
            player.pause();
        }
    }

    function updatePlayState() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        playPauseBtn.textContent = player.paused ? '▶' : '⏸';
    }

    function playNext() {
        let nextIndex;
        if (isShuffled) {
            nextIndex = Math.floor(Math.random() * tracks.length);
        } else {
            nextIndex = (currentTrackIndex + 1) % tracks.length;
        }
        playTrack(nextIndex);
    }

    function playPrev() {
        if (player.currentTime > 3) {
            // Если трек играет больше 3 секунд - перемотать в начало
            player.currentTime = 0;
        } else {
            // Иначе перейти к предыдущему треку
            const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
            playTrack(prevIndex);
        }
    }

    function toggleLoop() {
        isLooping = !isLooping;
        player.loop = isLooping;
        document.getElementById('loop-btn').classList.toggle('active', isLooping);
    }

    function toggleShuffle() {
        isShuffled = !isShuffled;
        document.getElementById('shuffle-btn').classList.toggle('active', isShuffled);
    }

    function handleTrackEnd() {
        if (!isLooping) {
            playNext();
        }
    }

    function handlePlayerError() {
        nowPlayingTitle.textContent = `Error playing track`;
        console.error('Player error:', player.error);
    }

    function updateUI() {
        tracks.forEach((track, index) => {
            track.classList.toggle('playing', index === currentTrackIndex);
        });
        updatePlayState();
    }

    function updateProgress() {
        const { currentTime, duration } = player;
        if (isNaN(duration)) return;

        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;

        const formatTime = (time) => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        };

        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = player.duration;
        if (!isNaN(duration)) {
            player.currentTime = (clickX / width) * duration;
        }
    }

    function setVolume() {
        player.volume = this.value;
    }

    // Глобальная функция для вызова из HTML
    window.playTrack = function(filename) {
        const index = tracks.findIndex(t => t.dataset.filename === filename);
        if (index !== -1) playTrack(index);
    };
});
