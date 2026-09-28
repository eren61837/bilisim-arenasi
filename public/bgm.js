// bgm.js - Background Music Player (Coldplay - Hymn For The Weekend)
// Plays on all games and portal with seamless volume control and browser autoplay support
(function() {
  'use strict';

  const TRACKS = [
    {
      title: 'Run From Your Demons',
      artist: 'That Handsome Devil',
      src: '/music/run_from_your_demons.mp3'
    },
    {
      title: 'Hymn For The Weekend',
      artist: 'Coldplay ft. Beyoncé',
      src: '/music/hymn_for_the_weekend.mp3'
    }
  ];

  let currentTrackIdx = parseInt(localStorage.getItem('bgm_track_idx') || '0', 10);
  if (isNaN(currentTrackIdx) || currentTrackIdx < 0 || currentTrackIdx >= TRACKS.length) {
    currentTrackIdx = 0;
  }

  // Read saved settings
  let isPlaying = localStorage.getItem('bgm_playing') !== 'false';
  let volume = parseFloat(localStorage.getItem('bgm_volume') || '0.35');

  // Create Audio element
  let audio = document.getElementById('bgm-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bgm-audio';
    audio.src = TRACKS[currentTrackIdx].src;
    audio.loop = false;
    audio.volume = volume;
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  // Auto next track on ended
  audio.addEventListener('ended', () => {
    nextTrack();
  });

  // Create UI Widget
  const widget = document.createElement('div');
  widget.className = 'bgm-widget' + (isPlaying ? '' : ' paused');
  widget.innerHTML = `
    <div class="bgm-icon-wrap" id="bgm-icon" title="Şarkıyı Değiştir">🎵</div>
    <div class="bgm-info">
      <div class="bgm-title" id="bgm-title">${TRACKS[currentTrackIdx].title}</div>
      <div class="bgm-artist" id="bgm-artist">${TRACKS[currentTrackIdx].artist}</div>
    </div>
    <button type="button" class="bgm-btn-toggle" id="bgm-btn-toggle" title="Oynat / Duraklat">${isPlaying ? '⏸' : '▶'}</button>
    <button type="button" class="bgm-btn-toggle" id="bgm-btn-next" title="Sonraki Şarkı">⏭</button>
    <input type="range" class="bgm-volume-slider" id="bgm-volume" min="0" max="1" step="0.05" value="${volume}" title="Ses Seviyesi">
  `;
  document.body.appendChild(widget);

  const btnToggle = document.getElementById('bgm-btn-toggle');
  const btnNext = document.getElementById('bgm-btn-next');
  const titleEl = document.getElementById('bgm-title');
  const artistEl = document.getElementById('bgm-artist');
  const sliderVolume = document.getElementById('bgm-volume');
  const iconWrap = document.getElementById('bgm-icon');

  function setTrack(idx) {
    currentTrackIdx = idx % TRACKS.length;
    localStorage.setItem('bgm_track_idx', currentTrackIdx);
    const track = TRACKS[currentTrackIdx];
    audio.src = track.src;
    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = track.artist;
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }

  function nextTrack() {
    setTrack((currentTrackIdx + 1) % TRACKS.length);
  }

  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      nextTrack();
    });
  }

  function tryPlay() {
    audio.play().then(() => {
      isPlaying = true;
      localStorage.setItem('bgm_playing', 'true');
      widget.classList.remove('paused');
      btnToggle.textContent = '⏸';
    }).catch(() => {
      // Autoplay blocked by browser until user gesture
      widget.classList.add('paused');
      btnToggle.textContent = '▶';
    });
  }

  function togglePlay() {
    if (audio.paused) {
      audio.play().then(() => {
        isPlaying = true;
        localStorage.setItem('bgm_playing', 'true');
        widget.classList.remove('paused');
        btnToggle.textContent = '⏸';
      }).catch(() => {});
    } else {
      audio.pause();
      isPlaying = false;
      localStorage.setItem('bgm_playing', 'false');
      widget.classList.add('paused');
      btnToggle.textContent = '▶';
    }
  }

  btnToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  iconWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  sliderVolume.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    audio.volume = v;
    localStorage.setItem('bgm_volume', v);
    if (v === 0) {
      iconWrap.textContent = '🔇';
    } else {
      iconWrap.textContent = '🎵';
    }
  });

  // Start playback on first interaction if blocked
  if (isPlaying) {
    tryPlay();
    const handleFirstClick = () => {
      if (audio.paused && isPlaying) {
        audio.play().then(() => {
          widget.classList.remove('paused');
          btnToggle.textContent = '⏸';
        }).catch(() => {});
      }
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);
    window.addEventListener('keydown', handleFirstClick);
  } else {
    audio.pause();
    widget.classList.add('paused');
    btnToggle.textContent = '▶';
  }

})();
