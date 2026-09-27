import { sound } from './audio.js';

export class UIManager {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.speed = 180;
    this.targetSpeed = 180;
    this.gear = 5;
    this.isFreeOrbit = false;
  }

  init() {
    this.setupLiquidGlassTilt();
    this.setupGarageControls();
    this.setupAudioToggle();
    this.setupTelemetryLoop();
    this.setupScrollListener();
    this.setupContactForm();
    this.setupNavLinks();
    this.setupHotWheelsEasterEgg();
    this.setupQueryParamNavigation();

    // Initialize Lucide icons if available
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  setupQueryParamNavigation() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('section');
    if (target) {
      const sectionMap = {
        'hero': 0,
        'about': 1,
        'garage': 2,
        'projects': 3,
        'skills': 4,
        'contact': 5
      };
      const idx = sectionMap[target];
      if (idx !== undefined) {
        window.scrollTo(0, idx * window.innerHeight);
        window.dispatchEvent(new Event('scroll'));
      } else {
        const el = document.getElementById(target);
        if (el) {
          window.scrollTo(0, el.offsetTop);
          window.dispatchEvent(new Event('scroll'));
        }
      }
    }
  }

  // 1. Interactive 3D Card Tilt with Specular Liquid Cursor Glow
  setupLiquidGlassTilt() {
    const cards = document.querySelectorAll('.liquid-glass, .liquid-glass-border, .interactive-tilt');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Set CSS variables for liquid specular highlight
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Subtle 3D tilt calculation
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5.0; // degrees
        const rotateY = ((x - centerX) / centerX) * 5.0;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  // 2. Supercar Garage Tuning Studio HUD Controls
  setupGarageControls() {
    const carManager = this.sm.carManager;
    if (!carManager) return;

    const carNameEl = document.getElementById('garage-car-name');
    const carTypeEl = document.getElementById('garage-car-type');
    const specEngineEl = document.getElementById('spec-engine');
    const specPowerEl = document.getElementById('spec-power');
    const specZeroEl = document.getElementById('spec-zero');
    const specTopEl = document.getElementById('spec-top');

    const updateCarHUD = () => {
      const activeCar = carManager.getActiveCar();
      if (!activeCar) return;

      if (carNameEl) carNameEl.textContent = activeCar.name;
      if (carTypeEl) carTypeEl.textContent = activeCar.type;
      if (activeCar.specs) {
        if (specEngineEl) specEngineEl.textContent = activeCar.specs.engine;
        if (specPowerEl) specPowerEl.textContent = activeCar.specs.power;
        if (specZeroEl) specZeroEl.textContent = activeCar.specs.acceleration;
        if (specTopEl) specTopEl.textContent = activeCar.specs.topSpeed;
      }
    };

    updateCarHUD();

    // Car Switcher Arrows
    const prevBtn = document.getElementById('car-prev-btn');
    const nextBtn = document.getElementById('car-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        sound.playClick(650);
        carManager.prevCar();
        updateCarHUD();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        sound.playClick(750);
        carManager.nextCar();
        updateCarHUD();
      });
    }

    // Paint Color Swatches
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        sound.playClick(900);
        carManager.setPaintColor(color);
      });
    });

    // Paint Finish Chips (Metallic, Matte, Chrome, Wireframe)
    const finishChips = document.querySelectorAll('.finish-chip');
    finishChips.forEach(chip => {
      chip.addEventListener('click', () => {
        finishChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const finish = chip.getAttribute('data-finish');
        sound.playClick(850);
        carManager.setPaintFinish(finish);
      });
    });

    // Headlight Toggle
    const headlightBtn = document.getElementById('toggle-headlights-btn');
    if (headlightBtn) {
      headlightBtn.addEventListener('click', () => {
        sound.playClick(1000);
        const isOn = carManager.toggleHeadlights();
        headlightBtn.classList.toggle('active', isOn);
        headlightBtn.querySelector('span').textContent = isOn ? 'HEADLIGHTS: ON' : 'HEADLIGHTS: OFF';
      });
    }

    // Underglow Toggle
    const underglowBtn = document.getElementById('toggle-underglow-btn');
    if (underglowBtn) {
      underglowBtn.addEventListener('click', () => {
        sound.playClick(950);
        const isOn = carManager.toggleUnderglow();
        underglowBtn.classList.toggle('active', isOn);
        underglowBtn.querySelector('span').textContent = isOn ? 'UNDERGLOW: ON' : 'UNDERGLOW: OFF';
      });
    }

    // Underglow Color Chips
    const underglowChips = document.querySelectorAll('.underglow-chip');
    underglowChips.forEach(chip => {
      chip.addEventListener('click', () => {
        underglowChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const color = chip.getAttribute('data-glow');
        sound.playClick(1100);
        carManager.setUnderglowColor(color);
      });
    });

    // REV ENGINE & NITRO BOOST BUTTON
    const revBtn = document.getElementById('rev-boost-btn');
    if (revBtn) {
      revBtn.addEventListener('click', () => {
        sound.revEngine(1.2);
        carManager.triggerExhaustFire();
        this.surgeSpeed(360);
      });
    }

    // 360° Free Orbit Inspection Button
    const orbitBtn = document.getElementById('inspect-360-btn');
    if (orbitBtn) {
      orbitBtn.addEventListener('click', () => {
        this.isFreeOrbit = !this.isFreeOrbit;
        this.sm.setFreeOrbit(this.isFreeOrbit);
        orbitBtn.classList.toggle('active', this.isFreeOrbit);
        sound.playClick(this.isFreeOrbit ? 1200 : 700);
        orbitBtn.querySelector('span').textContent = this.isFreeOrbit ? 'EXIT 360°' : 'INSPECT 360°';
      });
    }
  }

  // 3. Audio Mute / Unmute & Ambient Synthwave Toggle
  setupAudioToggle() {
    const soundBtn = document.getElementById('global-sound-btn');
    if (!soundBtn) return;

    soundBtn.addEventListener('click', () => {
      const isPlaying = sound.toggleSound();
      soundBtn.classList.toggle('playing', isPlaying);
      const label = soundBtn.querySelector('.sound-label');
      if (label) {
        label.textContent = isPlaying ? 'AUDIO: ON' : 'AUDIO: OFF';
      }
    });
  }

  // 4. Live Telemetry Speedometer & HUD
  setupTelemetryLoop() {
    const speedEl = document.getElementById('hud-speed-val');
    const gearEl = document.getElementById('hud-gear-val');
    const rpmEl = document.getElementById('hud-rpm-val');

    setInterval(() => {
      // Lerp speed
      this.speed += (this.targetSpeed - this.speed) * 0.08;
      // Slight road flutter
      const displaySpeed = Math.round(this.speed + (Math.random() - 0.5) * 2);

      if (speedEl) speedEl.textContent = displaySpeed;

      // Calculate Gear based on speed
      let g = '1';
      if (displaySpeed > 280) g = '7';
      else if (displaySpeed > 220) g = '6';
      else if (displaySpeed > 170) g = '5';
      else if (displaySpeed > 120) g = '4';
      else if (displaySpeed > 80) g = '3';
      else if (displaySpeed > 40) g = '2';
      else if (displaySpeed === 0) g = 'N';

      if (gearEl) gearEl.textContent = g;

      // RPM gauge
      const rpm = Math.round(3500 + (this.speed / 360) * 5500);
      if (rpmEl) rpmEl.textContent = rpm;

      // Recover target speed back to cruise speed 185 KM/H
      if (this.targetSpeed > 185) {
        this.targetSpeed -= 2.5;
      }
    }, 50);
  }

  surgeSpeed(amt = 340) {
    this.targetSpeed = amt;
  }

  // 5. Scroll Progress & Section Camera Waypoint Triggering
  setupScrollListener() {
    const progressBar = document.getElementById('scroll-progress-bar');
    let lastScroll = window.scrollY;

    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = window.scrollY;
      const progress = docHeight > 0 ? scrollY / docHeight : 0;

      // Update top progress bar
      if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
      }

      // Pass scroll progress to Three.js scene manager
      this.sm.setScrollProgress(progress);

      // Temporary speed bump on active scrolling
      const deltaScroll = Math.abs(scrollY - lastScroll);
      if (deltaScroll > 15) {
        this.targetSpeed = Math.min(320, this.targetSpeed + deltaScroll * 0.4);
      }
      lastScroll = scrollY;

      // Active nav link highlight
      this.updateActiveNavLink();
    }, { passive: true });
  }

  updateActiveNavLink() {
    const sections = ['hero', 'about', 'garage', 'projects', 'skills', 'contact'];
    const scrollPos = window.scrollY + 200;

    sections.forEach(id => {
      const el = document.getElementById(id);
      const link = document.querySelector(`.nav-link[href="#${id}"]`);
      if (el && link) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      }
    });
  }

  // 6. Contact Form Simulation
  setupContactForm() {
    const form = document.getElementById('portfolio-contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sound.playClick(1000);
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'TRANSMITTING TELEMETRY...';
      submitBtn.disabled = true;

      setTimeout(() => {
        sound.revEngine(0.8);
        submitBtn.textContent = 'TRANSMISSION RECEIVED!';
        submitBtn.style.background = 'linear-gradient(135deg, #00ff66, #00f0ff)';
        form.reset();

        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 3000);
      }, 1200);
    });
  }

  // 7. Smooth Nav Link Scrolling
  setupNavLinks() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          sound.playClick(800);
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // 8. Hot Wheels Easter Egg button
  setupHotWheelsEasterEgg() {
    const hwEasterEggBtn = document.getElementById('hw-easter-egg-btn');
    if (!hwEasterEggBtn) return;

    hwEasterEggBtn.addEventListener('click', () => {
      sound.revEngine(1.5);
      this.surgeSpeed(420);
      if (this.sm.carManager) {
        // Select Hot Wheels car
        this.sm.carManager.selectCar(1);
        this.sm.carManager.triggerExhaustFire();
      }
      // Smooth scroll to garage
      const garageEl = document.getElementById('garage');
      if (garageEl) {
        garageEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}
