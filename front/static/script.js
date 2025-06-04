document.addEventListener('DOMContentLoaded', () => {
    // Основные элементы
    const player = document.getElementById('player');
    const tracks = Array.from(document.querySelectorAll('.track'));
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const volumeSlider = document.getElementById('volume-slider');
    const loopBtn = document.getElementById('loop-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');

    // Поиск
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    // Аудиоанализ
    let audioContext, analyser, dataArray;
    let currentTrackIndex = -1;
    let isShuffled = false;
    let isDragging = false;

    // Инициализация
    function init() {
        player.volume = volumeSlider.value;
        volumeSlider.style.setProperty('--volume', player.volume);

        // Обработчики событий
        setupEventListeners();
    }

    function setupEventListeners() {
        // Управление плеером
        playPauseBtn.addEventListener('click', togglePlayPause);
        document.getElementById('prev-btn').addEventListener('click', playPrev);
        document.getElementById('next-btn').addEventListener('click', playNext);
        loopBtn.addEventListener('click', toggleLoop);
        shuffleBtn.addEventListener('click', toggleShuffle);
        volumeSlider.addEventListener('input', updateVolume);

        // Прогресс-бар
        progressContainer.addEventListener('click', seek);
        progressContainer.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', endDrag);

        // Треки
        tracks.forEach((track, index) => {
            track.addEventListener('click', (e) => {
                if (e.target.classList.contains('play-btn')) {
                    playTrack(index);
                }
            });
        });

        // Плеер
        player.addEventListener('timeupdate', updateProgress);
        player.addEventListener('play', updatePlayState);
        player.addEventListener('pause', updatePlayState);
        player.addEventListener('ended', handleTrackEnd);
        player.addEventListener('volumechange', updateVolumeDisplay);
        player.addEventListener('play', initAudioAnalyzer);

        // Поиск
        searchInput.addEventListener('input', handleSearch);
        document.addEventListener('click', closeSearchResults);
    }

    // Функции плеера
    function playTrack(index) {
        if (index < 0 || index >= tracks.length) return;

        const track = tracks[index];
        player.src = `/music/${encodeURIComponent(track.dataset.filename)}`;
        player.play()
            .then(() => {
                currentTrackIndex = index;
                nowPlayingTitle.textContent = track.querySelector('h3').textContent;
                updateUI();
            })
            .catch(e => console.error('Play error:', e));
    }

    function togglePlayPause() {
        if (player.paused) {
            if (!player.src && tracks.length > 0) {
                playTrack(0);
            } else {
                player.play();
            }
        } else {
            player.pause();
        }
    }

    function playNext() {
        const nextIndex = isShuffled ?
            Math.floor(Math.random() * tracks.length) :
            (currentTrackIndex + 1) % tracks.length;
        playTrack(nextIndex);
    }

    function playPrev() {
        if (player.currentTime > 3) {
            player.currentTime = 0;
        } else {
            const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
            playTrack(prevIndex);
        }
    }

    function toggleLoop() {
        player.loop = !player.loop;
        loopBtn.classList.toggle('active', player.loop);
    }

    function toggleShuffle() {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
    }

    function updateVolume() {
        player.volume = volumeSlider.value;
        volumeSlider.style.setProperty('--volume', player.volume);
    }

    function updateVolumeDisplay() {
        volumeSlider.value = player.volume;
        volumeSlider.style.setProperty('--volume', player.volume);
    }

    function updateProgress() {
        const percent = (player.currentTime / player.duration) * 100 || 0;
        progressBar.style.width = `${percent}%`;

        const formatTime = (time) => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        };

        document.getElementById('time-display').textContent =
            `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
    }

    function seek(e) {
        const rect = progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.currentTime = percent * player.duration;
    }

    function startDrag(e) {
        isDragging = true;
        handleDrag(e);
    }

    function handleDrag(e) {
        if (!isDragging) return;
        const rect = progressContainer.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        player.currentTime = percent * player.duration;
    }

    function endDrag() {
        isDragging = false;
    }

    function updatePlayState() {
        playPauseBtn.textContent = player.paused ? '▶' : '⏸';
    }

    function handleTrackEnd() {
        if (!player.loop) {
            playNext();
        }
    }

    function updateUI() {
        tracks.forEach((track, index) => {
            track.classList.toggle('playing', index === currentTrackIndex);
        });
    }

    // Поиск
    function handleSearch() {
        const query = searchInput.value.toLowerCase();
        if (query.length < 1) {
            searchResults.style.display = 'none';
            return;
        }

        const results = tracks.filter(track =>
            track.querySelector('h3').textContent.toLowerCase().includes(query)
        );

        displaySearchResults(results);
    }

    function displaySearchResults(results) {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
        } else {
            results.forEach(track => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = track.querySelector('h3').textContent;
                item.addEventListener('click', () => {
                    const index = tracks.indexOf(track);
                    playTrack(index);
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                });
                searchResults.appendChild(item);
            });
        }

        searchResults.style.display = 'block';
    }

    function closeSearchResults(e) {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.style.display = 'none';
        }
    }

    // Аудиовизуализация
    function initAudioAnalyzer() {
        if (audioContext) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const source = audioContext.createMediaElementSource(player);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        visualize();
    }

    function visualize() {
        if (!analyser) return;

        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');
        const WIDTH = canvas.width = canvas.offsetWidth;
        const HEIGHT = canvas.height = canvas.offsetHeight;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Простая визуализация - круговой спектр
        const centerX = WIDTH / 2;
        const centerY = HEIGHT / 2;
        const radius = Math.min(WIDTH, HEIGHT) * 0.3;
        const barCount = 60;

        for (let i = 0; i < barCount; i++) {
            const barHeight = dataArray[i % dataArray.length] / 2;
            const angle = (i / barCount) * Math.PI * 2;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + (barHeight / 150)})`;
            ctx.stroke();
        }

        requestAnimationFrame(visualize);
    }

    // Глобальная функция
    window.playTrack = filename => {
        const index = tracks.findIndex(t => t.dataset.filename === filename);
        if (index !== -1) playTrack(index);
    };

    // Запуск
    init();
});
