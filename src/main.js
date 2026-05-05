(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = 616;
  const MAX_LEVEL = 50;
  const canvasWrap = document.getElementById("canvas-wrap");
  const topBar = document.getElementById("top-bar");

  function fitCanvasWrap() {
    const viewportW = window.innerWidth || document.documentElement.clientWidth || W;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || H;
    const topBarHeight = topBar ? topBar.offsetHeight : 0;
    const shellPadding = viewportW <= 900 ? 18 : 28;
    const availableW = Math.max(320, viewportW - shellPadding * 2);
    const availableH = Math.max(220, viewportH - topBarHeight - shellPadding * 3);

    let renderW = availableW;
    let renderH = renderW * 9 / 16;

    if (renderH > availableH) {
      renderH = availableH;
      renderW = renderH * 16 / 9;
    }

    canvasWrap.style.width = `${Math.floor(renderW)}px`;
    canvasWrap.style.height = `${Math.floor(renderH)}px`;
  }

  const assetPaths = {
    bgFar: "assets/images/background_far.png",
    bgMid: "assets/images/background_mid.png",
    bgFront: "assets/images/background_front.png",
    ground: "assets/images/ground_tile.png",
    playerIdle: "assets/images/player_idle.png",
    playerRun: "assets/images/player_run.png",
    playerJump: "assets/images/player_jump.png",
    playerShoot: "assets/images/player_shoot.png",
    enemyDrone: "assets/images/enemy_drone.png",
    enemySoldier: "assets/images/enemy_soldier.png",
    bossMech: "assets/images/boss_mech.png",
    bulletPlayer: "assets/images/bullet_player.png",
    bulletEnemy: "assets/images/bullet_enemy.png",
    healthPack: "assets/images/health_pack.png",
    coin: "assets/images/coin.png",
    crate: "assets/images/obstacle_crate.png",
    explosion0: "assets/images/explosion_0.png",
    explosion1: "assets/images/explosion_1.png",
    explosion2: "assets/images/explosion_2.png",
    explosion3: "assets/images/explosion_3.png",
    explosion4: "assets/images/explosion_4.png",
    explosion5: "assets/images/explosion_5.png",
  };

  const images = {};
  let loaded = 0;
  const totalAssets = Object.keys(assetPaths).length;

  const keys = {
    left: false,
    right: false,
    up: false,
    shoot: false,
  };

  const pressed = new Set();

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function drawText(text, x, y, size = 24, align = "left", color = "#eaf8ff", shadow = true) {
    ctx.save();
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    if (shadow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawRoundedRect(x, y, w, h, r, fill, stroke, lineWidth = 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  function playTone(freq, duration = 0.05, type = "sine", gain = 0.03) {
    if (!game.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!game.audioCtx) game.audioCtx = new AudioContext();
      const o = game.audioCtx.createOscillator();
      const g = game.audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(game.audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, game.audioCtx.currentTime + duration);
      o.stop(game.audioCtx.currentTime + duration);
    } catch (_) {}
  }

  class Entity {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.remove = false;
      this.flip = false;
      this.alpha = 1;
    }

    get cx() {
      return this.x + this.w / 2;
    }

    get cy() {
      return this.y + this.h / 2;
    }

    bounds(pad = 0) {
      return {
        x: this.x + pad,
        y: this.y + pad,
        w: this.w - pad * 2,
        h: this.h - pad * 2,
      };
    }

    drawImage(img, offsetY = 0) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      if (this.flip) {
        ctx.translate(this.x + this.w, this.y + offsetY);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, this.w, this.h);
      } else {
        ctx.drawImage(img, this.x, this.y + offsetY, this.w, this.h);
      }
      ctx.restore();
    }
  }

  class Player extends Entity {
    constructor() {
      super(110, GROUND_Y - 110, 94, 110);
      this.maxHealth = 120;
      this.health = this.maxHealth;
      this.speed = 430;
      this.jumpPower = 820;
      this.gravity = 2300;
      this.onGround = false;
      this.facing = 1;
      this.shootCooldown = 0;
      this.invincible = 0;
      this.shootFlash = 0;
      this.coins = 0;
    }

    reset() {
      this.x = 110;
      this.y = GROUND_Y - this.h;
      this.vx = 0;
      this.vy = 0;
      this.health = this.maxHealth;
      this.shootCooldown = 0;
      this.invincible = 0;
      this.shootFlash = 0;
      this.coins = 0;
    }

    update(dt) {
      const movingLeft = keys.left;
      const movingRight = keys.right;

      if (movingLeft && !movingRight) {
        this.vx = -this.speed;
        this.facing = -1;
      } else if (movingRight && !movingLeft) {
        this.vx = this.speed;
        this.facing = 1;
      } else {
        this.vx *= Math.pow(0.001, dt);
        if (Math.abs(this.vx) < 6) this.vx = 0;
      }

      if (keys.up && this.onGround) {
        this.vy = -this.jumpPower;
        this.onGround = false;
        playTone(240, 0.04, "triangle", 0.025);
      }

      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.x = clamp(this.x, 20, W - this.w - 20);

      if (this.y + this.h >= GROUND_Y) {
        this.y = GROUND_Y - this.h;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }

      this.shootCooldown = Math.max(0, this.shootCooldown - dt);
      this.invincible = Math.max(0, this.invincible - dt);
      this.shootFlash = Math.max(0, this.shootFlash - dt);

      if (keys.shoot) this.shoot();
    }

    shoot() {
      if (this.shootCooldown > 0) return;
      this.shootCooldown = 0.18;
      this.shootFlash = 0.12;
      const bx = this.facing === 1 ? this.x + this.w - 8 : this.x - 58;
      const by = this.y + 42;
      game.bullets.push(new Bullet(bx, by, this.facing * 870, 0, "player"));
      game.shake = Math.max(game.shake, 2.8);
      playTone(690, 0.035, "square", 0.018);
    }

    hit(damage) {
      if (this.invincible > 0) return;
      this.health = Math.max(0, this.health - damage);
      this.invincible = 0.58;
      game.shake = Math.max(game.shake, 11);
      game.particles.push(...Particle.burst(this.cx, this.cy, "#ff3f4e", 15));
      playTone(110, 0.09, "sawtooth", 0.05);
      if (this.health <= 0) game.gameOver();
    }

    heal(amount) {
      this.health = Math.min(this.maxHealth, this.health + amount);
      game.particles.push(...Particle.burst(this.cx, this.cy, "#46ff85", 15));
      playTone(520, 0.08, "sine", 0.035);
    }

    draw() {
      let img = images.playerIdle;
      if (!this.onGround) img = images.playerJump;
      else if (this.shootFlash > 0) img = images.playerShoot;
      else if (Math.abs(this.vx) > 40) img = images.playerRun;

      this.flip = this.facing === -1;
      const flicker = this.invincible > 0 && Math.floor(performance.now() / 55) % 2 === 0;
      this.alpha = flicker ? 0.45 : 1;
      this.drawImage(img);
      this.alpha = 1;

      if (this.shootFlash > 0) {
        ctx.save();
        ctx.globalAlpha = this.shootFlash * 8;
        ctx.fillStyle = "#ffb15a";
        const mx = this.facing === 1 ? this.x + this.w + 15 : this.x - 10;
        const my = this.y + 48;
        ctx.beginPath();
        ctx.arc(mx, my, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  class Bullet extends Entity {
    constructor(x, y, vx, vy, owner, damage = 18) {
      super(x, y, 58, 22);
      this.vx = vx;
      this.vy = vy;
      this.owner = owner;
      this.damage = damage;
      this.life = 2.3;
      this.flip = vx < 0;
      if (owner === "enemy") {
        this.w = 48;
        this.h = 20;
      }
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0 || this.x < -120 || this.x > W + 120 || this.y < -80 || this.y > H + 80) {
        this.remove = true;
      }
    }

    draw() {
      const img = this.owner === "player" ? images.bulletPlayer : images.bulletEnemy;
      this.flip = this.vx < 0;
      this.drawImage(img);
    }
  }

  class Enemy extends Entity {
    constructor(type, x, y, level) {
      const isDrone = type === "drone";
      super(x, y, isDrone ? 78 : 86, isDrone ? 78 : 104);
      this.type = type;
      this.level = level;
      this.maxHealth = isDrone ? 38 + level * 2.2 : 60 + level * 3.4;
      this.health = this.maxHealth;
      this.speed = isDrone ? 120 + level * 3.4 : 82 + level * 2.6;
      this.shootCooldown = rand(0.5, 1.5);
      this.stateTimer = rand(0.2, 1.2);
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.gravity = isDrone ? 0 : 1900;
      this.baseY = y;
      this.fireRate = clamp(1.5 - level * 0.018, 0.48, 1.5);
      this.accuracySpread = clamp(0.55 - level * 0.009, 0.08, 0.55);
      this.reaction = clamp(0.65 - level * 0.008, 0.16, 0.65);
      this.aiThink = this.reaction;
      this.dodgeTimer = 0;
      this.scoreValue = isDrone ? 110 : 160;
      this.flash = 0;
      this.onGround = false;
      this.hoverPhase = rand(0, Math.PI * 2);
    }

    update(dt) {
      const p = game.player;
      this.flash = Math.max(0, this.flash - dt);
      this.aiThink -= dt;
      this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
      this.shootCooldown -= dt;
      this.stateTimer -= dt;

      if (this.aiThink <= 0) {
        this.think();
        this.aiThink = this.reaction + rand(-0.05, 0.08);
      }

      if (this.type === "drone") {
        const targetY = clamp(p.y - 10 + Math.sin(performance.now() * 0.004 + this.hoverPhase) * 55, 110, 500);
        this.y += (targetY - this.y) * clamp(dt * 1.6, 0, 1);
        this.x += this.dir * this.speed * dt;
        if (this.x < 640 && p.x < this.x) this.dir = -1;
        if (this.x > 1120 || this.x < 420) this.dir *= -1;
      } else {
        this.vy += this.gravity * dt;
        const distX = p.cx - this.cx;
        const desired = Math.abs(distX) > 380 ? Math.sign(distX) : -Math.sign(distX || 1);
        this.vx += desired * this.speed * 2.8 * dt;
        this.vx = clamp(this.vx, -this.speed, this.speed);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.x = clamp(this.x, 360, W - this.w - 30);
        if (this.y + this.h >= GROUND_Y) {
          this.y = GROUND_Y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }

      if (this.shootCooldown <= 0 && Math.abs(p.cx - this.cx) < 720) {
        this.shootAtPlayer();
        this.shootCooldown = this.fireRate + rand(0.05, 0.35);
      }

      this.flip = p.cx < this.cx;
    }

    think() {
      const p = game.player;
      const incoming = game.bullets.find((b) => {
        if (b.owner !== "player") return false;
        const toward = b.vx > 0 ? b.x < this.x : b.x > this.x;
        return toward && Math.abs(b.y - this.cy) < 70 && Math.abs(b.x - this.cx) < 240;
      });

      if (incoming && this.dodgeTimer <= 0) {
        this.dodgeTimer = 0.42;
        if (this.type === "drone") {
          this.y += incoming.y < this.cy ? 65 : -65;
          this.dir *= -1;
        } else if (this.onGround) {
          this.vy = -520;
          this.vx += (incoming.vx > 0 ? 1 : -1) * 130;
        }
      }

      if (Math.random() < 0.18 + this.level * 0.004) {
        this.dir = p.cx < this.cx ? -1 : 1;
      }
    }

    shootAtPlayer() {
      const p = game.player;
      const startX = this.flip ? this.x - 20 : this.x + this.w + 10;
      const startY = this.y + this.h * 0.42;
      const dx = p.cx - startX;
      const dy = p.cy - startY;
      const angle = Math.atan2(dy, dx) + rand(-this.accuracySpread, this.accuracySpread);
      const speed = 360 + this.level * 8;
      const bullet = new Bullet(startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed, "enemy", 10 + this.level * 0.5);
      game.bullets.push(bullet);
      playTone(250, 0.035, "square", 0.013);
    }

    hit(damage) {
      this.health -= damage;
      this.flash = 0.1;
      game.particles.push(...Particle.burst(this.cx, this.cy, this.type === "drone" ? "#ff3f4e" : "#00d9ff", 7));
      if (this.health <= 0) this.die();
    }

    die() {
      this.remove = true;
      game.score += this.scoreValue;
      game.combo = Math.min(9, game.combo + 1);
      game.explosions.push(new Explosion(this.cx, this.cy));
      game.shake = Math.max(game.shake, 8);
      playTone(75, 0.12, "sawtooth", 0.045);
      if (game.canSpawnHealthPickup()) {
        const emergencyChance = game.player.health < game.player.maxHealth * 0.45 ? 0.34 : 0.16;
        if (Math.random() < emergencyChance) {
          game.pickups.push(new Pickup(this.cx - 25, this.cy - 25, "health"));
          game.registerHealthDrop();
        }
      }
      if (Math.random() < 0.4) game.pickups.push(new Pickup(this.cx - 20, this.cy - 10, "coin"));
    }

    draw() {
      const img = this.type === "drone" ? images.enemyDrone : images.enemySoldier;
      if (this.flash > 0) {
        ctx.save();
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 25;
        this.drawImage(img);
        ctx.restore();
      } else {
        this.drawImage(img);
      }
      // health bar
      const hp = clamp(this.health / this.maxHealth, 0, 1);
      drawRoundedRect(this.x + 8, this.y - 12, this.w - 16, 5, 3, "rgba(0,0,0,.55)", null);
      drawRoundedRect(this.x + 8, this.y - 12, (this.w - 16) * hp, 5, 3, this.type === "drone" ? "#ff3f4e" : "#00d9ff", null);
    }
  }

  class Boss extends Entity {
    constructor(level) {
      super(W - 330, GROUND_Y - 265, 240, 265);
      this.level = level;
      this.maxHealth = 420 + level * 35;
      this.health = this.maxHealth;
      this.phase = 1;
      this.shootCooldown = 1.2;
      this.burstLeft = 0;
      this.burstTimer = 0;
      this.vx = -80;
      this.flash = 0;
      this.scoreValue = 3000 + level * 70;
    }

    update(dt) {
      const p = game.player;
      this.flash = Math.max(0, this.flash - dt);
      this.x += this.vx * dt;
      if (this.x < 760 || this.x > W - this.w - 25) this.vx *= -1;
      this.y = GROUND_Y - this.h + Math.sin(performance.now() * 0.002) * 8;
      this.phase = this.health < this.maxHealth * 0.45 ? 2 : 1;
      this.shootCooldown -= dt;
      this.burstTimer -= dt;
      this.flip = p.cx < this.cx;

      if (this.burstLeft > 0 && this.burstTimer <= 0) {
        this.firePattern();
        this.burstLeft--;
        this.burstTimer = this.phase === 2 ? 0.13 : 0.22;
      }

      if (this.shootCooldown <= 0 && this.burstLeft <= 0) {
        this.burstLeft = this.phase === 2 ? 7 : 4;
        this.shootCooldown = this.phase === 2 ? 2.0 : 2.8;
      }
    }

    firePattern() {
      const p = game.player;
      const startX = this.x + 25;
      const startY = this.y + 112;
      const base = Math.atan2(p.cy - startY, p.cx - startX);
      const spread = this.phase === 2 ? 0.22 : 0.12;
      const count = this.phase === 2 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const angle = base + (i - (count - 1) / 2) * spread + rand(-0.06, 0.06);
        const speed = 380 + this.level * 7;
        game.bullets.push(new Bullet(startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed, "enemy", 15 + this.level * 0.7));
      }
      playTone(160, 0.05, "sawtooth", 0.035);
    }

    hit(damage) {
      this.health -= damage;
      this.flash = 0.08;
      game.shake = Math.max(game.shake, 4);
      game.particles.push(...Particle.burst(this.cx, this.cy, "#ff7122", 8));
      if (this.health <= 0) this.die();
    }

    die() {
      this.remove = true;
      game.score += this.scoreValue;
      for (let i = 0; i < 10; i++) {
        game.explosions.push(new Explosion(this.x + rand(30, this.w - 30), this.y + rand(30, this.h - 30)));
      }
      game.shake = 22;
      playTone(55, 0.35, "sawtooth", 0.07);
      for (let i = 0; i < 4; i++) game.pickups.push(new Pickup(this.cx + rand(-80, 80), this.cy + rand(-60, 60), "coin"));
    }

    draw() {
      if (this.flash > 0) {
        ctx.save();
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 35;
        this.drawImage(images.bossMech);
        ctx.restore();
      } else {
        this.drawImage(images.bossMech);
      }

      const hp = clamp(this.health / this.maxHealth, 0, 1);
      drawRoundedRect(340, 88, 600, 16, 9, "rgba(0,0,0,.5)", "rgba(255,113,34,.45)");
      drawRoundedRect(342, 90, 596 * hp, 12, 7, this.phase === 2 ? "#ff3f4e" : "#ff7122", null);
      drawText(`BOSS LEVEL ${this.level}`, 640, 78, 18, "center", "#ffb15a");
    }
  }

  class Pickup extends Entity {
    constructor(x, y, type) {
      super(x, y, type === "coin" ? 44 : 58, type === "coin" ? 44 : 58);
      this.type = type;
      this.vy = -rand(120, 240);
      this.gravity = 800;
      this.life = 9;
      this.phase = rand(0, Math.PI * 2);
    }

    update(dt) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;
      this.x += Math.sin(performance.now() * 0.004 + this.phase) * 0.25;
      if (this.y + this.h >= GROUND_Y - 6) {
        this.y = GROUND_Y - this.h - 6;
        this.vy *= -0.35;
      }
      this.life -= dt;
      if (this.life <= 0) this.remove = true;
      if (rectsOverlap(this.bounds(6), game.player.bounds(15))) {
        if (this.type === "health") game.player.heal(26);
        else {
          game.player.coins++;
          game.score += 55;
          playTone(780, 0.06, "sine", 0.025);
        }
        this.remove = true;
      }
    }

    draw() {
      this.alpha = clamp(this.life, 0, 1);
      this.drawImage(this.type === "health" ? images.healthPack : images.coin);
      this.alpha = 1;
    }
  }

  class Explosion {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.life = 0.42;
      this.maxLife = 0.42;
      this.remove = false;
    }

    update(dt) {
      this.life -= dt;
      if (this.life <= 0) this.remove = true;
    }

    draw() {
      const progress = 1 - this.life / this.maxLife;
      const idx = clamp(Math.floor(progress * 6), 0, 5);
      const img = images[`explosion${idx}`];
      const size = 138 + progress * 95;
      ctx.save();
      ctx.globalAlpha = clamp(this.life / this.maxLife + 0.2, 0, 1);
      ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = rand(-230, 230);
      this.vy = rand(-230, 230);
      this.life = rand(0.25, 0.65);
      this.maxLife = this.life;
      this.size = rand(2, 6);
      this.color = color;
      this.remove = false;
    }

    static burst(x, y, color, count) {
      return Array.from({ length: count }, () => new Particle(x, y, color));
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= Math.pow(0.02, dt);
      this.vy += 450 * dt;
      this.life -= dt;
      if (this.life <= 0) this.remove = true;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = clamp(this.life / this.maxLife, 0, 1);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Crate extends Entity {
    constructor(x, y) {
      super(x, y, 82, 66);
      this.health = 45;
    }

    hit(dmg) {
      this.health -= dmg;
      game.particles.push(...Particle.burst(this.cx, this.cy, "#ff7122", 4));
      if (this.health <= 0) {
        this.remove = true;
        game.explosions.push(new Explosion(this.cx, this.cy));
      }
    }

    draw() {
      this.drawImage(images.crate);
    }
  }

  class Game {
    constructor() {
      this.state = "loading";
      this.player = new Player();
      this.level = 1;
      this.score = 0;
      this.combo = 0;
      this.enemies = [];
      this.bullets = [];
      this.pickups = [];
      this.explosions = [];
      this.particles = [];
      this.crates = [];
      this.bgX = 0;
      this.shake = 0;
      this.levelMessageTimer = 0;
      this.gameTime = 0;
      this.audioCtx = null;
      this.soundEnabled = true;
      this.healthAllowedThisLevel = false;
      this.healthDropsThisLevel = 0;
      this.lastTime = performance.now();
    }

    shouldAllowHealthInLevel(level) {
      if (level % 10 === 0) return true;
      if (level <= 2) return false;
      return level % 3 === 0 || level % 5 === 0;
    }

    canSpawnHealthPickup() {
      return this.healthAllowedThisLevel &&
        this.healthDropsThisLevel < 1 &&
        this.player.health < this.player.maxHealth * 0.82;
    }

    registerHealthDrop() {
      this.healthDropsThisLevel++;
    }

    start() {
      this.state = "playing";
      this.level = 1;
      this.score = 0;
      this.combo = 0;
      this.player.reset();
      this.loadLevel(this.level);
    }

    loadLevel(level) {
      this.enemies = [];
      this.bullets = [];
      this.pickups = [];
      this.explosions = [];
      this.particles = [];
      this.crates = [];
      this.levelMessageTimer = 1.9;
      this.healthAllowedThisLevel = this.shouldAllowHealthInLevel(level);
      this.healthDropsThisLevel = 0;
      this.player.x = 105;
      this.player.y = GROUND_Y - this.player.h;
      this.player.vx = 0;
      this.player.vy = 0;

      const crateCount = 2 + Math.floor(level / 8);
      for (let i = 0; i < crateCount; i++) {
        this.crates.push(new Crate(rand(430, 1090), GROUND_Y - 66));
      }

      if (level % 10 === 0) {
        this.enemies.push(new Boss(level));
      } else {
        const enemyCount = clamp(Math.floor(3 + level * 0.48), 3, 17);
        for (let i = 0; i < enemyCount; i++) {
          const type = Math.random() < clamp(0.22 + level * 0.008, 0.22, 0.55) ? "drone" : "soldier";
          const x = rand(520, 1180);
          const y = type === "drone" ? rand(110, 390) : GROUND_Y - 104;
          this.enemies.push(new Enemy(type, x, y, level));
        }
      }
    }

    gameOver() {
      this.state = "gameover";
    }

    win() {
      this.state = "win";
    }

    update(dt) {
      if (this.state !== "playing") return;

      this.gameTime += dt;
      this.bgX += dt * 70;
      this.shake = Math.max(0, this.shake - dt * 35);
      this.levelMessageTimer = Math.max(0, this.levelMessageTimer - dt);
      this.combo = Math.max(0, this.combo - dt * 0.22);

      this.player.update(dt);
      this.crates.forEach((o) => o.update?.(dt));
      this.enemies.forEach((e) => e.update(dt));
      this.bullets.forEach((b) => b.update(dt));
      this.pickups.forEach((p) => p.update(dt));
      this.explosions.forEach((e) => e.update(dt));
      this.particles.forEach((p) => p.update(dt));

      this.handleCollisions();
      this.cleanup();
      this.checkLevelComplete();
    }

    handleCollisions() {
      for (const bullet of this.bullets) {
        if (bullet.remove) continue;
        for (const crate of this.crates) {
          if (!crate.remove && rectsOverlap(bullet.bounds(4), crate.bounds(6))) {
            crate.hit(bullet.damage);
            bullet.remove = true;
            break;
          }
        }

        if (bullet.remove) continue;
        if (bullet.owner === "player") {
          for (const enemy of this.enemies) {
            if (!enemy.remove && rectsOverlap(bullet.bounds(4), enemy.bounds(enemy instanceof Boss ? 20 : 12))) {
              enemy.hit(bullet.damage * (1 + Math.floor(this.combo) * 0.04));
              bullet.remove = true;
              break;
            }
          }
        } else if (rectsOverlap(bullet.bounds(4), this.player.bounds(18))) {
          this.player.hit(bullet.damage);
          bullet.remove = true;
        }
      }

      for (const enemy of this.enemies) {
        if (!enemy.remove && !(enemy instanceof Boss) && rectsOverlap(enemy.bounds(16), this.player.bounds(15))) {
          this.player.hit(enemy.type === "drone" ? 14 : 18);
          enemy.vx *= -1;
        }
      }
    }

    cleanup() {
      this.enemies = this.enemies.filter((e) => !e.remove);
      this.bullets = this.bullets.filter((b) => !b.remove);
      this.pickups = this.pickups.filter((p) => !p.remove);
      this.explosions = this.explosions.filter((e) => !e.remove);
      this.particles = this.particles.filter((p) => !p.remove);
      this.crates = this.crates.filter((o) => !o.remove);
    }

    checkLevelComplete() {
      if (this.enemies.length > 0) return;
      if (this.state !== "playing") return;
      this.state = "levelclear";
      this.levelClearTimer = 1.8;
      playTone(860, 0.08, "sine", 0.035);
      setTimeout(() => {
        if (this.state !== "levelclear") return;
        if (this.level >= MAX_LEVEL) {
          this.win();
        } else {
          this.level++;
          this.state = "playing";
          this.loadLevel(this.level);
        }
      }, 1400);
    }

    drawBackground() {
      ctx.drawImage(images.bgFar, 0, 0, W, H);

      const midOffset = -(this.bgX * 0.2) % W;
      ctx.drawImage(images.bgMid, midOffset, 0, W, H);
      ctx.drawImage(images.bgMid, midOffset + W, 0, W, H);

      const frontOffset = -(this.bgX * 0.48) % W;
      ctx.drawImage(images.bgFront, frontOffset, 0, W, H);
      ctx.drawImage(images.bgFront, frontOffset + W, 0, W, H);

      // Ground tiles
      const groundOffset = -(this.bgX * 1.1) % 256;
      for (let x = groundOffset - 256; x < W + 256; x += 256) {
        ctx.drawImage(images.ground, x, GROUND_Y - 12, 256, 116);
      }
    }

    drawHUD() {
      // top glass panel
      drawRoundedRect(22, 20, 410, 76, 18, "rgba(3,9,20,.55)", "rgba(0,217,255,.28)");
      drawText(`LEVEL ${this.level}/${MAX_LEVEL}`, 44, 52, 20, "left", "#00d9ff");
      drawText(`SCORE ${Math.floor(this.score)}`, 44, 82, 19, "left", "#eaf8ff", false);
      drawText(`COINS ${this.player.coins}`, 264, 82, 19, "left", "#ffe05a", false);

      const hp = clamp(this.player.health / this.player.maxHealth, 0, 1);
      drawRoundedRect(845, 26, 388, 30, 16, "rgba(0,0,0,.48)", "rgba(70,255,133,.32)");
      drawRoundedRect(850, 31, 378 * hp, 20, 12, hp < 0.3 ? "#ff3f4e" : "#46ff85", null);
      drawText(`HP ${Math.ceil(this.player.health)}/${this.player.maxHealth}`, 1038, 50, 16, "center", "#eaf8ff", false);
      if (W >= 900) {
        const supportText = this.healthAllowedThisLevel ? "HEALTH DROP: POSSIBLE" : "HEALTH DROP: OFF";
        drawText(supportText, 1038, 76, 12, "center", this.healthAllowedThisLevel ? "#46ff85" : "rgba(234,248,255,.7)", false);
      }

      if (this.combo > 1) {
        drawText(`COMBO x${this.combo.toFixed(1)}`, W - 44, 92, 22, "right", "#ff7122");
      }

      if (this.levelMessageTimer > 0 && this.state === "playing") {
        ctx.save();
        ctx.globalAlpha = clamp(this.levelMessageTimer, 0, 1);
        drawRoundedRect(430, 256, 420, 106, 28, "rgba(3,9,20,.72)", "rgba(255,113,34,.42)", 2);
        drawText(this.level % 10 === 0 ? "BOSS FIGHT" : `LEVEL ${this.level}`, W / 2, 310, 42, "center", this.level % 10 === 0 ? "#ff3f4e" : "#ff7122");
        drawText("Survive. Shoot. Upgrade your reflex.", W / 2, 344, 17, "center", "#eaf8ff", false);
        ctx.restore();
      }
    }

    drawMenu() {
      this.drawBackground();
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, W, H);
      drawText("NEON SECTOR 50", W / 2, 190, 64, "center", "#00d9ff");
      drawText("AI-style 2D shooting game with generated images", W / 2, 235, 22, "center", "#eaf8ff", false);

      drawRoundedRect(395, 292, 490, 230, 28, "rgba(3,9,20,.72)", "rgba(0,217,255,.35)", 2);
      drawText("MISSION", W / 2, 338, 26, "center", "#ff7122");
      drawText("Clear 50 levels. Boss fight every 10 levels.", W / 2, 378, 18, "center", "#eaf8ff", false);
      drawText("Enemies get faster, smarter and more accurate.", W / 2, 412, 18, "center", "#eaf8ff", false);
      drawText("Press ENTER or click to start", W / 2, 470, 24, "center", "#46ff85");
      drawText("Press M to mute/unmute sound", W / 2, 505, 15, "center", "rgba(234,248,255,.75)", false);
    }

    drawGameOver() {
      this.drawWorld();
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, W, H);
      drawText("GAME OVER", W / 2, 255, 66, "center", "#ff3f4e");
      drawText(`Reached Level ${this.level}  •  Score ${Math.floor(this.score)}`, W / 2, 310, 24, "center", "#eaf8ff", false);
      drawText("Press R to restart", W / 2, 375, 30, "center", "#46ff85");
    }

    drawWin() {
      this.drawWorld();
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, W, H);
      drawText("YOU CLEARED ALL 50 LEVELS", W / 2, 255, 48, "center", "#46ff85");
      drawText(`Final Score ${Math.floor(this.score)}  •  Coins ${this.player.coins}`, W / 2, 310, 24, "center", "#eaf8ff", false);
      drawText("Press R to play again", W / 2, 374, 28, "center", "#00d9ff");
    }

    drawPaused() {
      this.drawWorld();
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, W, H);
      drawText("PAUSED", W / 2, 310, 60, "center", "#00d9ff");
      drawText("Press P to resume", W / 2, 360, 24, "center", "#eaf8ff", false);
    }

    drawLevelClear() {
      this.drawWorld();
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(0, 0, W, H);
      drawText("LEVEL CLEAR", W / 2, 300, 50, "center", "#46ff85");
      drawText(this.level >= MAX_LEVEL ? "Final result incoming..." : "Next wave incoming...", W / 2, 342, 22, "center", "#eaf8ff", false);
      ctx.restore();
    }

    drawWorld() {
      ctx.save();
      if (this.shake > 0) {
        ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
      }
      this.drawBackground();
      this.crates.forEach((o) => o.draw());
      this.pickups.forEach((p) => p.draw());
      this.bullets.forEach((b) => b.draw());
      this.enemies.forEach((e) => e.draw());
      this.player.draw();
      this.explosions.forEach((e) => e.draw());
      this.particles.forEach((p) => p.draw());
      ctx.restore();
      this.drawHUD();
    }

    drawLoading() {
      ctx.fillStyle = "#050811";
      ctx.fillRect(0, 0, W, H);
      drawText("Loading AI game assets...", W / 2, 330, 34, "center", "#00d9ff");
      const pct = loaded / totalAssets;
      drawRoundedRect(390, 370, 500, 20, 10, "rgba(255,255,255,.1)", "rgba(0,217,255,.3)");
      drawRoundedRect(394, 374, 492 * pct, 12, 8, "#00d9ff", null);
    }

    draw() {
      if (this.state === "loading") this.drawLoading();
      else if (this.state === "menu") this.drawMenu();
      else if (this.state === "playing") this.drawWorld();
      else if (this.state === "paused") this.drawPaused();
      else if (this.state === "levelclear") this.drawLevelClear();
      else if (this.state === "gameover") this.drawGameOver();
      else if (this.state === "win") this.drawWin();
    }

    loop(now) {
      const dt = Math.min(0.033, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  const game = new Game();
  window.game = game;

  function setKey(code, value) {
    if (["ArrowLeft", "KeyA"].includes(code)) keys.left = value;
    if (["ArrowRight", "KeyD"].includes(code)) keys.right = value;
    if (["ArrowUp", "KeyW"].includes(code)) keys.up = value;
    if (["Space"].includes(code)) keys.shoot = value;
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(e.code)) {
      e.preventDefault();
    }
    setKey(e.code, true);

    if (pressed.has(e.code)) return;
    pressed.add(e.code);

    if (e.code === "Enter" && game.state === "menu") game.start();
    if (e.code === "KeyR" && ["gameover", "win"].includes(game.state)) game.start();
    if (e.code === "KeyP") {
      if (game.state === "playing") game.state = "paused";
      else if (game.state === "paused") game.state = "playing";
    }
    if (e.code === "KeyM") game.soundEnabled = !game.soundEnabled;
  });

  window.addEventListener("keyup", (e) => {
    setKey(e.code, false);
    pressed.delete(e.code);
  });

  canvas.addEventListener("pointerdown", () => {
    if (game.state === "menu") game.start();
    else if (game.state === "playing") keys.shoot = true;
  });

  canvas.addEventListener("pointerup", () => {
    keys.shoot = false;
  });

  canvas.addEventListener("pointerleave", () => {
    keys.shoot = false;
  });

  document.querySelectorAll("#mobile-controls button").forEach((button) => {
    const name = button.dataset.key;
    const on = (e) => {
      e.preventDefault();
      if (name === "left") keys.left = true;
      if (name === "right") keys.right = true;
      if (name === "jump") keys.up = true;
      if (name === "shoot") keys.shoot = true;
    };
    const off = (e) => {
      e.preventDefault();
      if (name === "left") keys.left = false;
      if (name === "right") keys.right = false;
      if (name === "jump") keys.up = false;
      if (name === "shoot") keys.shoot = false;
    };
    button.addEventListener("pointerdown", on);
    button.addEventListener("pointerup", off);
    button.addEventListener("pointerleave", off);
    button.addEventListener("pointercancel", off);
  });

  window.addEventListener("resize", fitCanvasWrap);
  window.addEventListener("orientationchange", fitCanvasWrap);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitCanvasWrap);
  }
  fitCanvasWrap();

  function loadAssets() {
    Object.entries(assetPaths).forEach(([key, path]) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === totalAssets) {
          game.state = "menu";
        }
      };
      img.onerror = () => {
        console.error(`Failed to load ${path}`);
        loaded++;
        if (loaded === totalAssets) game.state = "menu";
      };
      img.src = path;
      images[key] = img;
    });
  }

  loadAssets();
  requestAnimationFrame((t) => game.loop(t));
})();
