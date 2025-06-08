class Player {
  constructor() {
    this.player = document.getElementById('player');
    this.tracks = Array.from(document.querySelectorAll('.track'));
    this.currentTrackIndex = -1;
    this.isShuffled = false;
    this.initEvents();
  }

  initEvents() {
    this.tracks.forEach((track, index) => {
      track.addEventListener('click', () => this.playTrack(index));
    });

    document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlayPause());
    document.getElementById('prev-btn').addEventListener('click', () => this.playPrev());
    document.getElementById('next-btn').addEventListener('click', () => this.playNext());
    document.getElementById('loop-btn').addEventListener('click', () => this.toggleLoop());
    document.getElementById('shuffle-btn').addEventListener('click', () => this.toggleShuffle());

    // Progress bar
    const progressContainer = document.getElementById('progress-container');
    progressContainer.addEventListener('click', (e) => this.seek(e));

    document.getElementById('volume-slider').addEventListener('input', (e) => {
      this.player.volume = e.target.value;
      this.updateVolumeDisplay();
    });

    this.player.addEventListener('timeupdate', () => this.updateProgress());
    this.player.addEventListener('play', () => this.updatePlayState());
    this.player.addEventListener('pause', () => this.updatePlayState());
    this.player.addEventListener('ended', () => this.handleTrackEnd());
    this.player.addEventListener('volumechange', () => this.updateVolumeDisplay());
  }

  playTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;

    const track = this.tracks[index];
    this.player.src = `/music/${encodeURIComponent(track.dataset.filename)}`;
    this.player.play()
      .then(() => {
        this.currentTrackIndex = index;
        document.getElementById('now-playing-title').textContent = track.querySelector('h3').textContent;
        this.updateUI();
      })
      .catch(e => console.error('Play error:', e));
  }

  togglePlayPause() {
    if (this.player.paused) {
      if (!this.player.src && this.tracks.length > 0) {
        this.playTrack(0);
      } else {
        this.player.play();
      }
    } else {
      this.player.pause();
    }
  }

  playNext() {
    const nextIndex = this.isShuffled ?
      Math.floor(Math.random() * this.tracks.length) :
      (this.currentTrackIndex + 1) % this.tracks.length;
    this.playTrack(nextIndex);
  }

  playPrev() {
    if (this.player.currentTime > 3) {
      this.player.currentTime = 0;
    } else {
      const prevIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
      this.playTrack(prevIndex);
    }
  }

  toggleLoop() {
    this.player.loop = !this.player.loop;
    document.getElementById('loop-btn').classList.toggle('active', this.player.loop);
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    document.getElementById('shuffle-btn').classList.toggle('active', this.isShuffled);
  }

  seek(e) {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    this.player.currentTime = percent * this.player.duration;
  }

  updateProgress() {
    const percent = (this.player.currentTime / this.player.duration) * 100 || 0;
    document.getElementById('progress-bar').style.width = `${percent}%`;

    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    document.getElementById('time-display').textContent =
      `${formatTime(this.player.currentTime)} / ${formatTime(this.player.duration)}`;
  }

  updatePlayState() {
    document.getElementById('play-pause-btn').textContent =
      this.player.paused ? '▶' : '⏸';
  }

  updateVolumeDisplay() {
    const slider = document.getElementById('volume-slider');
    const percent = this.player.volume * 100;
    slider.style.setProperty('--volume-percent', `${percent}%`);

    if (!this.player.paused) {
        slider.value = this.player.volume;
    }
  }

  handleTrackEnd() {
    if (!this.player.loop) {
      this.playNext();
    }
  }

  updateUI() {
    this.tracks.forEach((track, index) => {
      track.classList.toggle('playing', index === this.currentTrackIndex);
    });
  }
}

class TrackSearch {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.tracks = Array.from(document.querySelectorAll('.track'));
    this.searchTimer = null;

    this.initEvents();
  }

  initEvents() {
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.handleSearch(), 300);
    });
    document.addEventListener('click', (e) => this.closeSearchResults(e));
  }

  handleSearch() {
    const query = this.searchInput.value.toLowerCase();
    if (query.length < 1) {
      this.searchResults.style.display = 'none';
      return;
    }

    const results = this.tracks.filter(track =>
      track.querySelector('h3').textContent.toLowerCase().includes(query)
    );

    this.displaySearchResults(results);
  }

  displaySearchResults(results) {
    this.searchResults.innerHTML = '';

    if (results.length === 0) {
      this.searchResults.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
    } else {
      results.forEach(track => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = track.querySelector('h3').textContent;
        item.addEventListener('click', () => {
          const index = this.tracks.indexOf(track);
          window.player.playTrack(index);
          this.searchResults.style.display = 'none';
          this.searchInput.value = '';
        });
        this.searchResults.appendChild(item);
      });
    }

    this.searchResults.style.display = 'block';
  }

  closeSearchResults(e) {
    if (!this.searchResults.contains(e.target) && e.target !== this.searchInput) {
      this.searchResults.style.display = 'none';
    }
  }
}

class AudioVisualizer {
  constructor() {
    this.canvas = document.getElementById('visualizer');
    this.ctx = this.canvas.getContext('2d');
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.history = new Array(60).fill(0); // Буфер для плавности
    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    document.getElementById('player').addEventListener('play', () => {
      if (!this.audioContext) this.setupAudio();
      this.visualize();
    });
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  setupAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;

    const source = this.audioContext.createMediaElementSource(
      document.getElementById('player')
    );
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  visualize() {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.65;

    const pointCount = 80;
    if (this.history.length !== pointCount) {
      this.history = new Array(pointCount).fill(0);
    }

    for (let i = 0; i < pointCount; i++) {
      const value = this.dataArray[Math.floor(i / pointCount * this.dataArray.length)] / 255;
      this.history[i] = Math.max(this.history[i] * 0.82, value);

      const angle = (i / pointCount) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = 8 + this.history[i] * 35;
      const opacity = this.history[i] * 0.35;

      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `hsla(250, 80%, 70%, ${opacity})`);
      gradient.addColorStop(0.7, `hsla(240, 70%, 60%, ${opacity*0.7})`);
      gradient.addColorStop(1, `hsla(230, 60%, 50%, 0)`);

      this.ctx.beginPath();
      this.ctx.fillStyle = gradient;
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.visualize());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.player = new Player();
  new TrackSearch();
  new AudioVisualizer();
});
