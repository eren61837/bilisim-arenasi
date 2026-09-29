// sumo.js - AHMET HAKAN: KUTU SUMO -- 2 Kişilik & AI Ragdoll Fizikli Piksel Dövüş Oyunu
// 100% Tam Aynısı (320x180 Piksel Estetiği, Verlet Ragdoll, Canlı Menü) + Çok Gelişmiş Özellikler
(function () {
  'use strict';

  /* =========================================================
     1. SABİTLER, PİKSEL EKRAN VE AYARLAR
  ========================================================= */
  const W = 320;
  const H = 180;
  const FPS = 60;
  const DT = 1.0 / FPS;
  const SUBSTEPS = 2;

  // Fizik Çekirdeği
  const GRAVITY = 820.0;
  const DAMP = 0.995;
  const HARD_VX = 300.0;
  const HARD_VY = 470.0;
  const BOUNCE = 0.14;

  // Hareket & Kontrol
  const RUN_SPEED = 104.0;
  const GAIN_GROUND = 16.0;
  const GAIN_AIR = 5.5;
  const ACC_GROUND_MAX = 2400.0;
  const ACC_AIR_MAX = 820.0;
  const BRAKE_GAIN = 24.0;
  const JUMP_V = 240.0;
  const JUMP_CD = 0.16;
  const COYOTE_TIME = 0.10;
  const JUMP_BUFFER = 0.12;

  // Yumruk & Süper Güç
  const PUNCH_DRIVE = 2600.0;
  const PUNCH_REACH = 1.75;
  const PUNCH_ACTIVE = 0.22;
  const PUNCH_KNOCK = 132.0;
  const PUNCH_LUNGE = 105.0;
  const PUNCH_CD = 0.40;
  const CHARGE_TIME = 0.42;
  const CHARGE_POWER = 1.65;
  const BRACE_STIFF = 2.4;

  // Renk Paleti (Orijinal Kutu Sumo Paleti)
  const C_EYE = '#181420';
  const C_WHITE = '#f4f4ec';
  const C_YEL = '#fad660';
  const C_ORANGE = '#f49242';
  const C_RED = '#e2524e';
  const C_ICE = '#ceecfa';
  const C_STONE = '#80808c';
  const C_METAL = '#969caa';
  const C_CIM = '#62b050';
  const C_TOPRAK = '#704a34';
  const C_VOID = '#0e0a12';
  const UI_DOLGU = '#161324';
  const UI_DOLGU_HOVER = '#28223e';
  const UI_KENAR = '#5c5478';
  const UI_YAZI = '#e2deec';

  const RENKLER = [
    { ad: "MAVİ",     ana: "#5cc4e4", koyu: "#367285" },
    { ad: "KIRMIZI",  ana: "#ee6c60", koyu: "#8a3e37" },
    { ad: "YEŞİL",    ana: "#72ce7e", koyu: "#427749" },
    { ad: "SARI",     ana: "#f6d660", koyu: "#8f7c37" },
    { ad: "MOR",      ana: "#b284ec", koyu: "#674c89" },
    { ad: "TURUNCU",  ana: "#f69854", koyu: "#8f5831" },
    { ad: "PEMBE",    ana: "#f68cba", koyu: "#8f516c" },
    { ad: "GRİ",      ana: "#b0b4c4", koyu: "#666972" },
  ];

  const SAPKALAR = ["yok", "kasket", "boynuz", "taç", "hale", "anten", "bandana"];
  const YUZLER = ["normal", "kızgın", "gülen", "gözlük", "bıyık"];
  const GOVDELER = {
    ince:   { ad: "İNCE",   govde: 4.4, kafa: 3.6, uzuv: 2.8, kalca: 9.4,  kutle: 0.82 },
    normal: { ad: "NORMAL", govde: 5.0, kafa: 4.0, uzuv: 3.0, kalca: 9.0,  kutle: 1.0 },
    tombul: { ad: "TOMBUL", govde: 5.9, kafa: 4.3, uzuv: 3.3, kalca: 8.3,  kutle: 1.28 }
  };

  const AHMET_QUOTES = [
    "SON DAKİKA!",
    "BİR DAKİKA AHMET BEY!",
    "TARAFSIZ BÖLGE!",
    "MASAYA VURURUM!",
    "HADDİNİ BİL!",
    "REKLAMA GİDİYORUZ!",
    "SICAK GELİŞME!",
    "BENİ DİNLEYECEKSİNİZ!"
  ];

  /* =========================================================
     2. 3x5 PİKSEL YAZI TİPİ (RETRO FONT MOTORU)
  ========================================================= */
  const FONT_DATA = {
    "A": "010,101,111,101,101", "B": "110,101,110,101,110", "C": "011,100,100,100,011",
    "D": "110,101,101,101,110", "E": "111,100,110,100,111", "F": "111,100,110,100,100",
    "G": "011,100,101,101,011", "H": "101,101,111,101,101", "I": "111,010,010,010,111",
    "J": "001,001,001,101,010", "K": "101,101,110,101,101", "L": "100,100,100,100,111",
    "M": "111,111,111,101,101", "N": "101,111,111,101,101", "O": "010,101,101,101,010",
    "P": "110,101,110,100,100", "Q": "010,101,101,111,011", "R": "110,101,110,101,101",
    "S": "011,100,010,001,110", "T": "111,010,010,010,010", "U": "101,101,101,101,111",
    "V": "101,101,101,101,010", "W": "101,101,111,111,101", "X": "101,101,010,101,101",
    "Y": "101,101,010,010,010", "Z": "111,001,010,100,111",
    "0": "111,101,101,101,111", "1": "010,110,010,010,111", "2": "111,001,111,100,111",
    "3": "111,001,111,001,111", "4": "101,101,111,001,001", "5": "111,100,111,001,111",
    "6": "111,100,111,101,111", "7": "111,001,001,001,001", "8": "111,101,111,101,111",
    "9": "111,101,111,001,111",
    "!": "010,010,010,000,010", "?": "111,001,011,000,010", ".": "000,000,000,000,010",
    ",": "000,000,000,010,100", ":": "000,010,000,010,000", "-": "000,000,111,000,000",
    "+": "000,010,111,010,000", "/": "001,001,010,100,100", "<": "001,010,100,010,001",
    ">": "100,010,001,010,100", "=": "000,111,000,111,000", "'": "010,010,000,000,000",
    "(": "001,010,010,010,001", ")": "100,010,010,010,100", "*": "101,010,111,010,101",
    " ": "000,000,000,000,000"
  };

  const TR_MAP = { "Ç": "C", "Ğ": "G", "İ": "I", "I": "I", "Ö": "O", "Ş": "S", "Ü": "U",
                   "ç": "C", "ğ": "G", "ı": "I", "i": "I", "ö": "O", "ş": "S", "ü": "U" };

  function drawPixelText(targetCtx, str, x, y, color = C_WHITE, scale = 1, align = 'left') {
    str = String(str).toUpperCase();
    let s = "";
    for (let i = 0; i < str.length; i++) {
      s += TR_MAP[str[i]] || str[i];
    }
    const totalW = Math.max(0, s.length * 4 - 1) * scale;
    let startX = x;
    if (align === 'center') startX = Math.round(x - totalW / 2);
    else if (align === 'right') startX = Math.round(x - totalW);

    targetCtx.fillStyle = color;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const rows = (FONT_DATA[ch] || FONT_DATA["?"]).split(",");
      const bx = startX + i * 4 * scale;
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          if (rows[r][c] === '1') {
            targetCtx.fillRect(bx + c * scale, y + r * scale, scale, scale);
          }
        }
      }
    }
  }

  /* =========================================================
     3. 8-BİT RETRO SES MOTORU (WEB AUDIO API SYNTH)
  ========================================================= */
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone(fStart, fEnd, type, dur, vol = 0.25) {
      try {
        this.init();
        if (!this.ctx || !gameSettings.ses) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(fStart, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(fEnd, 20), now + dur);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
      } catch (_) {}
    },
    playNoise(dur, vol = 0.28) {
      try {
        this.init();
        if (!this.ctx || !gameSettings.ses) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
      } catch (_) {}
    },
    punch() { this.playNoise(0.07, 0.3); this.playTone(300, 90, 'square', 0.08, 0.22); },
    hit() { this.playNoise(0.12, 0.35); this.playTone(260, 90, 'square', 0.13, 0.3); },
    big() { this.playNoise(0.24, 0.45); this.playTone(180, 55, 'sawtooth', 0.24, 0.4); },
    jump() { this.playTone(240, 620, 'square', 0.11, 0.2); },
    land() { this.playTone(130, 70, 'triangle', 0.09, 0.25); },
    ko() { this.playTone(520, 70, 'square', 0.7, 0.35); },
    super() { this.playNoise(0.35, 0.5); this.playTone(350, 900, 'square', 0.3, 0.4); },
    select() { this.playTone(520, 760, 'square', 0.05, 0.16); }
  };

  /* =========================================================
     4. OYUN AYARLARI VE KARAKTER TANIMLARI
  ========================================================= */
  class Karakter {
    constructor(ad, renkIdx, sapka, yuz, govde) {
      this.ad = ad;
      this.renk = renkIdx;
      this.sapka = sapka;
      this.yuz = yuz;
      this.govde = govde;
    }
    get colors() {
      return RENKLER[this.renk % RENKLER.length];
    }
    get body() {
      return GOVDELER[this.govde] || GOVDELER.normal;
    }
  }

  const gameSettings = {
    harita: "tv", // tv, klasik, buz, kule, asansor, ruzgar, lav
    tur_sayisi: 3,
    cpu_zorluk: "NORMAL", // KOLAY, NORMAL, ZOR
    yer_cekim: "NORMAL",  // AY, NORMAL, AGIR
    cpu_ile: false,
    ses: true,
    efekt: "NORMAL",
    k1: new Karakter("AHMET HAKAN", 5, "kasket", "gözlük", "normal"),
    k2: new Karakter("RAKİP SUMO", 1, "boynuz", "kızgın", "tombul")
  };

  /* =========================================================
     5. FİZİK MOTORU (VERLET RAGDOLL + KISITLAR)
  ========================================================= */
  class Parcacik {
    constructor(x, y, r, mass, kind) {
      this.x = x;
      this.y = y;
      this.px = x;
      this.py = y;
      this.ax = 0;
      this.ay = 0;
      this.r = r;
      this.mass = mass;
      this.kind = kind;
      this.grounded = false;
    }
    get vx_sn() { return (this.x - this.px) / DT; }
    get vy_sn() { return (this.y - this.py) / DT; }
    add_vel(vx_sn, vy_sn) {
      this.px -= vx_sn * DT;
      this.py -= vy_sn * DT;
    }
    set_vel(vx_sn, vy_sn) {
      this.px = this.x - vx_sn * DT;
      this.py = this.y - vy_sn * DT;
    }
  }

  class Baglanti {
    constructor(a, b, tur, rest) {
      this.a = a;
      this.b = b;
      this.tur = tur;
      this.rest = rest !== undefined ? rest : Math.hypot(a.x - b.x, a.y - b.y);
      this.stiff = 1.0;
    }
  }

  class Ragdoll {
    constructor(x, y, karakter, isAhmet = false) {
      this.karakter = karakter;
      this.isAhmet = isAhmet;
      this.gv = karakter.body;
      const t = this.gv.govde;
      const hf = this.gv.kafa;
      const uz = this.gv.uzuv;
      const k = this.gv.kutle;

      this.parts = {
        head:  new Parcacik(x, y - t - hf - 1.2, hf, 2.0 * k, "head"),
        tl:    new Parcacik(x - t, y - t, t * 0.66, 2.2 * k, "tl"),
        tr:    new Parcacik(x + t, y - t, t * 0.66, 2.2 * k, "tr"),
        br:    new Parcacik(x + t, y + t, t * 0.70, 2.6 * k, "br"),
        bl:    new Parcacik(x - t, y + t, t * 0.70, 2.6 * k, "bl"),
        handL: new Parcacik(x - t - uz * 2 - 1.4, y - 1.0, uz, 1.0 * k, "handL"),
        handR: new Parcacik(x + t + uz * 2 + 1.4, y - 1.0, uz, 1.0 * k, "handR"),
        footL: new Parcacik(x - t * 0.9, y + this.gv.kalca, uz, 1.25 * k, "footL"),
        footR: new Parcacik(x + t * 0.9, y + this.gv.kalca, uz, 1.25 * k, "footR")
      };

      const p = this.parts;
      this.sticks = [
        new Baglanti(p.tl, p.tr, "govde"),
        new Baglanti(p.tr, p.br, "govde"),
        new Baglanti(p.br, p.bl, "govde"),
        new Baglanti(p.bl, p.tl, "govde"),
        new Baglanti(p.tl, p.br, "capraz"),
        new Baglanti(p.tr, p.bl, "capraz"),
        new Baglanti(p.head, p.tl, "boyun"),
        new Baglanti(p.head, p.tr, "boyun"),
        new Baglanti(p.tl, p.handL, "kol", uz * 2.5),
        new Baglanti(p.tr, p.handR, "kol", uz * 2.5),
        new Baglanti(p.bl, p.footL, "bacak", this.gv.kalca * 1.1),
        new Baglanti(p.br, p.footR, "bacak", this.gv.kalca * 1.1)
      ];

      this.facing = 1;
      this.punch_cd = 0;
      this.punch_timer = 0;
      this.punch_guc = 1.0;
      this.punch_sarjli = false;
      this.sarj_t = 0;
      this.sarj_kullanildi = false;
      this.brace = false;
      this.stun = 0;
      this.ko = false;
      this.superMeter = 0;
      this.coyote = 0;
      this.jump_buf = 0;
      this.onceki_tilt = 0;
      this.stiff_mult = 1.0;
      this.leg_soft = 1.0;
      this.land_timer = 0;
      this.blink = 2.0;
      this.eyes_shut = 0;
    }

    get center() {
      const p = this.parts;
      return {
        x: (p.tl.x + p.tr.x + p.bl.x + p.br.x) * 0.25,
        y: (p.tl.y + p.tr.y + p.bl.y + p.br.y) * 0.25
      };
    }

    girdi(ctrl, foe, dt, env) {
      if (this.ko) return;
      const p = this.parts;
      const yerde = p.footL.grounded || p.footR.grounded;

      if (yerde) this.coyote = COYOTE_TIME;
      else this.coyote = Math.max(0, this.coyote - dt);

      if (ctrl.jump) this.jump_buf = JUMP_BUFFER;
      else this.jump_buf = Math.max(0, this.jump_buf - dt);

      if (this.stun > 0) {
        this.stun -= dt;
        return;
      }
      if (this.punch_cd > 0) this.punch_cd -= dt;
      if (this.punch_timer > 0) this.punch_timer -= dt;
      if (this.land_timer > 0) this.land_timer -= dt;

      // Zıplama
      if (this.jump_buf > 0 && this.coyote > 0) {
        this.jump_buf = 0;
        this.coyote = 0;
        AudioEngine.jump();
        for (const k in p) p[k].add_vel(0, -JUMP_V);
        p.head.ay -= 300;
        spawnDust(p.footL.x, p.footL.y);
      }

      // Yatay Koşma
      let move = 0;
      if (ctrl.left) move -= 1;
      if (ctrl.right) move += 1;
      if (move !== 0) this.facing = move;

      this.brace = !!ctrl.block;
      const hedef = move * RUN_SPEED * (this.brace ? 0.70 : 1.0);
      const kazanc = yerde ? GAIN_GROUND : GAIN_AIR;
      const accmax = yerde ? ACC_GROUND_MAX : ACC_AIR_MAX;

      for (const k in p) {
        const q = p[k];
        const simdi = q.vx_sn;
        let a = 0;
        if (move === 0 && yerde) {
          const fren = BRAKE_GAIN * (env.buz ? 0.15 : 1.0);
          a = -simdi * fren;
        } else {
          a = Math.max(-accmax, Math.min(accmax, (hedef - simdi) * kazanc));
        }
        q.ax += a;
      }

      // Yumruk & Şarj
      const basili = !!ctrl.punch;
      if (basili) {
        this.sarj_t += dt;
        if (this.sarj_t >= CHARGE_TIME && !this.sarj_kullanildi) {
          this.sarj_kullanildi = true;
          this._yumruk_at(foe, CHARGE_POWER, true);
        } else if (this.sarj_t < CHARGE_TIME && Math.random() < 0.3) {
          spawnSpark(this.facing === 1 ? p.handR.x : p.handL.x, this.facing === 1 ? p.handR.y : p.handL.y, C_YEL);
        }
      } else {
        if (this.sarj_t > 0 && !this.sarj_kullanildi && this.punch_cd <= 0) {
          this._yumruk_at(foe, 1.0, false);
        }
        this.sarj_t = 0;
        this.sarj_kullanildi = false;
      }

      // Süper Yetenek
      if (ctrl.super && this.superMeter >= 100) {
        this.triggerSuper(foe);
      }

      // Büzüş
      this.stiff_mult = this.brace ? BRACE_STIFF : 1.0;
      if (this.brace) {
        p.handL.ax += (p.tl.x - p.handL.x) * 7.0;
        p.handR.ax += (p.tr.x - p.handR.x) * 7.0;
        p.head.ay += 380;
      }

      // Denge PID Kontrolü (Ayakta Durma)
      const tl = p.tl, tr = p.tr, bl = p.bl, br = p.br;
      const mtx = (tl.x + tr.x) * 0.5, mty = (tl.y + tr.y) * 0.5;
      const mbx = (bl.x + br.x) * 0.5, mby = (bl.y + br.y) * 0.5;
      const ux = mtx - mbx, uy = mty - mby;
      const ln = Math.hypot(ux, uy) || 1.0;
      const tilt = ux / ln;
      const tilt_hizi = (tilt - this.onceki_tilt) / Math.max(dt, 0.001);
      this.onceki_tilt = tilt;

      const kp = Math.abs(tilt) > 0.55 ? 2900.0 : 1350.0;
      const kd = Math.abs(tilt) > 0.55 ? 70.0 : 62.0;
      const tork = Math.max(-1800, Math.min(1800, -tilt * kp - tilt_hizi * kd));
      tl.ax += tork; tr.ax += tork;
      bl.ax -= tork; br.ax -= tork;

      // Kafa Omuzların Üstünde Dursun
      p.head.ax += (mtx - p.head.x) * 130.0;
      p.head.ay += (mty - (this.gv.govde + this.gv.kafa + 1.0) - p.head.y) * 80.0;
    }

    _yumruk_at(foe, guc, sarjli) {
      AudioEngine.punch();
      this.punch_cd = PUNCH_CD;
      this.punch_timer = PUNCH_ACTIVE;
      this.punch_guc = guc;
      this.punch_sarjli = sarjli;
      const p = this.parts;

      const leadHand = this.facing === 1 ? p.handR : p.handL;
      leadHand.ax += this.facing * PUNCH_DRIVE * guc;
      leadHand.ay -= 300 * guc;

      for (const k in p) {
        p[k].add_vel(this.facing * PUNCH_LUNGE * guc, -18 * guc);
      }
      if (sarjli) {
        AudioEngine.big();
        spawnPopup(this.center.x, this.center.y - 18, "ŞARJLI! ⚡", C_YEL);
      }
    }

    triggerSuper(foe) {
      this.superMeter = 0;
      AudioEngine.super();
      const c = this.center;

      if (this.isAhmet) {
        // TARAFSIZ BÖLGE MASA VURUŞU
        triggerMemePopup(AHMET_QUOTES[Math.floor(Math.random() * AHMET_QUOTES.length)]);
        spawnPopup(c.x, c.y - 20, "TARAFSIZ BÖLGE! 💥", C_RED);

        const fc = foe.center;
        const dx = fc.x - c.x;
        const push = 260.0;
        for (const k in foe.parts) {
          foe.parts[k].add_vel((dx > 0 ? 1 : -1) * push, -180.0);
        }
        foe.stun = 0.6;
        for (let i = 0; i < 20; i++) spawnSpark(c.x, c.y, C_RED);
      } else {
        // MEGA GÖBEK FIRLATMASI
        triggerMemePopup("MEGA SUMO İTİŞİ!");
        spawnPopup(c.x, c.y - 20, "GÖBEK DARBESİ! 🐲", "#2979ff");
        for (const k in foe.parts) {
          foe.parts[k].add_vel(this.facing * 280.0, -140.0);
        }
        foe.stun = 0.55;
      }
    }

    entegre(dt, env) {
      const g = GRAVITY * (gameSettings.yer_cekim === "AY" ? 0.62 : (gameSettings.yer_cekim === "AGIR" ? 1.45 : 1.0));
      const hvx = HARD_VX * dt;
      const hvy = HARD_VY * dt;

      for (const k in this.parts) {
        const q = this.parts[k];
        let vx = q.x - q.px;
        let vy = q.y - q.py;
        q.px = q.x; q.py = q.y;

        const rx = env.ruzgar_x * (q.grounded ? 0.30 : 1.0);
        q.x += vx * DAMP + (q.ax + rx) * dt * dt;
        q.y += vy * DAMP + (g + q.ay) * dt * dt;
        q.ax = 0; q.ay = 0;

        vx = q.x - q.px; vy = q.y - q.py;
        if (vx > hvx) q.px = q.x - hvx;
        else if (vx < -hvx) q.px = q.x + hvx;
        if (vy > hvy) q.py = q.y - hvy;
        else if (vy < -hvy) q.py = q.y + hvy;
      }
    }

    kisitlari_coz() {
      const k = this.stiff_mult;
      const yumruk = this.punch_timer > 0;
      for (let i = 0; i < this.sticks.length; i++) {
        const s = this.sticks[i];
        const a = s.a, b = s.b;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-4;
        let rest = s.rest;
        let st = s.stiff;

        if (s.tur === "kol" && yumruk) {
          st = 1.0;
          rest = s.rest * PUNCH_REACH; // Piston yumruk uzaması
        } else {
          st = Math.min(1.0, st * k);
        }

        const diff = (d - rest) / d * st;
        const ma = a.mass, mb = b.mass, tot = ma + mb;
        a.x += dx * diff * (mb / tot);
        a.y += dy * diff * (mb / tot);
        b.x -= dx * diff * (ma / tot);
        b.y -= dy * diff * (ma / tot);
      }
    }

    zemin_carp(env) {
      const p = this.parts;
      const platY = env.platY;
      const platL = env.platL;
      const platR = env.platR;

      for (const k in p) {
        const q = p[k];
        q.grounded = false;

        // Platform Çarpışması
        if (q.y + q.r >= platY && q.x >= platL && q.x <= platR && q.py <= platY + 10) {
          q.y = platY - q.r;
          q.grounded = true;
          const vx = q.x - q.px;
          const fric = env.buz ? 0.985 : 0.76;
          q.px = q.x - vx * fric;
        }

        // Lav Kenarları
        if (env.isLav && q.y >= platY - 4 && (q.x < platL || q.x > platR)) {
          q.add_vel(0, -320.0);
          spawnSpark(q.x, q.y, C_ORANGE);
        }

        // KO Düşüşü
        if (q.y > H + 30 && !this.ko) {
          this.ko = true;
          handleKO(this);
        }
      }
    }

    ciz(targetCtx) {
      const p = this.parts;
      const col = this.karakter.colors;

      // Uzuv Çizgileri (Kollar & Bacaklar)
      targetCtx.lineWidth = 3;
      targetCtx.strokeStyle = col.koyu;

      // Sol Kol / Bacak
      const mSolX = (p.tl.x + p.bl.x) * 0.5, mSolY = (p.tl.y + p.bl.y) * 0.5;
      targetCtx.beginPath();
      targetCtx.moveTo(mSolX, mSolY); targetCtx.lineTo(p.handL.x, p.handL.y);
      targetCtx.moveTo(p.bl.x, p.bl.y); targetCtx.lineTo(p.footL.x, p.footL.y);
      targetCtx.stroke();

      // Sağ Kol / Bacak
      const mSagX = (p.tr.x + p.br.x) * 0.5, mSagY = (p.tr.y + p.br.y) * 0.5;
      targetCtx.beginPath();
      targetCtx.moveTo(mSagX, mSagY); targetCtx.lineTo(p.handR.x, p.handR.y);
      targetCtx.moveTo(p.br.x, p.br.y); targetCtx.lineTo(p.footR.x, p.footR.y);
      targetCtx.stroke();

      // Gövde Çokgeni (Pixel Torso)
      targetCtx.fillStyle = col.ana;
      targetCtx.strokeStyle = col.koyu;
      targetCtx.lineWidth = 1;
      targetCtx.beginPath();
      targetCtx.moveTo(p.tl.x, p.tl.y);
      targetCtx.lineTo(p.tr.x, p.tr.y);
      targetCtx.lineTo(p.br.x, p.br.y);
      targetCtx.lineTo(p.bl.x, p.bl.y);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.stroke();

      // Ahmet Hakan Takım Elbise / Kravat Detayı
      if (this.isAhmet) {
        const mx = (p.tl.x + p.tr.x) * 0.5, my = (p.tl.y + p.tr.y) * 0.5;
        targetCtx.fillStyle = C_WHITE;
        targetCtx.fillRect(mx - 2, my, 4, 3);
        targetCtx.fillStyle = C_RED;
        targetCtx.fillRect(mx - 1, my + 2, 2, 8);
      }

      // Kafa (Pixel Kare Kafa)
      const hx = Math.round(p.head.x), hy = Math.round(p.head.y), hr = Math.round(p.head.r);
      targetCtx.fillStyle = col.ana;
      targetCtx.strokeStyle = col.koyu;
      targetCtx.fillRect(hx - hr, hy - hr, hr * 2 + 1, hr * 2 + 1);
      targetCtx.strokeRect(hx - hr, hy - hr, hr * 2 + 1, hr * 2 + 1);

      // Yüz İfadeleri
      this._yuz_ciz(targetCtx, hx, hy, hr);

      // Şapka
      this._sapka_ciz(targetCtx, hx, hy, hr);

      // Eller & Ayaklar (Kutu Pikseller)
      targetCtx.fillStyle = col.ana;
      [p.footL, p.footR, p.handL, p.handR].forEach(pt => {
        const r = Math.round(pt.r);
        targetCtx.fillRect(Math.round(pt.x - r), Math.round(pt.y - r), r * 2, r * 2);
        targetCtx.strokeRect(Math.round(pt.x - r), Math.round(pt.y - r), r * 2, r * 2);
      });

      // Yumruk Parıltısı / Şarj Alevi
      if (this.sarj_t > 0.1) {
        const fist = this.facing === 1 ? p.handR : p.handL;
        targetCtx.fillStyle = C_YEL;
        targetCtx.fillRect(Math.round(fist.x - 3), Math.round(fist.y - 3), 6, 6);
      }
    }

    _yuz_ciz(targetCtx, hx, hy, hr) {
      if (this.ko || this.stun > 0) {
        // X_X Baygın Gözler
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 3, hy - 2, 1, 1); targetCtx.fillRect(hx - 2, hy - 1, 1, 1);
        targetCtx.fillRect(hx - 3, hy - 1, 1, 1); targetCtx.fillRect(hx - 2, hy - 2, 1, 1);
        targetCtx.fillRect(hx + 2, hy - 2, 1, 1); targetCtx.fillRect(hx + 3, hy - 1, 1, 1);
        targetCtx.fillRect(hx + 2, hy - 1, 1, 1); targetCtx.fillRect(hx + 3, hy - 2, 1, 1);
        return;
      }

      const yuz = this.karakter.yuz;
      const f = this.facing;

      if (yuz === "gözlük" || this.isAhmet) {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - hr + 1, hy - 2, hr * 2 - 1, 3);
        targetCtx.fillStyle = '#78dcf6';
        targetCtx.fillRect(hx - 2, hy - 2, 2, 1);
        targetCtx.fillRect(hx + 2, hy - 2, 2, 1);
      } else if (yuz === "gülen") {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 3, hy - 1, 2, 1);
        targetCtx.fillRect(hx + 2, hy - 1, 2, 1);
      } else {
        targetCtx.fillStyle = C_WHITE;
        targetCtx.fillRect(hx - 3, hy - 2, 3, 3);
        targetCtx.fillRect(hx + 1, hy - 2, 3, 3);
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 2 + f, hy - 1, 2, 2);
        targetCtx.fillRect(hx + 2 + f - 1, hy - 1, 2, 2);
      }

      // Kaşlar (Kızgın)
      if (yuz === "kızgın" || this.isAhmet) {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 3, hy - hr + 1, 2, 1);
        targetCtx.fillRect(hx + 2, hy - hr + 1, 2, 1);
      }
    }

    _sapka_ciz(targetCtx, hx, hy, hr) {
      const s = this.karakter.sapka;
      if (s === "kasket") {
        targetCtx.fillStyle = '#2d283e';
        targetCtx.fillRect(hx - hr - 1, hy - hr - 2, hr * 2 + 2, 3);
        targetCtx.fillRect(hx + (this.facing === 1 ? 0 : -hr - 2), hy - hr - 1, hr + 3, 2); // Siperlik
      } else if (s === "boynuz") {
        targetCtx.fillStyle = C_RED;
        targetCtx.fillRect(hx - hr, hy - hr - 3, 2, 3);
        targetCtx.fillRect(hx + hr - 2, hy - hr - 3, 2, 3);
      } else if (s === "taç") {
        targetCtx.fillStyle = C_YEL;
        targetCtx.fillRect(hx - hr, hy - hr - 3, hr * 2, 2);
        targetCtx.fillRect(hx - hr, hy - hr - 5, 2, 2);
        targetCtx.fillRect(hx - 1, hy - hr - 5, 2, 2);
        targetCtx.fillRect(hx + hr - 2, hy - hr - 5, 2, 2);
      } else if (s === "bandana") {
        targetCtx.fillStyle = C_RED;
        targetCtx.fillRect(hx - hr - 1, hy - hr + 1, hr * 2 + 2, 2);
      }
    }
  }

  /* =========================================================
     6. HARİTALAR VE SAHNE ÇİZİMLERİ (7 EFSANE ARENA)
  ========================================================= */
  const HARITALAR = {
    tv: { ad: "CNN TURK STUDYOSU", tema: "tv", zorluk: 2 },
    klasik: { ad: "KLASIK DOHYO", tema: "gece", zorluk: 1 },
    buz: { ad: "BUZUL ZIRVESI", tema: "kar", zorluk: 2 },
    kule: { ad: "IKIZ KULE", tema: "kule", zorluk: 3 },
    asansor: { ad: "SANAYI ASANSORU", tema: "sanayi", zorluk: 2 },
    ruzgar: { ad: "RUZGARLI TEPE", tema: "gunbatimi", zorluk: 2 },
    lav: { ad: "LAV KRATERI", tema: "volkan", zorluk: 3 }
  };

  const Sahne = {
    t: 0,
    shrinkAmount: 0,
    yildizlar: Array.from({ length: 25 }, () => ({ x: Math.random() * W, y: Math.random() * 80 })),
    kalabalik: Array.from({ length: 32 }, (_, i) => ({
      x: i * 10 + 4,
      y: 165,
      col: ['#72ce7e', '#ee6c60', '#5cc4e4', '#f6d660', '#b284ec'][i % 5]
    })),

    getEnv() {
      let platY = 130;
      let platW = 160;
      let buz = gameSettings.harita === "buz";
      let isLav = gameSettings.harita === "lav";
      let ruzgar_x = 0;

      if (gameSettings.harita === "asansor") {
        platY += Math.sin(this.t * 2.0) * 22; // Asansör salınımı
      }
      if (gameSettings.harita === "ruzgar") {
        ruzgar_x = Math.sin(this.t * 1.6) * 450; // Rüzgar fırtınası
      }

      const half = Math.max(26, platW * 0.5 - this.shrinkAmount);
      return {
        platY,
        platL: 160 - half,
        platR: 160 + half,
        buz,
        isLav,
        ruzgar_x
      };
    },

    ciz(targetCtx, env) {
      const h = gameSettings.harita;
      this.t += DT;

      // 1. Gökyüzü / Arka Plan
      if (h === "tv") {
        // Canlı Yayın Stüdyosu
        targetCtx.fillStyle = '#0a0d1a';
        targetCtx.fillRect(0, 0, W, H);

        // Stüdyo Işıkları
        targetCtx.fillStyle = 'rgba(0, 219, 255, 0.08)';
        targetCtx.beginPath();
        targetCtx.moveTo(60, 0); targetCtx.lineTo(20, env.platY); targetCtx.lineTo(140, env.platY); targetCtx.closePath();
        targetCtx.fill();
        targetCtx.fillStyle = 'rgba(255, 23, 68, 0.08)';
        targetCtx.beginPath();
        targetCtx.moveTo(260, 0); targetCtx.lineTo(180, env.platY); targetCtx.lineTo(300, env.platY); targetCtx.closePath();
        targetCtx.fill();

        // Kayan Canlı Yayın Bandı
        targetCtx.fillStyle = '#b71c1c';
        targetCtx.fillRect(0, 16, W, 10);
        const shift = Math.round((this.t * 30) % 240);
        drawPixelText(targetCtx, "SON DAKIKA: AHMET HAKAN ILE TARAFSIZ BOLGE SUMO ARENASI CANLI YAYINDA", W - shift, 19, C_WHITE, 1);
      } else if (h === "kar" || h === "buz") {
        // Buzul / Kar
        targetCtx.fillStyle = '#1e2e4c';
        targetCtx.fillRect(0, 0, W, H);
        targetCtx.fillStyle = '#5c789a';
        targetCtx.beginPath();
        targetCtx.moveTo(0, 120); targetCtx.lineTo(60, 80); targetCtx.lineTo(130, 120); targetCtx.lineTo(220, 70); targetCtx.lineTo(320, 120); targetCtx.lineTo(320, H); targetCtx.lineTo(0, H);
        targetCtx.fill();
      } else if (h === "lav") {
        // Volkan
        targetCtx.fillStyle = '#1a0808';
        targetCtx.fillRect(0, 0, W, H);
        targetCtx.fillStyle = '#ff3d00';
        targetCtx.fillRect(0, H - 24, W, 24);
      } else {
        // Gece / Klasik
        targetCtx.fillStyle = '#100e20';
        targetCtx.fillRect(0, 0, W, H);
        // Yıldızlar
        this.yildizlar.forEach(s => {
          targetCtx.fillStyle = '#9492ad';
          targetCtx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        });
        // Ay
        targetCtx.fillStyle = '#fce490';
        targetCtx.beginPath();
        targetCtx.arc(270, 30, 10, 0, Math.PI * 2);
        targetCtx.fill();
      }

      // Seyirciler (Alt Kısım)
      this.kalabalik.forEach(k => {
        const bob = Math.sin(this.t * 4 + k.x) * 2;
        targetCtx.fillStyle = k.col;
        targetCtx.fillRect(k.x, k.y + bob, 4, 6);
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(k.x + 1, k.y + bob - 2, 2, 2);
      });

      // 2. Platform Zemini
      const y = Math.round(env.platY);
      const l = Math.round(env.platL);
      const r = Math.round(env.platR);
      const w = r - l;

      if (h === "tv") {
        // Cam Yayın Masası
        targetCtx.fillStyle = '#0f172a';
        targetCtx.fillRect(l, y, w, 18);
        targetCtx.fillStyle = '#00dbff';
        targetCtx.fillRect(l, y, w, 2);
      } else if (h === "buz") {
        targetCtx.fillStyle = C_ICE;
        targetCtx.fillRect(l, y, w, 16);
        targetCtx.fillStyle = '#fff';
        targetCtx.fillRect(l, y, w, 2);
      } else {
        // Dohyo Kum ve Çim
        targetCtx.fillStyle = C_TOPRAK;
        targetCtx.fillRect(l, y, w, 16);
        targetCtx.fillStyle = C_CIM;
        targetCtx.fillRect(l, y, w, 2);
      }

      // Ani Daralma Alarmı
      if (this.shrinkAmount > 0) {
        if (Math.sin(this.t * 16) > 0) {
          targetCtx.fillStyle = C_RED;
          targetCtx.fillRect(l, y, 4, 16);
          targetCtx.fillRect(r - 4, y, 4, 16);
        }
      }
    }
  };

  /* =========================================================
     7. EFEKTLER (PARTİKÜLLER & METİN POPUPLARI)
  ========================================================= */
  const particles = [];
  const popups = [];

  function spawnSpark(x, y, color = C_YEL) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80 - 20,
      color,
      life: 0.3
    });
  }

  function spawnDust(x, y) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 30,
      vy: -Math.random() * 15,
      color: '#a09880',
      life: 0.25
    });
  }

  function spawnPopup(x, y, text, color = C_WHITE) {
    popups.push({ x, y, text, color, vy: -20, life: 0.8 });
  }

  function triggerMemePopup(text) {
    const el = document.getElementById('meme-banner');
    const txt = document.getElementById('meme-text');
    if (!el || !txt) return;
    txt.textContent = text;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'memePop 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  }

  /* =========================================================
     8. OYUN YÖNETİCİSİ VE DURUMLAR (MENU, MAC, KO, AYARLAR)
  ========================================================= */
  const MENU = 0, MAC = 1, KO_DURUM = 2, KARAKTER_SEC = 3, HARITA_SEC = 4, AYARLAR_SEC = 5;
  let oyunDurumu = MENU;
  let menuSecim = 0;
  const MENU_OGELERI = ["2 KISILIK OYNA", "YAPAY ZEKA (vs CPU)", "ONLINE 1v1", "KARAKTER SEC", "HARITALAR", "AYARLAR"];

  // Dövüşçüler
  let p1 = new Ragdoll(110, 110, gameSettings.k1, true);
  let p2 = new Ragdoll(210, 110, gameSettings.k2, false);

  let skor1 = 0;
  let skor2 = 0;
  let tur = 1;
  let macSuresi = 0;
  let geriSayim = 3;
  let geriSayimTimer = 0;
  let slowMo = 1.0;
  let kazanan = null;

  // Tuş Takibi
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    AudioEngine.init();

    if (oyunDurumu === MENU) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        AudioEngine.select();
        menuSecim = (menuSecim - 1 + MENU_OGELERI.length) % MENU_OGELERI.length;
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        AudioEngine.select();
        menuSecim = (menuSecim + 1) % MENU_OGELERI.length;
      } else if (e.code === 'Enter' || e.code === 'Space') {
        menuOnayla();
      }
    } else if (oyunDurumu === KO_DURUM) {
      if (e.code === 'Enter' || e.code === 'Space') sonrakiTur();
      else if (e.code === 'KeyR') maciSifirla();
      else if (e.code === 'Escape') oyunDurumu = MENU;
    } else if (oyunDurumu === MAC) {
      if (e.code === 'Escape') oyunDurumu = MENU;
    }
  });

  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Menü Seçim Yönlendirici
  function menuOnayla() {
    AudioEngine.select();
    if (menuSecim === 0) {
      gameSettings.cpu_ile = false;
      maciBaslat();
    } else if (menuSecim === 1) {
      gameSettings.cpu_ile = true;
      maciBaslat();
    } else if (menuSecim === 2) {
      gameSettings.cpu_ile = false;
      initOnlineWS();
      maciBaslat();
    } else if (menuSecim === 3) {
      document.getElementById('settings-modal')?.classList.remove('hidden');
    } else if (menuSecim === 4) {
      document.getElementById('settings-modal')?.classList.remove('hidden');
    } else if (menuSecim === 5) {
      document.getElementById('settings-modal')?.classList.remove('hidden');
    }
  }

  function maciBaslat() {
    oyunDurumu = MAC;
    skor1 = 0; skor2 = 0; tur = 1;
    turBaslat();
  }

  function maciSifirla() {
    skor1 = 0; skor2 = 0; tur = 1;
    turBaslat();
  }

  function turBaslat() {
    oyunDurumu = MAC;
    macSuresi = 0;
    Sahne.shrinkAmount = 0;
    slowMo = 1.0;
    geriSayim = 3;
    geriSayimTimer = 0;

    p1 = new Ragdoll(110, 100, gameSettings.k1, true);
    p2 = new Ragdoll(210, 100, gameSettings.k2, false);

    // DOM UI güncelle
    const p1Sc = document.getElementById('p1-score');
    const p2Sc = document.getElementById('p2-score');
    const rnd = document.getElementById('round-indicator');
    if (p1Sc) p1Sc.textContent = skor1;
    if (p2Sc) p2Sc.textContent = skor2;
    if (rnd) rnd.textContent = `TUR ${tur}`;
    document.getElementById('ko-modal')?.classList.add('hidden');
  }

  function sonrakiTur() {
    tur++;
    turBaslat();
  }

  function handleKO(kurban) {
    AudioEngine.ko();
    slowMo = 0.35;
    kazanan = kurban === p1 ? "P2" : "P1";
    if (kazanan === "P1") skor1++;
    else skor2++;

    document.getElementById('p1-score').textContent = skor1;
    document.getElementById('p2-score').textContent = skor2;

    setTimeout(() => {
      oyunDurumu = KO_DURUM;
      const koModal = document.getElementById('ko-modal');
      const koTitle = document.getElementById('ko-title');
      const koSub = document.getElementById('ko-subtitle');
      if (koModal && koTitle && koSub) {
        koModal.classList.remove('hidden');
        if (kazanan === "P1") {
          koTitle.textContent = "🏆 AHMET HAKAN KAZANDI!";
          koSub.textContent = "Tarafsız Bölge masasını yumrukladı, rakibi yayından uçurdu!";
        } else {
          koTitle.textContent = "🏆 RAKİP SUMO KAZANDI!";
          koSub.textContent = "Geleneksel Kutu Sumo ustası ringin hakimi oldu!";
        }
      }
    }, 800);
  }

  /* =========================================================
     9. KONTROLLER & YAPAY ZEKA
  ========================================================= */
  function getP1Ctrl() {
    return {
      left: keys['KeyA'],
      right: keys['KeyD'],
      jump: keys['KeyW'],
      block: keys['KeyS'],
      punch: keys['Space'],
      super: keys['KeyQ'] || keys['KeyE']
    };
  }

  function getP2Ctrl() {
    if (gameSettings.cpu_ile) {
      // Akıllı Sumo AI
      const dx = p1.center.x - p2.center.x;
      const dist = Math.abs(dx);
      const isZor = gameSettings.cpu_zorluk === "ZOR";

      return {
        left: dx < -15,
        right: dx > 15,
        jump: p1.center.y < p2.center.y - 20 || (dist < 40 && Math.random() < 0.04),
        block: dist < 22 && Math.random() < (isZor ? 0.6 : 0.3),
        punch: dist < 36 && Math.random() < (isZor ? 0.7 : 0.4),
        super: p2.superMeter >= 100 && dist < 50
      };
    }
    return {
      left: keys['ArrowLeft'],
      right: keys['ArrowRight'],
      jump: keys['ArrowUp'],
      block: keys['ArrowDown'],
      punch: keys['Enter'] || keys['Numpad0'],
      super: keys['ShiftRight'] || keys['ControlRight']
    };
  }

  /* =========================================================
     10. DÖVÜŞ VURUŞ ÇARPIŞMALARI
  ========================================================= */
  function vurusKontrol(saldiran, kurban) {
    if (saldiran.punch_timer <= 0) return;
    const yumruk = saldiran.facing === 1 ? saldiran.parts.handR : saldiran.parts.handL;

    for (const k in kurban.parts) {
      const hedef = kurban.parts[k];
      const d = Math.hypot(yumruk.x - hedef.x, yumruk.y - hedef.y);
      if (d < yumruk.r + hedef.r + 3.0) {
        saldiran.punch_timer = 0; // Yumruk isabet etti
        const guc = saldiran.punch_guc;

        if (guc > 1.2) AudioEngine.big();
        else AudioEngine.hit();

        const savrulma = (saldiran.facing * PUNCH_KNOCK * guc) * (kurban.brace ? 0.35 : 1.0);
        for (const pk in kurban.parts) {
          kurban.parts[pk].add_vel(savrulma, -60 * guc);
        }

        kurban.stun = kurban.brace ? 0.08 : (guc > 1.2 ? 0.52 : 0.30);
        saldiran.superMeter = Math.min(100, saldiran.superMeter + (guc > 1.2 ? 35 : 18));

        spawnPopup(yumruk.x, yumruk.y - 12, guc > 1.2 ? "GÜÜÜM! 💥" : "POW! 🥊", guc > 1.2 ? C_YEL : C_WHITE);
        for (let i = 0; i < 6; i++) spawnSpark(yumruk.x, yumruk.y, C_YEL);
        break;
      }
    }
  }

  /* =========================================================
     11. ONLINE WEBSOCKET ÇOK OYUNCULU DESTEĞİ
  ========================================================= */
  let ws = null;
  function initOnlineWS() {
    if (ws) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'sumo' }));
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'sumo_sync' && p2) {
          p2.parts.head.x = data.x;
          p2.parts.head.y = data.y;
        }
      } catch (_) {}
    };
  }

  /* =========================================================
     12. CANVAS ÇİZİM VE ANA DÖNGÜ (60 FPS)
  ========================================================= */
  const canvas = document.getElementById('sumo-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  function oyunDongusu() {
    requestAnimationFrame(oyunDongusu);

    const env = Sahne.getEnv();

    // 1. Menü Durumu (Arkada 2 AI Canlı Dövüşür!)
    if (oyunDurumu === MENU) {
      // Arka Planda Canlı Dövüşen AI Ragdolls
      const ai1Ctrl = {
        left: p2.center.x < p1.center.x - 10,
        right: p2.center.x > p1.center.x + 10,
        jump: Math.random() < 0.04,
        block: Math.random() < 0.1,
        punch: Math.random() < 0.25,
        super: false
      };
      const ai2Ctrl = {
        left: p1.center.x < p2.center.x - 10,
        right: p1.center.x > p2.center.x + 10,
        jump: Math.random() < 0.04,
        block: Math.random() < 0.1,
        punch: Math.random() < 0.25,
        super: false
      };

      p1.girdi(ai1Ctrl, p2, DT, env);
      p2.girdi(ai2Ctrl, p1, DT, env);

      p1.entegre(DT, env); p2.entegre(DT, env);
      for (let s = 0; s < SUBSTEPS; s++) { p1.kisitlari_coz(); p2.kisitlari_coz(); }
      p1.zemin_carp(env); p2.zemin_carp(env);
      vurusKontrol(p1, p2); vurusKontrol(p2, p1);

      // Sahne Çiz
      ctx.clearRect(0, 0, W, H);
      Sahne.ciz(ctx, env);
      p1.ciz(ctx); p2.ciz(ctx);

      // Karartma Katmanı
      ctx.fillStyle = 'rgba(10, 8, 18, 0.78)';
      ctx.fillRect(0, 0, W, H);

      // Menü Başlığı (Retro Piksel Sanatı)
      drawPixelText(ctx, "AHMET HAKAN", 160, 24, C_YEL, 2, 'center');
      drawPixelText(ctx, "KUTU SUMO ARENASI", 160, 40, C_WHITE, 1, 'center');

      // Menü Öğeleri
      for (let i = 0; i < MENU_OGELERI.length; i++) {
        const secili = i === menuSecim;
        const my = 64 + i * 15;
        const etiket = (secili ? "> " : "  ") + MENU_OGELERI[i] + (secili ? " <" : "");
        drawPixelText(ctx, etiket, 160, my, secili ? C_YEL : UI_YAZI, 1, 'center');
      }

      drawPixelText(ctx, "SEC: YUKARI/ASAGI  ONAYLA: ENTER / SPACE", 160, 165, '#88849c', 1, 'center');
      return;
    }

    // 2. Maç / KO Durumu
    let dt = DT * slowMo;
    macSuresi += dt;

    if (macSuresi > 22.0) {
      Sahne.shrinkAmount += dt * 4.0; // Platform erimesi (Sudden death)
    }

    // Geri Sayım
    if (geriSayim > 0) {
      geriSayimTimer += dt;
      if (geriSayimTimer >= 0.75) {
        geriSayimTimer = 0;
        geriSayim--;
        if (geriSayim > 0) AudioEngine.select();
        else AudioEngine.super();
      }
    }

    // Oyuncu Girdileri
    if (geriSayim === 0 && !p1.ko && !p2.ko) {
      p1.girdi(getP1Ctrl(), p2, dt, env);
      p2.girdi(getP2Ctrl(), p1, dt, env);
    }

    // Fizik Adımı
    p1.entegre(dt, env);
    p2.entegre(dt, env);
    for (let s = 0; s < SUBSTEPS; s++) {
      p1.kisitlari_coz();
      p2.kisitlari_coz();
    }
    p1.zemin_carp(env);
    p2.zemin_carp(env);

    // Çarpışma ve Hasar
    if (geriSayim === 0) {
      vurusKontrol(p1, p2);
      vurusKontrol(p2, p1);
    }

    // Çizim
    ctx.clearRect(0, 0, W, H);
    Sahne.ciz(ctx, env);
    p1.ciz(ctx);
    p2.ciz(ctx);

    // Partiküller
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      if (pt.life <= 0) particles.splice(i, 1);
      else {
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      }
    }

    // Metin Popupları (POW, GÜM!)
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.life -= dt;
      pop.y += pop.vy * dt;
      if (pop.life <= 0) popups.splice(i, 1);
      else {
        drawPixelText(ctx, pop.text, Math.round(pop.x), Math.round(pop.y), pop.color, 1, 'center');
      }
    }

    // Geri Sayım Ekrana Yazma
    if (geriSayim > 0) {
      drawPixelText(ctx, String(geriSayim), 160, 68, C_YEL, 3, 'center');
    } else if (macSuresi < 1.0) {
      drawPixelText(ctx, "BASLA!", 160, 70, C_RED, 2, 'center');
    }

    // HUD Skor Çizgisi
    drawPixelText(ctx, `${gameSettings.k1.ad}: ${skor1}`, 10, 6, C_RED, 1);
    drawPixelText(ctx, `${gameSettings.k2.ad}: ${skor2}`, W - 10, 6, '#5cc4e4', 1, 'right');

    // Süper Güç Barları
    const p1Fill = document.getElementById('p1-super-fill');
    const p2Fill = document.getElementById('p2-super-fill');
    if (p1Fill) p1Fill.style.width = `${p1.superMeter}%`;
    if (p2Fill) p2Fill.style.width = `${p2.superMeter}%`;
  }

  // UI Düğmeleri
  document.getElementById('btn-next-round')?.addEventListener('click', sonrakiTur);
  document.getElementById('btn-restart-match')?.addEventListener('click', maciSifirla);
  document.getElementById('btn-choose-map')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.remove('hidden');
  });

  // Modal Kontrolleri
  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.add('hidden');
  });

  document.querySelectorAll('.map-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.map-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      gameSettings.harita = card.dataset.map;
      const el = document.getElementById('current-map-name');
      if (el) el.textContent = HARITALAR[gameSettings.harita]?.ad || 'ARENA';
    });
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    gameSettings.yer_cekim = document.getElementById('sel-gravity')?.value || 'NORMAL';
    gameSettings.tur_sayisi = parseInt(document.getElementById('sel-rounds')?.value || '3');
    gameSettings.cpu_zorluk = document.getElementById('sel-ai-diff')?.value || 'NORMAL';
    document.getElementById('settings-modal')?.classList.add('hidden');
    maciSifirla();
  });

  // Mod Seçiciler
  document.getElementById('btn-mode-local')?.addEventListener('click', () => {
    gameSettings.cpu_ile = false;
    maciBaslat();
  });
  document.getElementById('btn-mode-ai')?.addEventListener('click', () => {
    gameSettings.cpu_ile = true;
    maciBaslat();
  });
  document.getElementById('btn-mode-online')?.addEventListener('click', () => {
    gameSettings.cpu_ile = false;
    initOnlineWS();
    maciBaslat();
  });

  // Başlat
  turBaslat();
  oyunDongusu();
})();
