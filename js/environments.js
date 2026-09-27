import * as THREE from 'three';

/**
 * Environments Manager
 * Generates 5 dynamic revolving 3D background scenes:
 * 1. Cyber Highway & Speed Columns (Hero)
 * 2. Cyber Hangar & Telemetry Rings (About)
 * 3. 360° Studio Turntable Platform (Garage)
 * 4. Hot Wheels Neon Loop & Warp Tunnel (Projects)
 * 5. Digital Matrix & Synthwave Sunset (Skills & Contact)
 */

export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.environments = {};
    this.speedLines = null;
    this.speedLinesPos = null;
    this.activeSection = 'hero';
    this.scrollProgress = 0;
  }

  init() {
    this.createSpeedLines();
    this.createHeroHighway();
    this.createHangarScene();
    this.createStudioTurntable();
    this.createHotWheelsTunnel();
    this.createSynthwaveSunset();
  }

  /* ---------------------------------------------------------------
   * 1. HERO HIGHWAY & SPEED PARTICLES
   * --------------------------------------------------------------- */
  createHeroHighway() {
    const group = new THREE.Group();
    group.name = 'env-hero';

    // Reflective Road Grid
    const roadGeo = new THREE.PlaneGeometry(16, 200, 16, 100);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x050711,
      roughness: 0.15,
      metalness: 0.85
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.01, -30);
    group.add(road);

    // Glowing Neon Lane Streaks
    const laneGeo = new THREE.PlaneGeometry(0.2, 4);
    const laneMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let i = 0; i < 30; i++) {
      const leftStripe = new THREE.Mesh(laneGeo, laneMat);
      leftStripe.rotation.x = -Math.PI / 2;
      leftStripe.position.set(-2.5, 0.01, -i * 6 + 10);
      group.add(leftStripe);

      const rightStripe = new THREE.Mesh(laneGeo, laneMat);
      rightStripe.rotation.x = -Math.PI / 2;
      rightStripe.position.set(2.5, 0.01, -i * 6 + 10);
      group.add(rightStripe);
    }

    // Glowing Cyber Light Pillars on roadside
    for (let i = 0; i < 20; i++) {
      const pillarGeo = new THREE.BoxGeometry(0.3, 14, 0.3);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: i % 2 === 0 ? 0x00f0ff : 0xff007f,
        emissiveIntensity: 3.5
      });
      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-8, 5, -i * 12 + 10);
      group.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(8, 5, -i * 12 + 10);
      group.add(rightPillar);
    }

    this.scene.add(group);
    this.environments.hero = group;
  }

  // Speed lines rushing past
  createSpeedLines() {
    const count = 350;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6); // 2 vertices per line
    const colors = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = Math.random() * 18 - 1;
      const z = (Math.random() - 0.5) * 120;
      const len = 4 + Math.random() * 8;

      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z - len;

      const isCyan = Math.random() > 0.4;
      const r = isCyan ? 0.0 : 1.0;
      const g = isCyan ? 0.9 : 0.2;
      const b = isCyan ? 1.0 : 0.6;

      colors[i * 6] = r; colors[i * 6 + 1] = g; colors[i * 6 + 2] = b;
      colors[i * 6 + 3] = r; colors[i * 6 + 4] = g; colors[i * 6 + 5] = b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.speedLines = new THREE.LineSegments(geo, mat);
    this.speedLinesPos = positions;
    this.scene.add(this.speedLines);
  }

  /* ---------------------------------------------------------------
   * 2. CYBER HANGAR & TELEMETRY SCENE (ABOUT SECTION)
   * --------------------------------------------------------------- */
  createHangarScene() {
    const group = new THREE.Group();
    group.name = 'env-hangar';

    // Massive Architectural Arches
    for (let i = 0; i < 6; i++) {
      const archGeo = new THREE.TorusGeometry(12, 0.4, 8, 32, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({
        color: 0x181a24,
        metalness: 0.9,
        roughness: 0.2
      });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, 0, -i * 12 + 10);
      group.add(arch);

      // Arch neon accent light strip
      const stripGeo = new THREE.TorusGeometry(12.1, 0.08, 6, 32, Math.PI);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(0, 0, -i * 12 + 10);
      group.add(strip);
    }

    // Rotating Telemetry Hologram Rings
    this.telemetryRings = new THREE.Group();
    const ringRadii = [4.5, 5.5, 6.8];
    ringRadii.forEach((rad, idx) => {
      const ringGeo = new THREE.RingGeometry(rad, rad + 0.08, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0xffb703 : 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.telemetryRings.add(ring);
    });
    this.telemetryRings.position.set(0, 1.2, 0);
    group.add(this.telemetryRings);

    group.position.set(0, 0, -60);
    this.scene.add(group);
    this.environments.hangar = group;
  }

  /* ---------------------------------------------------------------
   * 3. 360° STUDIO TURNTABLE PLATFORM (GARAGE SECTION)
   * --------------------------------------------------------------- */
  createStudioTurntable() {
    const group = new THREE.Group();
    group.name = 'env-studio';

    // Turntable circular base
    const discGeo = new THREE.CylinderGeometry(5.2, 5.4, 0.25, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e17,
      metalness: 0.85,
      roughness: 0.12
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.12;
    disc.receiveShadow = true;
    group.add(disc);

    // Outer Glowing Ring on Turntable
    const ringGeo = new THREE.TorusGeometry(5.2, 0.06, 8, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.02;
    group.add(ring);

    // Studio Overhead Softbox Lights
    const softboxGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.2, 8);
    const softboxMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.0
    });
    const softbox = new THREE.Mesh(softboxGeo, softboxMat);
    softbox.position.set(0, 7.5, 0);
    group.add(softbox);

    // Studio Spotlight pointing directly at center
    const studioSpot = new THREE.SpotLight(0xffffff, 8, 25, Math.PI / 4, 0.4, 1.2);
    studioSpot.position.set(0, 7.4, 0);
    studioSpot.target.position.set(0, 0, 0);
    group.add(studioSpot);
    group.add(studioSpot.target);

    group.position.set(0, 0, -120);
    this.scene.add(group);
    this.environments.studio = group;
  }

  /* ---------------------------------------------------------------
   * 4. HOT WHEELS NEON LOOP & WARP TUNNEL (PROJECTS SECTION)
   * --------------------------------------------------------------- */
  createHotWheelsTunnel() {
    const group = new THREE.Group();
    group.name = 'env-hotwheels';

    // Iconic Hot Wheels Orange Curving Ribbon Track
    const curvePoints = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const angle = t * Math.PI * 2;
      const x = Math.sin(angle) * 14;
      const y = Math.cos(angle * 2) * 5 + 6;
      const z = -t * 100 + 40;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const trackGeo = new THREE.TubeGeometry(curve, 100, 1.2, 8, false);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0xff4500, // Hot Wheels bright orange
      emissive: 0xff2200,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.3
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    group.add(track);

    // Cyan Guide Light Rails flanking the orange track
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const railGeo = new THREE.TubeGeometry(curve, 80, 0.15, 6, false);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y += 0.8;
    group.add(rail);

    // Floating Holographic Geometric Nodes
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.IcosahedronGeometry(0.8 + Math.random() * 0.8, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff007f : 0x00f0ff,
        emissive: i % 2 === 0 ? 0xff007f : 0x00f0ff,
        emissiveIntensity: 1.5,
        wireframe: true
      });
      const node = new THREE.Mesh(geo, mat);
      node.position.set(
        (Math.random() - 0.5) * 35,
        Math.random() * 16 + 1,
        -i * 5 - 10
      );
      group.add(node);
    }

    group.position.set(0, 0, -180);
    this.scene.add(group);
    this.environments.hotwheels = group;
  }

  /* ---------------------------------------------------------------
   * 5. SYNTHWAVE SUNSET HORIZON (CONTACT & FINALE)
   * --------------------------------------------------------------- */
  createSynthwaveSunset() {
    const group = new THREE.Group();
    group.name = 'env-synthwave';

    // Massive Glowing Retro Sun
    const sunGeo = new THREE.CircleGeometry(16, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff385c,
      side: THREE.DoubleSide
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 9, -70);
    group.add(sun);

    // Sun horizontal slice effect (classic 80s synthwave sunset)
    for (let i = 0; i < 8; i++) {
      const sliceGeo = new THREE.PlaneGeometry(35, 0.45 + i * 0.15);
      const sliceMat = new THREE.MeshBasicMaterial({ color: 0x060713 });
      const slice = new THREE.Mesh(sliceGeo, sliceMat);
      slice.position.set(0, 3 + i * 1.2, -69.5);
      group.add(slice);
    }

    // Reflective Purple Water / Grid Plane
    const oceanGeo = new THREE.PlaneGeometry(120, 120, 40, 40);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x160029,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.05, -30);
    group.add(ocean);

    // Wireframe Grid overlay
    const gridHelper = new THREE.GridHelper(100, 30, 0xff00aa, 0x440077);
    gridHelper.position.set(0, 0, -30);
    group.add(gridHelper);

    group.position.set(0, 0, -250);
    this.scene.add(group);
    this.environments.synthwave = group;
  }

  /* ---------------------------------------------------------------
   * UPDATE ANIMATIONS & SCROLL REVOLVING
   * --------------------------------------------------------------- */
  update(delta, scrollProgress, speed = 1.0) {
    this.scrollProgress = scrollProgress;

    // 1. Move Speed Lines forward/backward
    if (this.speedLines && this.speedLinesPos) {
      const count = this.speedLinesPos.length / 6;
      for (let i = 0; i < count; i++) {
        this.speedLinesPos[i * 6 + 2] += delta * speed * 35.0;
        this.speedLinesPos[i * 6 + 5] += delta * speed * 35.0;

        if (this.speedLinesPos[i * 6 + 2] > 20) {
          this.speedLinesPos[i * 6 + 2] -= 120;
          this.speedLinesPos[i * 6 + 5] -= 120;
        }
      }
      this.speedLines.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Rotate Telemetry Rings
    if (this.telemetryRings) {
      this.telemetryRings.children.forEach((ring, idx) => {
        ring.rotation.z += delta * (0.3 + idx * 0.2);
      });
    }

    // 3. Revolve & smooth transition environments depending on scroll
    // Revolve whole scene slightly with scroll
    const rotY = Math.sin(scrollProgress * Math.PI * 2) * 0.35;
    if (this.environments.hotwheels) {
      this.environments.hotwheels.rotation.z += delta * 0.1;
    }
  }
}
