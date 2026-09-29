// sumo.js - AHMET HAKAN: KUTU SUMO -- 2 Kişilik & AI Ragdoll Fizikli Piksel Dövüş Oyunu
// 100% Desktop AhmetHakanSumoOyun.py Birebir Aynısı + Üst Düzey Geliştirilmiş Sistemler
// 👑 Yapımcılar: Ahmet Baki ve Hakan Samet
(function () {
  'use strict';

  /* =========================================================
     1. SABİTLER, PİKSEL EKRAN VE TEMEL FİZİK
  ========================================================= */
  const W = 320;
  const H = 180;
  const FPS = 60;
  const DT = 1.0 / FPS;
  const SUBSTEPS = 2;

  // Fizik Çekirdeği (AhmetHakanSumoOyun.py ile birebir)
  const GRAVITY = 820.0;
  const DAMP = 0.995;
  const HARD_VX = 300.0;
  const HARD_VY = 470.0;
  const BOUNCE = 0.14;
  const GROUND_FRIC = 0.76;
  const ICE_FRIC = 0.985;
  const SHRINK_SPEED = 2.4;
  const MIN_HALF_W = 24.0;
  const KO_Y = 178;

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

  // Yumruk & Dövüş Mekaniği
  const PUNCH_DRIVE = 2600.0;
  const PUNCH_REACH = 1.75;
  const PUNCH_ACTIVE = 0.22;
  const PUNCH_KNOCK = 132.0;
  const PUNCH_LUNGE = 105.0;
  const PUNCH_CD = 0.40;
  const CHARGE_TIME = 0.42;
  const CHARGE_POWER = 1.65;
  const BRACE_STIFF = 2.4;

  // Renk Paleti (Desktop AhmetHakanSumoOyun.py Orijinal Paleti)
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
    ince:   { ad: "İNCE",   govde: 4.4, kafa: 3.6, uzuv: 2.8, kalca: 9.4,  kutle: 0.82, sertlik: 0.95 },
    normal: { ad: "NORMAL", govde: 5.0, kafa: 4.0, uzuv: 3.0, kalca: 9.0,  kutle: 1.0,  sertlik: 1.0 },
    tombul: { ad: "TOMBUL", govde: 5.9, kafa: 4.3, uzuv: 3.3, kalca: 8.3,  kutle: 1.28, sertlik: 1.08 }
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
     2. 3x5 PİKSEL YAZI TİPİ MOTORU
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

  const TR_MAP = {
    "Ç": "C", "Ğ": "G", "İ": "I", "I": "I", "Ö": "O", "Ş": "S", "Ü": "U",
    "ç": "C", "ğ": "G", "ı": "I", "i": "I", "ö": "O", "ş": "S", "ü": "U"
  };

  function drawPixelText(targetCtx, str, x, y, color = C_WHITE, scale = 1, align = 'left') {
    str = String(str).toUpperCase();
    let s = "";
    for (let i = 0; i < str.length; i++) s += TR_MAP[str[i]] || str[i];
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
     3. 8-BİT RETRO SES MOTORU (Desktop numpy ile aynı)
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
    blip() { this.playTone(660, 660, 'square', 0.07, 0.18); },
    go() { this.playTone(420, 900, 'square', 0.22, 0.28); },
    win() { this.playTone(300, 900, 'square', 0.55, 0.28); },
    select() { this.playTone(520, 760, 'square', 0.06, 0.16); },
    sarj() { this.playTone(300, 700, 'square', 0.35, 0.18); },
    super() { this.playNoise(0.35, 0.5); this.playTone(350, 900, 'square', 0.3, 0.4); },
    lav() { this.playTone(90, 60, 'triangle', 0.5, 0.25); },
    ruzgar() { this.playNoise(0.4, 0.2); }
  };

  /* =========================================================
     4. KARAKTER & OYUN AYARLARI
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

  const savedUser = localStorage.getItem('portal_username') || 'AHMET HAKAN';
  const gameSettings = {
    harita: "tv", // tv, klasik, buz, kule, asansor, ruzgar, lav
    tur_sayisi: 3,
    cpu_zorluk: "NORMAL",
    yer_cekim: "NORMAL",
    cpu_ile: false,
    ses: true,
    efekt: "NORMAL",
    k1: new Karakter(savedUser, 5, "kasket", "gözlük", "normal"),
    k2: new Karakter("KUTU SUMO", 1, "boynuz", "kızgın", "tombul")
  };

  /* =========================================================
     5. İSKELET VE VERLET RAGDOLL FİZİK MOTORU
  ========================================================= */
  function iskeletKur(gv) {
    const t = gv.govde;
    const hf = gv.kafa;
    const uz = gv.uzuv;
    const k = gv.kutle;

    const ofs = {
      tl:    { x: -t, y: -t },
      tr:    { x: t, y: -t },
      br:    { x: t, y: t },
      bl:    { x: -t, y: t },
      head:  { x: 0.0, y: -t - hf - 1.2 },
      handL: { x: -t - uz * 2 - 1.4, y: -1.0 },
      handR: { x: t + uz * 2 + 1.4, y: -1.0 },
      footL: { x: -t * 0.9, y: gv.kalca },
      footR: { x: t * 0.9, y: gv.kalca }
    };

    const yar = {
      tl: t * 0.66, tr: t * 0.66, br: t * 0.70, bl: t * 0.70,
      head: hf, handL: uz, handR: uz, footL: uz, footR: uz
    };

    const kut = {
      tl: 2.2 * k, tr: 2.2 * k, br: 2.6 * k, bl: 2.6 * k, head: 2.0 * k,
      handL: 1.0 * k, handR: 1.0 * k, footL: 1.25 * k, footR: 1.25 * k
    };

    return { ofs, yar, kut };
  }

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
    constructor(a, b, tur, rest, stiff = 1.0) {
      this.a = a;
      this.b = b;
      this.tur = tur;
      this.rest = rest !== undefined ? rest : Math.hypot(a.x - b.x, a.y - b.y);
      this.stiff = stiff;
    }
  }

  class Ragdoll {
    constructor(x, y, karakter, isAhmet = false) {
      this.karakter = karakter;
      this.isAhmet = isAhmet;
      this.gv = karakter.body;
      const isk = iskeletKur(this.gv);
      this.isk = isk;

      this.parts = {};
      for (const k in isk.ofs) {
        this.parts[k] = new Parcacik(
          x + isk.ofs[k].x,
          y + isk.ofs[k].y,
          isk.yar[k],
          isk.kut[k],
          k
        );
      }

      const p = this.parts;
      const kSert = this.gv.sertlik;

      // Kemik Çubukları (AhmetHakanSumoOyun.py ile birebir)
      this.sticks = [
        new Baglanti(p.tl, p.tr, "govde", Math.hypot(isk.ofs.tl.x - isk.ofs.tr.x, isk.ofs.tl.y - isk.ofs.tr.y), Math.min(1.0, 1.0 * kSert)),
        new Baglanti(p.tr, p.br, "govde", Math.hypot(isk.ofs.tr.x - isk.ofs.br.x, isk.ofs.tr.y - isk.ofs.br.y), Math.min(1.0, 1.0 * kSert)),
        new Baglanti(p.br, p.bl, "govde", Math.hypot(isk.ofs.br.x - isk.ofs.bl.x, isk.ofs.br.y - isk.ofs.bl.y), Math.min(1.0, 1.0 * kSert)),
        new Baglanti(p.bl, p.tl, "govde", Math.hypot(isk.ofs.bl.x - isk.ofs.tl.x, isk.ofs.bl.y - isk.ofs.tl.y), Math.min(1.0, 1.0 * kSert)),
        new Baglanti(p.tl, p.br, "capraz", Math.hypot(isk.ofs.tl.x - isk.ofs.br.x, isk.ofs.tl.y - isk.ofs.br.y), Math.min(1.0, 1.0 * kSert)),
        new Baglanti(p.tr, p.bl, "capraz", Math.hypot(isk.ofs.tr.x - isk.ofs.bl.x, isk.ofs.tr.y - isk.ofs.bl.y), Math.min(1.0, 1.0 * kSert)),
        new Baglanti(p.head, p.tl, "boyun", Math.hypot(isk.ofs.head.x - isk.ofs.tl.x, isk.ofs.head.y - isk.ofs.tl.y) * 0.93, Math.min(1.0, 0.95 * kSert)),
        new Baglanti(p.head, p.tr, "boyun", Math.hypot(isk.ofs.head.x - isk.ofs.tr.x, isk.ofs.head.y - isk.ofs.tr.y) * 0.93, Math.min(1.0, 0.95 * kSert)),
        new Baglanti(p.handL, p.tl, "kol", Math.hypot(isk.ofs.handL.x - isk.ofs.tl.x, isk.ofs.handL.y - isk.ofs.tl.y), Math.min(1.0, 0.34 * kSert)),
        new Baglanti(p.handR, p.tr, "kol", Math.hypot(isk.ofs.handR.x - isk.ofs.tr.x, isk.ofs.handR.y - isk.ofs.tr.y), Math.min(1.0, 0.34 * kSert)),
        new Baglanti(p.footL, p.bl, "bacak", Math.hypot(isk.ofs.footL.x - isk.ofs.bl.x, isk.ofs.footL.y - isk.ofs.bl.y), Math.min(1.0, 0.55 * kSert)),
        new Baglanti(p.footR, p.br, "bacak", Math.hypot(isk.ofs.footR.x - isk.ofs.br.x, isk.ofs.footR.y - isk.ofs.br.y), Math.min(1.0, 0.55 * kSert))
      ];

      this.facing = 1;
      this.stun = 0;
      this.punch_cd = 0;
      this.jump_cd = 0;
      this.brace = false;
      this.arm_kick = 0;
      this.punch_timer = 0;
      this.punch_guc = 1.0;
      this.punch_sarjli = false;
      this.sarj_t = 0;
      this.sarj_kullanildi = false;
      this.stiff_mult = 1.0;
      this.leg_soft = 1.0;
      this.coyote = 0;
      this.jump_buf = 0;
      this.blink = 2.0;
      this.eyes_shut = 0;
      this.dizzy = 0;
      this.ko = false;
      this.superMeter = 0;
      this.land_timer = 0;
      this.onceki_tilt = 0;
    }

    get center() {
      const p = this.parts;
      return {
        x: (p.tl.x + p.tr.x + p.bl.x + p.br.x) * 0.25,
        y: (p.tl.y + p.tr.y + p.bl.y + p.br.y) * 0.25
      };
    }

    get grounded() {
      return this.parts.footL.grounded || this.parts.footR.grounded;
    }

    girdi(ctrl, foe, dt, env) {
      if (this.ko) return;
      const p = this.parts;
      const yerde = this.grounded;

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
        triggerMemePopup(AHMET_QUOTES[Math.floor(Math.random() * AHMET_QUOTES.length)]);
        spawnPopup(c.x, c.y - 20, "TARAFSIZ BÖLGE! 💥", C_RED);
        const fc = foe.center;
        const dx = fc.x - c.x;
        const push = 280.0;
        for (const k in foe.parts) {
          foe.parts[k].add_vel((dx > 0 ? 1 : -1) * push, -180.0);
        }
        foe.stun = 0.6;
        for (let i = 0; i < 20; i++) spawnSpark(c.x, c.y, C_RED);
      } else {
        triggerMemePopup("MEGA SUMO İTİŞİ!");
        spawnPopup(c.x, c.y - 20, "GÖBEK DARBESİ! 🐲", "#2979ff");
        for (const k in foe.parts) {
          foe.parts[k].add_vel(this.facing * 300.0, -150.0);
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
          rest = s.rest * PUNCH_REACH; // Kol uzaması
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

    zemin_carp(zeminler, env) {
      const p = this.parts;

      for (const k in p) {
        const q = p[k];
        q.grounded = false;

        for (let i = 0; i < zeminler.length; i++) {
          const z = zeminler[i];
          const rx = z.x, ry = z.y, rw = z.w, rh = z.h;

          if (q.x + q.r < rx || q.x - q.r > rx + rw ||
              q.y + q.r < ry || q.y - q.r > ry + rh) {
            continue;
          }

          const sol = (q.x + q.r) - rx;
          const sag = (rx + rw) - (q.x - q.r);
          const ust = (q.y + q.r) - ry;
          const alt = (ry + rh) - (q.y - q.r);
          const m = Math.min(sol, sag, ust, alt);

          const vx = q.vx_sn * DT;
          const vy = q.vy_sn * DT;
          const fric = z.fric;

          if (m === ust) {
            q.y = ry - q.r;
            q.grounded = true;
            if (z.vx) q.x += z.vx * DT;
            q.px = q.x - (vx * fric + z.vx * DT);
            if (z.vy < -1) q.py = q.y; // Yukarı çıkan platform
            if (vy > 12 * DT) {
              q.py = q.y + vy * (z.kind === "buz" ? BOUNCE * 0.6 : BOUNCE);
              if (vy > 90 * DT) {
                spawnDust(q.x, q.y + q.r);
                if ((q.kind === "footL" || q.kind === "footR") && vy > 150 * DT) {
                  AudioEngine.land();
                }
              }
            } else if (vy > 0) {
              q.py = q.y;
            }
          } else if (m === alt) {
            q.y = ry + rh + q.r;
            q.py = q.y + vy * 0.2;
          } else if (m === sol) {
            q.x = rx - q.r;
            q.px = q.x + vx * 0.25;
          } else {
            q.x = rx + rw + q.r;
            q.px = q.x + vx * 0.25;
          }
        }

        // Lav Teması (Volkanik Arenada)
        if (env.lav_y !== null && q.y >= env.lav_y && !this.ko) {
          AudioEngine.lav();
          q.add_vel(0, -380.0);
          for (let s = 0; s < 12; s++) spawnSpark(q.x, q.y, C_ORANGE);
          this.ko = true;
          handleKO(this);
        }

        // Uçuruma Düşüş (KO)
        if (q.y > H + 28 && !this.ko) {
          this.ko = true;
          handleKO(this);
        }
      }
    }

    ciz(targetCtx) {
      const p = this.parts;
      const col = this.karakter.colors;

      // 1. Uzuv Bağlantı Çizgileri
      targetCtx.lineWidth = 3;
      targetCtx.strokeStyle = col.koyu;

      const mSolX = (p.tl.x + p.bl.x) * 0.5, mSolY = (p.tl.y + p.bl.y) * 0.5;
      targetCtx.beginPath();
      targetCtx.moveTo(mSolX, mSolY); targetCtx.lineTo(p.handL.x, p.handL.y);
      targetCtx.moveTo(p.bl.x, p.bl.y); targetCtx.lineTo(p.footL.x, p.footL.y);
      targetCtx.stroke();

      const mSagX = (p.tr.x + p.br.x) * 0.5, mSagY = (p.tr.y + p.br.y) * 0.5;
      targetCtx.beginPath();
      targetCtx.moveTo(mSagX, mSagY); targetCtx.lineTo(p.handR.x, p.handR.y);
      targetCtx.moveTo(p.br.x, p.br.y); targetCtx.lineTo(p.footR.x, p.footR.y);
      targetCtx.stroke();

      // 2. Gövde Poligonu (Torso)
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

      // Takım Elbise Kravatı (Ahmet Hakan İmzası)
      if (this.isAhmet) {
        const mx = (p.tl.x + p.tr.x) * 0.5, my = (p.tl.y + p.tr.y) * 0.5;
        targetCtx.fillStyle = C_WHITE;
        targetCtx.fillRect(mx - 2, my, 4, 3);
        targetCtx.fillStyle = C_RED;
        targetCtx.fillRect(mx - 1, my + 2, 2, 8);
      }

      // 3. Kafa Kutusu
      const hx = Math.round(p.head.x), hy = Math.round(p.head.y), hr = Math.round(p.head.r);
      targetCtx.fillStyle = col.ana;
      targetCtx.fillRect(hx - hr, hy - hr, hr * 2 + 1, hr * 2 + 1);
      targetCtx.strokeStyle = col.koyu;
      targetCtx.strokeRect(hx - hr, hy - hr, hr * 2 + 1, hr * 2 + 1);

      // Yüz İfadesi
      this._yuz_ciz(targetCtx, hx, hy, hr);

      // Şapka / Aksesuar
      this._sapka_ciz(targetCtx, hx, hy, hr);

      // 4. Eller ve Ayaklar
      targetCtx.fillStyle = col.ana;
      [p.footL, p.footR, p.handL, p.handR].forEach(pt => {
        const r = Math.round(pt.r);
        targetCtx.fillRect(Math.round(pt.x - r), Math.round(pt.y - r), r * 2, r * 2);
        targetCtx.strokeRect(Math.round(pt.x - r), Math.round(pt.y - r), r * 2, r * 2);
      });

      // Yumruk / Şarj Alevi
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
        targetCtx.fillStyle = '#e86e82';
        targetCtx.fillRect(hx, hy + 1, 2, 2);
        return;
      }

      // Göz Kırpma Zamanlayıcısı
      this.blink -= DT;
      if (this.blink < 0) {
        this.blink = Math.random() * 3.3 + 1.2;
        this.eyes_shut = 0.12;
      }
      if (this.eyes_shut > 0) this.eyes_shut -= DT;

      const kapali = this.eyes_shut > 0;
      const yuz = this.karakter.yuz;
      const f = this.facing;

      if (yuz === "gülen" || kapali) {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 3, hy - 1, 2, 1);
        targetCtx.fillRect(hx - 3, hy - 2, 1, 1);
        targetCtx.fillRect(hx + 2, hy - 1, 2, 1);
        targetCtx.fillRect(hx + 3, hy - 2, 1, 1);
      } else if (yuz === "gözlük" || this.isAhmet) {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - hr + 1, hy - 2, hr * 2 - 1, 3);
        targetCtx.fillStyle = '#78dcf6';
        targetCtx.fillRect(hx - 2, hy - 2, 2, 1);
        targetCtx.fillRect(hx + 2, hy - 2, 2, 1);
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
        targetCtx.fillRect(hx - 1, hy - hr, 1, 1);
        targetCtx.fillRect(hx + 1, hy - hr, 1, 1);
      }

      // Ağız & Bıyık
      if (this.brace) {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 1, hy + 2, 3, 1);
      } else if (yuz === "gülen") {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 1, hy + 1, 3, 1);
        targetCtx.fillRect(hx - 2, hy + 2, 1, 1);
        targetCtx.fillRect(hx + 2, hy + 2, 1, 1);
      } else {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 1, hy + 2, 2, 1);
      }

      if (yuz === "bıyık") {
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - 3, hy + 1, 6, 2);
      }
    }

    _sapka_ciz(targetCtx, hx, hy, hr) {
      const s = this.karakter.sapka;
      if (s === "yok") return;
      const f = this.facing;
      const col = this.karakter.colors;

      if (s === "kasket") {
        targetCtx.fillStyle = col.koyu;
        targetCtx.fillRect(hx - hr + 1, hy - hr - 2, hr * 2 - 1, 2);
        targetCtx.fillStyle = C_EYE;
        targetCtx.fillRect(hx - hr + 1, hy - hr, hr * 2 - 1, 1);
        const burun = f > 0 ? hr : -hr - 1;
        targetCtx.fillStyle = col.koyu;
        targetCtx.fillRect(hx + burun - (f > 0 ? 0 : 2), hy - hr - 1, 3, 1);
      } else if (s === "boynuz") {
        targetCtx.fillStyle = '#eeece2';
        targetCtx.beginPath();
        targetCtx.moveTo(hx - hr + 1, hy - hr);
        targetCtx.lineTo(hx - hr + 2, hy - hr - 4);
        targetCtx.lineTo(hx - hr + 3, hy - hr);
        targetCtx.moveTo(hx + hr - 3, hy - hr);
        targetCtx.lineTo(hx + hr - 2, hy - hr - 4);
        targetCtx.lineTo(hx + hr - 1, hy - hr);
        targetCtx.fill();
      } else if (s === "taç") {
        targetCtx.fillStyle = C_YEL;
        targetCtx.fillRect(hx - hr + 1, hy - hr - 2, hr * 2 - 1, 2);
        [-hr + 1, 0, hr - 2].forEach(dx => {
          targetCtx.fillRect(hx + dx, hy - hr - 4, 1, 2);
        });
      } else if (s === "hale") {
        targetCtx.strokeStyle = C_YEL;
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.ellipse(hx, hy - hr - 4, hr + 2, 2, 0, 0, Math.PI * 2);
        targetCtx.stroke();
      } else if (s === "anten") {
        const rHead = this.parts.head;
        const eg = Math.max(-2, Math.min(2, Math.round(-rHead.vy_sn * DT * 1.4)));
        targetCtx.strokeStyle = col.koyu;
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(hx, hy - hr);
        targetCtx.lineTo(hx + eg, hy - hr - 5);
        targetCtx.stroke();
        targetCtx.fillStyle = C_YEL;
        targetCtx.fillRect(hx + eg - 1, hy - hr - 7, 2, 2);
      } else if (s === "bandana") {
        targetCtx.fillStyle = C_YEL;
        targetCtx.fillRect(hx - hr + 1, hy - hr + 1, hr * 2 - 1, 2);
        const geri = f > 0 ? -1 : 1;
        targetCtx.fillRect(hx + (hr - 1) * geri, hy - hr + 1, geri * 3, 1);
      }
    }
  }

  /* =========================================================
     6. HARİTALAR VE ÇOKLU PLATFORM SİSTEMİ (7 EFSANE ARENA)
  ========================================================= */
  class Zemin {
    constructor(cx, y, w, h, kind = "toprak", erir = false, hareket = null) {
      this.cx0 = cx;
      this.y0 = y;
      this.w0 = w;
      this.h = h;
      this.kind = kind;
      this.erir = erir;
      this.hareket = hareket;
      this.x = cx - w * 0.5;
      this.y = y;
      this.w = w;
      this.vx = 0;
      this.vy = 0;
      this.erime = 0;
      this.faz = hareket ? (hareket.faz || 0) : 0;
    }
    get fric() {
      return this.kind === "buz" ? ICE_FRIC : GROUND_FRIC;
    }
    guncelle(dt) {
      const eskiX = this.x, eskiY = this.y;
      if (this.hareket) {
        const h = this.hareket;
        this.faz += dt * h.hiz * Math.PI * 2;
        const off = Math.sin(this.faz) * h.menzil;
        if (h.eksen === "y") {
          this.y = this.y0 + off;
          this.vy = (this.y - eskiY) / dt;
        } else {
          this.x = (this.cx0 - this.w0 * 0.5) + off;
          this.vx = (this.x - eskiX) / dt;
        }
      }
      if (this.erir && this.erime > 0 && this.w0 > MIN_HALF_W * 2) {
        const yeniW = Math.max(MIN_HALF_W * 2, this.w0 - this.erime * 2);
        this.w = yeniW;
        this.x = this.cx0 - yeniW * 0.5;
      }
    }
  }

  const HARITA_VERILERI = {
    tv: {
      ad: "CNN TÜRK STÜDYOSU",
      tema: "tv",
      zorluk: 2,
      zeminler: [
        { cx: 160, y: 124, w: 180, h: 14, kind: "tv" }
      ]
    },
    klasik: {
      ad: "KLASİK ARENA",
      tema: "gece",
      zorluk: 1,
      zeminler: [
        { cx: 160, y: 122, w: 208, h: 14, kind: "toprak", erir: true }
      ]
    },
    buz: {
      ad: "BUZ ADASI",
      tema: "kar",
      zorluk: 2,
      buz: true,
      zeminler: [
        { cx: 160, y: 122, w: 196, h: 14, kind: "buz" },
        { cx: 88, y: 104, w: 34, h: 10, kind: "buz" },
        { cx: 232, y: 104, w: 34, h: 10, kind: "buz" }
      ]
    },
    kule: {
      ad: "İKİZ KULE",
      tema: "kule",
      zorluk: 3,
      zeminler: [
        { cx: 94, y: 118, w: 56, h: 54, kind: "tas" },
        { cx: 226, y: 118, w: 56, h: 54, kind: "tas" },
        { cx: 160, y: 96, w: 26, h: 8, kind: "tas" }
      ]
    },
    asansor: {
      ad: "SANAYİ ASANSÖRÜ",
      tema: "sanayi",
      zorluk: 3,
      zeminler: [
        { cx: 160, y: 120, w: 106, h: 12, kind: "metal", hareket: { eksen: "y", menzil: 26, hiz: 0.42 } },
        { cx: 56, y: 96, w: 36, h: 10, kind: "metal" },
        { cx: 264, y: 96, w: 36, h: 10, kind: "metal" }
      ]
    },
    ruzgar: {
      ad: "RÜZGARLI TEPE",
      tema: "gunbatimi",
      zorluk: 2,
      ruzgar: { guc: 168.0, periyot: 6.0, sure: 1.9, uyari: 1.2 },
      zeminler: [
        { cx: 160, y: 116, w: 96, h: 14, kind: "cim", erir: true }
      ]
    },
    lav: {
      ad: "LAV GÖLÜ",
      tema: "volkan",
      zorluk: 3,
      lav: { baslangic: 178.0, hedef: 130.0, hiz: 1.15 },
      zeminler: [
        { cx: 160, y: 114, w: 156, h: 16, kind: "tas" }
      ]
    }
  };

  const Sahne = {
    t: 0,
    zeminler: [],
    eriyor: false,
    erime_t: 0,
    lav_y: null,
    ruzgar_x: 0,
    yildizlar: Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * 80, s: Math.random() * 1.5 + 0.8 })),
    kalabalik: Array.from({ length: 28 }, (_, i) => ({
      x: i * 11 + 4,
      y: 165,
      col: ['#72ce7e', '#ee6c60', '#5cc4e4', '#f6d660', '#b284ec', '#f68cba'][i % 6],
      sp: Math.random() * 0.5 + 0.5
    })),
    bulutlar: Array.from({ length: 5 }, () => ({
      x: Math.random() * W,
      y: Math.random() * 50 + 20,
      w: Math.random() * 0.9 + 0.6,
      sp: Math.random() * 0.5 + 0.3
    })),

    kur() {
      const data = HARITA_VERILERI[gameSettings.harita] || HARITA_VERILERI.tv;
      this.zeminler = data.zeminler.map(z => new Zemin(z.cx, z.y, z.w, z.h, z.kind, z.erir, z.hareket));
      this.eriyor = false;
      this.erime_t = 0;
      this.t = 0;
      this.lav_y = data.lav ? data.lav.baslangic : null;
      this.ruzgar_x = 0;
    },

    guncelle(dt) {
      this.t += dt;
      const data = HARITA_VERILERI[gameSettings.harita] || HARITA_VERILERI.tv;

      // Zeminleri güncelle (hareket & erime)
      this.zeminler.forEach(z => z.guncelle(dt));

      // Erime (Sudden death)
      if (this.eriyor) {
        this.erime_t += dt;
        this.zeminler.forEach(z => {
          if (z.erir) z.erime += SHRINK_SPEED * dt;
        });
      }

      // Rüzgar Simülasyonu
      this.ruzgar_x = 0;
      if (data.ruzgar) {
        const dongu = this.t % data.ruzgar.periyot;
        if (dongu < data.ruzgar.sure) {
          const yon = Math.floor(this.t / data.ruzgar.periyot) % 2 === 0 ? 1 : -1;
          this.ruzgar_x = data.ruzgar.guc * yon;
          if (Math.random() < 0.25) AudioEngine.ruzgar();
          if (Math.random() < 0.7) {
            spawnWindStreak(0, W, Math.random() * 120 + 30, yon);
          }
        }
      }

      // Lav Yükselişi
      if (data.lav && this.lav_y !== null && this.lav_y > data.lav.hedef) {
        this.lav_y -= data.lav.hiz * dt;
        if (Math.random() < 0.3) {
          spawnSpark(Math.random() * W, this.lav_y - Math.random() * 4, C_ORANGE);
        }
      }

      return {
        buz: !!data.buz,
        lav_y: this.lav_y,
        ruzgar_x: this.ruzgar_x
      };
    },

    ciz(targetCtx, env) {
      const data = HARITA_VERILERI[gameSettings.harita] || HARITA_VERILERI.tv;
      const tema = data.tema;

      // 1. Gökyüzü / Arka Plan Teması
      if (tema === "tv") {
        this._ciz_tv(targetCtx);
      } else if (tema === "kar") {
        this._ciz_kar(targetCtx);
      } else if (tema === "kule") {
        this._ciz_kule(targetCtx);
      } else if (tema === "sanayi") {
        this._ciz_sanayi(targetCtx);
      } else if (tema === "gunbatimi") {
        this._ciz_gunbatimi(targetCtx);
      } else if (tema === "volkan") {
        this._ciz_volkan(targetCtx);
      } else {
        this._ciz_gece(targetCtx);
      }

      // 2. Platformların Çizimi
      this.zeminler.forEach(z => {
        this._zemin_ciz(targetCtx, z);
      });

      // 3. Yükselen Lav
      if (this.lav_y !== null) {
        this._lav_ciz(targetCtx);
      }
    },

    _zemin_ciz(ctx, z) {
      const x = Math.round(z.x), y = Math.round(z.y), w = Math.round(z.w), h = Math.round(z.h);
      if (w <= 0) return;

      if (z.kind === "buz") {
        ctx.fillStyle = '#96c8e2';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C_ICE;
        ctx.fillRect(x, y + 1, w, h - 3);
        ctx.fillStyle = '#fafeff';
        ctx.fillRect(x, y - 2, w, 3);
        for (let bx = x + 5; bx < x + w - 4; bx += 12) {
          ctx.fillStyle = '#bae2f4';
          ctx.fillRect(bx, y + 4, 5, 2);
        }
      } else if (z.kind === "tas") {
        ctx.fillStyle = '#4a4854';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C_STONE;
        ctx.fillRect(x, y + 1, w, h - 3);
        ctx.fillStyle = '#9e9ca8';
        ctx.fillRect(x, y - 2, w, 3);
      } else if (z.kind === "metal") {
        ctx.fillStyle = '#3a3c4a';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C_METAL;
        ctx.fillRect(x, y + 1, w, h - 4);
        ctx.fillStyle = '#c4c8d6';
        ctx.fillRect(x, y - 3, w, 4);
      } else if (z.kind === "tv") {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#00dbff';
        ctx.fillRect(x, y, w, 2);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 4, y + 4, w - 8, h - 6);
      } else {
        // Toprak / Çim
        ctx.fillStyle = '#4e3022';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = C_TOPRAK;
        ctx.fillRect(x, y + 1, w, h - 3);
        ctx.fillStyle = C_CIM;
        ctx.fillRect(x, y - 2, w, 3);
        ctx.fillStyle = '#92d876';
        ctx.fillRect(x, y - 2, w, 1);
      }

      if (z.hareket) {
        ctx.fillStyle = C_YEL;
        ctx.fillRect(x + 2, y - 4, 2, 2);
        ctx.fillRect(x + w - 4, y - 4, 2, 2);
      }
    },

    _ciz_gece(ctx) {
      this._gradient(ctx, '#100e20', '#342a4e');
      this.yildizlar.forEach(s => {
        const k = 0.5 + 0.5 * Math.sin(this.t * (1.4 + s.s) + s.x);
        ctx.fillStyle = `rgba(180, 180, 220, ${k})`;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      });
      // Hilal Ay
      ctx.fillStyle = '#eee4b0';
      ctx.beginPath(); ctx.arc(272, 34, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#221c3e';
      ctx.beginPath(); ctx.arc(268, 30, 11, 0, Math.PI * 2); ctx.fill();
      // Tepe Siluetleri
      ctx.fillStyle = '#1a162e';
      ctx.beginPath();
      ctx.moveTo(0, 110); ctx.lineTo(40, 82); ctx.lineTo(86, 108); ctx.lineTo(140, 78);
      ctx.lineTo(190, 108); ctx.lineTo(250, 84); ctx.lineTo(320, 110); ctx.lineTo(320, 140); ctx.lineTo(0, 140);
      ctx.fill();
      this._kalabalik_ciz(ctx);
    },

    _ciz_kar(ctx) {
      this._gradient(ctx, '#1e2e4c', '#607e9e');
      // Buz Dağları
      ctx.fillStyle = '#344868';
      ctx.beginPath();
      ctx.moveTo(0, 118); ctx.lineTo(30, 96); ctx.lineTo(58, 118); ctx.lineTo(86, 100); ctx.lineTo(320, 118);
      ctx.lineTo(320, 146); ctx.lineTo(0, 146);
      ctx.fill();
      // Kar Örtüsü & Çam Ağaçları
      ctx.fillStyle = '#d8e6f6';
      ctx.fillRect(0, 146, 320, 34);
      [[22, 20], [44, 14], [286, 18], [306, 13], [264, 15]].forEach(([tx, th]) => {
        ctx.fillStyle = '#1e342e';
        ctx.beginPath();
        ctx.moveTo(tx, 150 - th); ctx.lineTo(tx - 7, 150); ctx.lineTo(tx + 7, 150);
        ctx.fill();
      });
      this._kalabalik_ciz(ctx);
    },

    _ciz_kule(ctx) {
      this._gradient(ctx, '#281c3e', '#804e58');
      // Tapınak Siluetleri
      [48, 160, 272].forEach(tx => {
        ctx.fillStyle = '#1e162c';
        ctx.fillRect(tx - 16, 96, 32, 60);
      });
      // Uçurum ve Sivri Dikenler
      ctx.fillStyle = '#0e0a16';
      ctx.fillRect(86, 150, 148, 30);
      for (let i = 88; i < 232; i += 9) {
        ctx.fillStyle = '#782c3a';
        ctx.beginPath();
        ctx.moveTo(i, 180); ctx.lineTo(i + 4, 160); ctx.lineTo(i + 8, 180);
        ctx.fill();
      }
      this._kalabalik_ciz(ctx);
    },

    _ciz_sanayi(ctx) {
      this._gradient(ctx, '#14141e', '#342e3a');
      // Çelik Borular
      [[10, 40, 120], [200, 30, 90], [60, 70, 60]].forEach(([px, py, pl]) => {
        ctx.fillStyle = '#2c2a36';
        ctx.fillRect(px, py, pl, 8);
        ctx.fillStyle = '#42404e';
        ctx.fillRect(px, py, pl, 2);
      });
      // Dönen Dişliler
      [[70, 120, 22, 1], [250, 108, 16, -1]].forEach(([gx, gy, gr, yon]) => {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(this.t * yon);
        ctx.strokeStyle = '#3a3846';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, gr, 0, Math.PI * 2); ctx.stroke();
        for (let a = 0; a < 8; a++) {
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-2, -gr - 4, 4, 6);
        }
        ctx.restore();
      });
      this._kalabalik_ciz(ctx);
    },

    _ciz_gunbatimi(ctx) {
      this._gradient(ctx, '#faa060', '#48345c');
      // Güneş
      ctx.fillStyle = '#ffd68c';
      ctx.beginPath(); ctx.arc(250, 108, 20, 0, Math.PI * 2); ctx.fill();
      // Uçan Kuşlar
      for (let i = 0; i < 4; i++) {
        const bx = (this.t * 22 + i * 62) % 360 - 20;
        const by = 44 + (i % 2) * 12 + Math.sin(this.t * 2 + i) * 2;
        ctx.fillStyle = '#342434';
        ctx.fillRect(Math.round(bx), Math.round(by), 3, 1);
      }
      this._kalabalik_ciz(ctx);
    },

    _ciz_volkan(ctx) {
      this._gradient(ctx, '#160c16', '#561e1e');
      // Volkan Dağı
      ctx.fillStyle = '#2c161e';
      ctx.beginPath();
      ctx.moveTo(20, 150); ctx.lineTo(120, 54); ctx.lineTo(200, 54); ctx.lineTo(300, 150);
      ctx.fill();
      // Krater Parlaması
      const parlak = 0.6 + 0.4 * Math.sin(this.t * 3);
      ctx.fillStyle = `rgba(255, ${Math.round(140 * parlak)}, 40, 0.8)`;
      ctx.beginPath();
      ctx.moveTo(132, 62); ctx.lineTo(188, 62); ctx.lineTo(176, 78); ctx.lineTo(144, 78);
      ctx.fill();
    },

    _ciz_tv(ctx) {
      this._gradient(ctx, '#070a14', '#161c2e');
      // Hareketli Stüdyo Spotları
      const spotAngle = Math.sin(this.t * 1.5) * 40;
      ctx.fillStyle = 'rgba(0, 219, 255, 0.07)';
      ctx.beginPath();
      ctx.moveTo(60, 0); ctx.lineTo(60 + spotAngle, 130); ctx.lineTo(130 + spotAngle, 130);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 51, 68, 0.07)';
      ctx.beginPath();
      ctx.moveTo(260, 0); ctx.lineTo(200 - spotAngle, 130); ctx.lineTo(270 - spotAngle, 130);
      ctx.fill();

      // Kayan Son Dakika Bandı
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(0, 16, W, 10);
      const shift = Math.round((this.t * 34) % 260);
      drawPixelText(ctx, "SON DAKIKA: AHMET HAKAN ILE TARAFSIZ BOLGE SUMO ARENASI CANLI YAYINDA", W - shift, 19, C_WHITE, 1);

      this._kalabalik_ciz(ctx);
    },

    _lav_ciz(ctx) {
      const ly = Math.round(this.lav_y);
      ctx.fillStyle = 'rgba(255, 60, 0, 0.35)';
      ctx.fillRect(0, ly - 4, W, 4);
      ctx.fillStyle = '#b32200';
      ctx.fillRect(0, ly, W, H - ly);
      ctx.fillStyle = '#ff6b00';
      ctx.fillRect(0, ly, W, 4);
      for (let xx = 0; xx < W; xx += 8) {
        const dalga = Math.sin(this.t * 3 + xx * 0.15) * 2;
        ctx.fillStyle = (Math.floor(this.t * 6 + xx) % 3 === 0) ? '#ffd54f' : '#ff5722';
        ctx.fillRect(xx, Math.round(ly - 1 + dalga), 6, 2);
      }
    },

    _kalabalik_ciz(ctx) {
      this.kalabalik.forEach(k => {
        const bob = Math.sin(this.t * 4 + k.x) * 2;
        ctx.fillStyle = k.col;
        ctx.fillRect(k.x, k.y + bob, 4, 6);
        ctx.fillStyle = C_EYE;
        ctx.fillRect(k.x + 1, k.y + bob - 2, 2, 2);
      });
    },

    _gradient(ctx, c1, c2) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  };

  /* =========================================================
     7. EFEKTLER (PARTİKÜL, TOZ, RÜZGAR, POPUP)
  ========================================================= */
  const particles = [];
  const windStreaks = [];
  const popups = [];

  function spawnSpark(x, y, color = C_YEL) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80 - 20,
      color,
      life: 0.35
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

  function spawnWindStreak(minX, maxX, y, dir) {
    windStreaks.push({
      x: dir > 0 ? minX : maxX,
      y,
      vx: dir * (Math.random() * 80 + 160),
      len: Math.random() * 24 + 16,
      life: 0.4
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
     8. DÖVÜŞ VURUŞ ÇARPIŞMALARI
  ========================================================= */
  function vurusKontrol(saldiran, kurban) {
    if (saldiran.punch_timer <= 0) return;
    const yumruk = saldiran.facing === 1 ? saldiran.parts.handR : saldiran.parts.handL;

    for (const k in kurban.parts) {
      const hedef = kurban.parts[k];
      const d = Math.hypot(yumruk.x - hedef.x, yumruk.y - hedef.y);
      if (d < yumruk.r + hedef.r + 3.0) {
        saldiran.punch_timer = 0;
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
     9. OYUN YÖNETİCİSİ VE DURUMLAR
  ========================================================= */
  const MENU = 0, MAC = 1, KO_DURUM = 2;
  let oyunDurumu = MENU;
  let menuSecim = 0;
  const MENU_OGELERI = ["2 KİŞİLİK OYNA", "YAPAY ZEKA (vs CPU)", "ONLINE 1v1", "KARAKTER ÖZELLEŞTİR", "HARİTALAR", "AYARLAR"];

  let p1 = new Ragdoll(110, 100, gameSettings.k1, true);
  let p2 = new Ragdoll(210, 100, gameSettings.k2, false);

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
      else if (e.code === 'KeyM') openSettingsModal('maps');
      else if (e.code === 'Escape') oyunDurumu = MENU;
    } else if (oyunDurumu === MAC) {
      if (e.code === 'Escape') oyunDurumu = MENU;
    }
  });

  window.addEventListener('keyup', e => { keys[e.code] = false; });

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
      openSettingsModal('char');
    } else if (menuSecim === 4) {
      openSettingsModal('maps');
    } else if (menuSecim === 5) {
      openSettingsModal('rules');
    }
  }

  function maciBaslat() {
    skor1 = 0; skor2 = 0; tur = 1;
    Sahne.kur();
    turBaslat();
  }

  function maciSifirla() {
    skor1 = 0; skor2 = 0; tur = 1;
    Sahne.kur();
    turBaslat();
  }

  function turBaslat() {
    oyunDurumu = MAC;
    macSuresi = 0;
    Sahne.eriyor = false;
    Sahne.erime_t = 0;
    slowMo = 1.0;
    geriSayim = 3;
    geriSayimTimer = 0;

    p1 = new Ragdoll(110, 100, gameSettings.k1, true);
    p2 = new Ragdoll(210, 100, gameSettings.k2, false);

    // DOM UI güncelle
    const p1Sc = document.getElementById('p1-score');
    const p2Sc = document.getElementById('p2-score');
    const rnd = document.getElementById('round-indicator');
    const mapName = document.getElementById('current-map-name');
    if (p1Sc) p1Sc.textContent = skor1;
    if (p2Sc) p2Sc.textContent = skor2;
    if (rnd) rnd.textContent = `TUR ${tur}`;
    if (mapName) mapName.textContent = (HARITA_VERILERI[gameSettings.harita] || HARITA_VERILERI.tv).ad;
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
          koTitle.textContent = `🏆 ${gameSettings.k1.ad} KAZANDI!`;
          koSub.textContent = "Tarafsız Bölge masasını yumrukladı, rakibi yayından uçurdu!";
        } else {
          koTitle.textContent = `🏆 ${gameSettings.k2.ad} KAZANDI!`;
          koSub.textContent = "Geleneksel Kutu Sumo ustası ringin hakimi oldu!";
        }
      }
    }, 800);
  }

  /* =========================================================
     10. OYUNCU VE YAPAY ZEKA GİRDİLERİ
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
     11. ONLINE WEBSOCKET ÇOK OYUNCULU
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

    const env = Sahne.guncelle(DT);

    // 1. Menü Durumu (Arkada 2 AI Canlı Dövüşür!)
    if (oyunDurumu === MENU) {
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
      p1.zemin_carp(Sahne.zeminler, env); p2.zemin_carp(Sahne.zeminler, env);
      vurusKontrol(p1, p2); vurusKontrol(p2, p1);

      ctx.clearRect(0, 0, W, H);
      Sahne.ciz(ctx, env);
      p1.ciz(ctx); p2.ciz(ctx);

      // Karartma Katmanı
      ctx.fillStyle = 'rgba(10, 8, 18, 0.78)';
      ctx.fillRect(0, 0, W, H);

      // Menü Başlığı
      drawPixelText(ctx, "AHMET HAKAN", 160, 22, C_YEL, 2, 'center');
      drawPixelText(ctx, "KUTU SUMO ARENASI", 160, 38, C_WHITE, 1, 'center');

      // Menü Öğeleri
      for (let i = 0; i < MENU_OGELERI.length; i++) {
        const secili = i === menuSecim;
        const my = 58 + i * 15;
        const etiket = (secili ? "> " : "  ") + MENU_OGELERI[i] + (secili ? " <" : "");
        drawPixelText(ctx, etiket, 160, my, secili ? C_YEL : UI_YAZI, 1, 'center');
      }

      // 👑 Yapımcılar Künyesi (Desktop AhmetHakanSumoOyun.py Birebir)
      drawPixelText(ctx, "YAPIMCILAR: AHMET BAKI & HAKAN SAMET", 160, 154, '#ffd700', 1, 'center');
      drawPixelText(ctx, "SEC: YUKARI/ASAGI  ONAYLA: ENTER / SPACE", 160, 168, '#88849c', 1, 'center');
      return;
    }

    // 2. Maç / KO Durumu
    let dt = DT * slowMo;
    macSuresi += dt;

    if (macSuresi > 22.0 && !Sahne.eriyor) {
      Sahne.eriyor = true;
    }

    // Geri Sayım
    if (geriSayim > 0) {
      geriSayimTimer += dt;
      if (geriSayimTimer >= 0.75) {
        geriSayimTimer = 0;
        geriSayim--;
        if (geriSayim > 0) AudioEngine.blip();
        else AudioEngine.go();
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
    p1.zemin_carp(Sahne.zeminler, env);
    p2.zemin_carp(Sahne.zeminler, env);

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

    // Rüzgar Çizgileri
    for (let i = windStreaks.length - 1; i >= 0; i--) {
      const ws = windStreaks[i];
      ws.life -= dt;
      ws.x += ws.vx * dt;
      if (ws.life <= 0) windStreaks.splice(i, 1);
      else {
        ctx.fillStyle = 'rgba(230, 240, 255, 0.4)';
        ctx.fillRect(Math.round(ws.x), Math.round(ws.y), ws.len, 1);
      }
    }

    // Popuplar
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

    // HUD Skor
    drawPixelText(ctx, `${gameSettings.k1.ad}: ${skor1}`, 10, 6, C_RED, 1);
    drawPixelText(ctx, `${gameSettings.k2.ad}: ${skor2}`, W - 10, 6, '#5cc4e4', 1, 'right');

    // 👑 Alt Künye
    drawPixelText(ctx, "YAPIMCILAR: AHMET BAKI & HAKAN SAMET", W / 2, H - 7, '#ffd700', 1, 'center');

    // Süper Barlar
    const p1Fill = document.getElementById('p1-super-fill');
    const p2Fill = document.getElementById('p2-super-fill');
    if (p1Fill) p1Fill.style.width = `${p1.superMeter}%`;
    if (p2Fill) p2Fill.style.width = `${p2.superMeter}%`;
  }

  /* =========================================================
     13. MODAL YÖNETİMİ & KARAKTER ÖZELLEŞTİRİCİSİ
  ========================================================= */
  function openSettingsModal(defaultTab = 'maps') {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('hidden');
    window.switchModalTab(defaultTab);
    window.updateCharPreview();
  }

  window.switchModalTab = function (tabName) {
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = document.getElementById(`tab-btn-${tabName}`);
    const content = document.getElementById(`tab-content-${tabName}`);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
  };

  window.updateCharPreview = function () {
    // P1 Önizleme
    const p1Body = document.getElementById('p1-body-select')?.value || 'normal';
    const p1Col = parseInt(document.getElementById('p1-color-select')?.value || '5');
    const p1Hat = document.getElementById('p1-hat-select')?.value || 'kasket';
    const p1Face = document.getElementById('p1-face-select')?.value || 'gözlük';
    const p1Name = document.getElementById('p1-name-input')?.value || 'AHMET HAKAN';

    // P2 Önizleme
    const p2Body = document.getElementById('p2-body-select')?.value || 'tombul';
    const p2Col = parseInt(document.getElementById('p2-color-select')?.value || '1');
    const p2Hat = document.getElementById('p2-hat-select')?.value || 'boynuz';
    const p2Face = document.getElementById('p2-face-select')?.value || 'kızgın';
    const p2Name = document.getElementById('p2-name-input')?.value || 'KUTU SUMO';

    const p1Dummy = new Ragdoll(40, 48, new Karakter(p1Name, p1Col, p1Hat, p1Face, p1Body), true);
    const p2Dummy = new Ragdoll(40, 48, new Karakter(p2Name, p2Col, p2Hat, p2Face, p2Body), false);

    const c1 = document.getElementById('p1-preview-canvas');
    if (c1) {
      const cx1 = c1.getContext('2d');
      cx1.clearRect(0, 0, 80, 80);
      p1Dummy.ciz(cx1);
    }

    const c2 = document.getElementById('p2-preview-canvas');
    if (c2) {
      const cx2 = c2.getContext('2d');
      cx2.clearRect(0, 0, 80, 80);
      p2Dummy.ciz(cx2);
    }
  };

  // RETRO 90S ARCADE LOADING SCREEN
  function initLoadingScreen() {
    const screen = document.getElementById('sumo-loading-screen');
    const fill = document.getElementById('sumo-loading-bar-fill');
    const status = document.getElementById('sumo-loading-status');
    if (!screen || !fill) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 16 + 12);
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        fill.style.width = '100%';
        if (status) status.textContent = 'Arena hazır! Yapımcılar: Ahmet Baki ve Hakan Samet %100';

        AudioEngine.win();

        setTimeout(() => {
          screen.classList.add('fade-out');
          setTimeout(() => {
            if (screen.parentNode) screen.parentNode.removeChild(screen);
          }, 600);
        }, 500);
      } else {
        fill.style.width = `${progress}%`;
        if (status) status.textContent = `Verlet ragdoll fizik motoru yükleniyor... %${progress}`;
      }
    }, 110);
  }

  // UI Olay Dinleyicileri
  document.getElementById('btn-next-round')?.addEventListener('click', sonrakiTur);
  document.getElementById('btn-restart-match')?.addEventListener('click', maciSifirla);
  document.getElementById('btn-choose-map')?.addEventListener('click', () => openSettingsModal('maps'));
  document.getElementById('btn-open-settings')?.addEventListener('click', () => openSettingsModal('maps'));
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.add('hidden');
  });

  document.querySelectorAll('.map-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.map-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      gameSettings.harita = card.dataset.map;
      const el = document.getElementById('current-map-name');
      if (el) el.textContent = (HARITA_VERILERI[gameSettings.harita] || HARITA_VERILERI.tv).ad;
    });
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    // Ayarları kaydet
    gameSettings.yer_cekim = document.getElementById('sel-gravity')?.value || 'NORMAL';
    gameSettings.tur_sayisi = parseInt(document.getElementById('sel-rounds')?.value || '3');
    gameSettings.cpu_zorluk = document.getElementById('sel-ai-diff')?.value || 'NORMAL';

    // Karakter 1 Özelleştirmeleri
    const p1Body = document.getElementById('p1-body-select')?.value || 'normal';
    const p1Col = parseInt(document.getElementById('p1-color-select')?.value || '5');
    const p1Hat = document.getElementById('p1-hat-select')?.value || 'kasket';
    const p1Face = document.getElementById('p1-face-select')?.value || 'gözlük';
    const p1Name = document.getElementById('p1-name-input')?.value || 'AHMET HAKAN';
    gameSettings.k1 = new Karakter(p1Name, p1Col, p1Hat, p1Face, p1Body);

    // Karakter 2 Özelleştirmeleri
    const p2Body = document.getElementById('p2-body-select')?.value || 'tombul';
    const p2Col = parseInt(document.getElementById('p2-color-select')?.value || '1');
    const p2Hat = document.getElementById('p2-hat-select')?.value || 'boynuz';
    const p2Face = document.getElementById('p2-face-select')?.value || 'kızgın';
    const p2Name = document.getElementById('p2-name-input')?.value || 'KUTU SUMO';
    gameSettings.k2 = new Karakter(p2Name, p2Col, p2Hat, p2Face, p2Body);

    // İsimleri UI'ya yansıt
    const p1Disp = document.getElementById('p1-display-name');
    const p2Disp = document.getElementById('p2-display-name');
    if (p1Disp) p1Disp.textContent = p1Name;
    if (p2Disp) p2Disp.textContent = p2Name;

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

  // Tam Ekran
  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Mobil Dokunmatik Kontroller
  const touchMap = {
    'touch-left': 'KeyA',
    'touch-right': 'KeyD',
    'touch-jump': 'KeyW',
    'touch-block': 'KeyS',
    'touch-punch': 'Space',
    'touch-super': 'KeyQ'
  };
  for (const [btnId, code] of Object.entries(touchMap)) {
    const el = document.getElementById(btnId);
    if (el) {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[code] = true; AudioEngine.init(); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); keys[code] = false; });
    }
  }

  // Başlat
  Sahne.kur();
  initLoadingScreen();
  turBaslat();
  oyunDongusu();
})();
