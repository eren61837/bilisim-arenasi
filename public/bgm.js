// bgm.js - Background Music Player (Coldplay - Hymn For The Weekend)
// Plays on all games and portal with seamless volume control and browser autoplay support
(function() {
  'use strict';

  const BGM_SRC = '/music/hymn_for_the_weekend.mp3';

  // Read saved settings
  let isPlaying = localStorage.getItem('bgm_playing') !== 'false';
  let volume = parseFloat(localStorage.getItem('bgm_volume') || '0.35');

  // Create Audio element
  let audio = document.getElementById('bgm-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'bgm-audio';
    audio.src = BGM_SRC;
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  // Create UI Widget
  const widget = document.createElement('div');
  widget.className = 'bgm-widget' + (isPlaying ? '' : ' paused');
  widget.innerHTML = `
    <div class="bgm-icon-wrap" id="bgm-icon" title="Hymn For The Weekend">🎵</div>
    <div class="bgm-info">
      <div class="bgm-title">Hymn For The Weekend</div>
      <div class="bgm-artist">Coldplay ft. Beyoncé</div>
    </div>
    <button type="button" class="bgm-btn-toggle" id="bgm-btn-toggle" title="Oynat / Duraklat">${isPlaying ? '⏸' : '▶'}</button>
    <input type="range" class="bgm-volume-slider" id="bgm-volume" min="0" max="1" step="0.05" value="${volume}" title="Ses Seviyesi">
  `;
  document.body.appendChild(widget);

  const btnToggle = document.getElementById('bgm-btn-toggle');
  const sliderVolume = document.getElementById('bgm-volume');
  const iconWrap = document.getElementById('bgm-icon');

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
