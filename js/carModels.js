import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { DRACOLoader } from './libs/DRACOLoader.js';

/**
 * Supercar Manager
 * Handles multiple switchable supercars:
 * 1. Apex Italia 458 (High-fidelity GLTF Model with Draco decompression)
 * 2. Hot Wheels Twin-Flame Rod (Procedural iconic Hot Wheels racer)
 * 3. Cyberpunk Quadra Neo-Spec (Angular cyber wedge hypercar)
 * 4. Hyperion Track-One (Extreme Le Mans / GT3 track racer)
 */

export class CarManager {
  constructor(scene, envMap) {
    this.scene = scene;
    this.envMap = envMap;
    this.currentCarIndex = 0;
    this.cars = [];
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    // Car lighting references
    this.headlights = [];
    this.taillights = [];
    this.underglowLights = [];
    this.exhaustParticles = null;

    // State
    this.headlightsOn = true;
    this.underglowOn = true;
    this.underglowColor = 0x00f0ff;
    this.currentPaintColor = 0xff3b00; // Hot Wheels signature orange-red
    this.currentFinish = 'metallic';
    this.isRevving = false;
  }

  async init() {
    // 1. Build procedural Hot Wheels and Cyber cars
    this.buildHotWheelsCar();
    this.buildCyberpunkCar();
    this.buildHyperionTrackCar();

    // 2. Load GLTF Ferrari with DRACO decompression
    await this.loadGltfFerrari();

    // Default to Apex Ferrari (index 0)
    this.selectCar(0);
  }

  /* ---------------------------------------------------------------
   * 1. GLTF SUPERCAR (APEX ITALIA 458)
   * --------------------------------------------------------------- */
  async loadGltfFerrari() {
    return new Promise((resolve) => {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('./js/libs/draco/');

      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);

      const shadowTex = new THREE.TextureLoader().load('./assets/models/ferrari_ao.png');

      loader.load(
        './assets/models/ferrari.glb',
        (gltf) => {
          const carModel = gltf.scene.children[0];
          carModel.name = 'Apex Italia 458';
          carModel.rotation.y = Math.PI; // Face front forward
          carModel.position.set(0, 0, 0);

          const wheels = [];
          const paintMeshes = [];

          // PBR Materials
          const paintMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(this.currentPaintColor),
            metalness: 0.9,
            roughness: 0.15,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMap: this.envMap,
            envMapIntensity: 2.2
          });

          const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.25,
            roughness: 0.02,
            transmission: 0.9,
            transparent: true,
            opacity: 1.0,
            ior: 1.5,
            envMap: this.envMap,
            envMapIntensity: 2.5
          });

          const detailsMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.95,
            roughness: 0.1,
            envMap: this.envMap,
            envMapIntensity: 2.5
          });

          const carbonMaterial = new THREE.MeshStandardMaterial({
            color: 0x151518,
            roughness: 0.4,
            metalness: 0.8
          });

          // Assign materials to Ferrari parts
          const bodyPart = carModel.getObjectByName('body');
          if (bodyPart) {
            bodyPart.material = paintMaterial;
            paintMeshes.push(bodyPart);
          }

          const glassPart = carModel.getObjectByName('glass');
          if (glassPart) {
            glassPart.material = glassMaterial;
          }

          ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach(name => {
            const part = carModel.getObjectByName(name);
            if (part) part.material = detailsMaterial;
          });

          const carbonPart = carModel.getObjectByName('carbon_fibre_trim');
          if (carbonPart) carbonPart.material = carbonMaterial;

          // Collect wheels for animation
          ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach(name => {
            const w = carModel.getObjectByName(name);
            if (w) wheels.push(w);
          });

          // Ambient Occlusion Ground Contact Shadow
          const shadowMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
            new THREE.MeshBasicMaterial({
              map: shadowTex,
              blending: THREE.MultiplyBlending,
              toneMapped: false,
              transparent: true,
              premultipliedAlpha: true
            })
          );
          shadowMesh.rotation.x = -Math.PI / 2;
          shadowMesh.position.y = 0.01;
          shadowMesh.renderOrder = 2;
          carModel.add(shadowMesh);

          // Headlight Spotlights
          const leftHeadlight = new THREE.SpotLight(0xdff0ff, 9, 35, Math.PI / 6, 0.4, 1.2);
          leftHeadlight.position.set(-0.7, 0.65, 2.2);
          leftHeadlight.target.position.set(-0.7, 0, 12);
          carModel.add(leftHeadlight);
          carModel.add(leftHeadlight.target);

          const rightHeadlight = new THREE.SpotLight(0xdff0ff, 9, 35, Math.PI / 6, 0.4, 1.2);
          rightHeadlight.position.set(0.7, 0.65, 2.2);
          rightHeadlight.target.position.set(0.7, 0, 12);
          carModel.add(rightHeadlight);
          carModel.add(rightHeadlight.target);

          // Headlight Glow Sprites
          const glowTex = this.createGlowTexture();
          const glowMat = new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x90e0ef,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.9
          });
          const leftGlow = new THREE.Sprite(glowMat);
          leftGlow.scale.set(0.95, 0.95, 0.95);
          leftGlow.position.set(-0.7, 0.65, 2.05);
          carModel.add(leftGlow);

          const rightGlow = new THREE.Sprite(glowMat);
          rightGlow.scale.set(0.95, 0.95, 0.95);
          rightGlow.position.set(0.7, 0.65, 2.05);
          carModel.add(rightGlow);

          // Neon Underglow
          const underglow = new THREE.PointLight(this.underglowColor, 5, 4.5);
          underglow.position.set(0, 0.15, 0);
          carModel.add(underglow);

          const carData = {
            id: 'apex-ferrari',
            name: 'Apex Italia 458',
            type: 'Hypercar Spec // PBR Realtime Reflections',
            model: carModel,
            wheels: wheels,
            paintMeshes: paintMeshes,
            paintMaterial: paintMaterial,
            glassMaterial: glassMaterial,
            headlights: [leftHeadlight, rightHeadlight],
            glows: [leftGlow, rightGlow],
            underglow: underglow,
            exhaustPos: [new THREE.Vector3(-0.25, 0.45, -2.1), new THREE.Vector3(0.25, 0.45, -2.1)],
            specs: {
              engine: '4.5L Flat-Plane V8',
              power: '605 HP @ 9,000 RPM',
              acceleration: '3.0s (0-100)',
              topSpeed: '325 KM/H'
            }
          };

          // Insert as first car
          this.cars.unshift(carData);
          this.carGroup.add(carModel);
          resolve();
        },
        undefined,
        (err) => {
          console.error('Error loading GLTF Ferrari:', err);
          resolve();
        }
      );
    });
  }

  /* ---------------------------------------------------------------
   * 2. PROCEDURAL HOT WHEELS TWIN-FLAME ROD
   * --------------------------------------------------------------- */
  buildHotWheelsCar() {
    const hwGroup = new THREE.Group();
    hwGroup.name = 'Hot Wheels Twin-Flame';

    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff4500, // Spectraflame Orange
      metalness: 0.92,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMap: this.envMap,
      envMapIntensity: 2.8
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.05,
      envMap: this.envMap,
      envMapIntensity: 3.0
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.95,
      roughness: 0.15,
      envMap: this.envMap
    });

    const blackTireMat = new THREE.MeshStandardMaterial({
      color: 0x111113,
      roughness: 0.85,
      metalness: 0.1
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xff8c00,
      metalness: 0.2,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.9,
      envMap: this.envMap
    });

    const paintMeshes = [];
    const wheels = [];

    // Main Streamliner Chassis (Low-slung Hot Wheels hot rod)
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.38, 4.2);
    const chassis = new THREE.Mesh(chassisGeo, paintMaterial);
    chassis.position.y = 0.4;
    chassis.castShadow = true;
    hwGroup.add(chassis);
    paintMeshes.push(chassis);

    // Aerodynamic Nose Wedge
    const noseGeo = new THREE.ConeGeometry(0.8, 1.2, 5);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, paintMaterial);
    nose.position.set(0, 0.36, 2.5);
    hwGroup.add(nose);
    paintMeshes.push(nose);

    // Cockpit Bubble Canopy
    const canopyGeo = new THREE.SphereGeometry(0.65, 24, 16);
    canopyGeo.scale(1.05, 0.65, 1.7);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.72, -0.2);
    hwGroup.add(canopy);

    // Dual Exposed Massive Superchargers / Blowers (Twin Mill style)
    [-0.42, 0.42].forEach(x => {
      const blowerBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.65), chromeMaterial);
      blowerBase.position.set(x, 0.72, 1.0);
      hwGroup.add(blowerBase);

      const intakeScoop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.35, 16), chromeMaterial);
      intakeScoop.rotation.x = Math.PI / 2;
      intakeScoop.position.set(x, 0.95, 1.15);
      hwGroup.add(intakeScoop);

      const valve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xaa0000 })
      );
      valve.rotation.x = Math.PI / 2;
      valve.position.set(x, 0.95, 1.25);
      hwGroup.add(valve);
    });

    // Side Zoomie Drag Exhaust Pipes (4 on each side spitting flame)
    [-0.88, 0.88].forEach((x, isRight) => {
      for (let i = 0; i < 4; i++) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12), chromeMaterial);
        pipe.rotation.z = isRight ? -0.4 : 0.4;
        pipe.rotation.x = 0.3;
        pipe.position.set(x, 0.4, 0.5 - i * 0.25);
        hwGroup.add(pipe);
      }
    });

    // Rear High Drag Wing
    const wingSupportL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.65, 0.12), goldMaterial);
    wingSupportL.position.set(-0.55, 0.85, -1.7);
    const wingSupportR = wingSupportL.clone();
    wingSupportR.position.x = 0.55;
    hwGroup.add(wingSupportL, wingSupportR);

    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.07, 0.45), paintMaterial);
    wingBlade.position.set(0, 1.18, -1.75);
    wingBlade.rotation.x = -0.15;
    hwGroup.add(wingBlade);
    paintMeshes.push(wingBlade);

    // Front Wheels
    const frontWheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 24);
    frontWheelGeo.rotateZ(Math.PI / 2);
    [-0.92, 0.92].forEach(x => {
      const wheel = new THREE.Mesh(frontWheelGeo, blackTireMat);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 16), goldMaterial);
      rim.rotateZ(Math.PI / 2);
      wheel.add(rim);
      wheel.position.set(x, 0.35, 1.5);
      hwGroup.add(wheel);
      wheels.push(wheel);
    });

    // Rear Massive Drag Slicks
    const rearWheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.52, 28);
    rearWheelGeo.rotateZ(Math.PI / 2);
    [-0.98, 0.98].forEach(x => {
      const wheel = new THREE.Mesh(rearWheelGeo, blackTireMat);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.54, 20), goldMaterial);
      rim.rotateZ(Math.PI / 2);
      wheel.add(rim);
      wheel.position.set(x, 0.52, -1.35);
      hwGroup.add(wheel);
      wheels.push(wheel);
    });

    // Lights
    const leftHeadlight = new THREE.SpotLight(0xffaa00, 8, 28, Math.PI / 5, 0.3, 1.5);
    leftHeadlight.position.set(-0.55, 0.45, 2.4);
    leftHeadlight.target.position.set(-0.55, 0, 10);
    hwGroup.add(leftHeadlight);
    hwGroup.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xffaa00, 8, 28, Math.PI / 5, 0.3, 1.5);
    rightHeadlight.position.set(0.55, 0.45, 2.4);
    rightHeadlight.target.position.set(0.55, 0, 10);
    hwGroup.add(rightHeadlight);
    hwGroup.add(rightHeadlight.target);

    const glowTex = this.createGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xff7b00,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9
    });
    const leftGlow = new THREE.Sprite(glowMat);
    leftGlow.scale.set(0.8, 0.8, 0.8);
    leftGlow.position.set(-0.55, 0.45, 2.4);
    hwGroup.add(leftGlow);

    const rightGlow = new THREE.Sprite(glowMat);
    rightGlow.scale.set(0.8, 0.8, 0.8);
    rightGlow.position.set(0.55, 0.45, 2.4);
    hwGroup.add(rightGlow);

    const underglow = new THREE.PointLight(0xff3c00, 5, 4.5);
    underglow.position.set(0, 0.15, 0);
    hwGroup.add(underglow);

    const carData = {
      id: 'hotwheels-twin',
      name: 'Hot Wheels Twin-Flame',
      type: 'Diecast Muscle Concept // Twin-Blower V8',
      model: hwGroup,
      wheels: wheels,
      paintMeshes: paintMeshes,
      paintMaterial: paintMaterial,
      glassMaterial: glassMat,
      headlights: [leftHeadlight, rightHeadlight],
      glows: [leftGlow, rightGlow],
      underglow: underglow,
      exhaustPos: [
        new THREE.Vector3(-0.9, 0.4, 0.2),
        new THREE.Vector3(0.9, 0.4, 0.2),
        new THREE.Vector3(0, 0.55, -2.0)
      ],
      specs: {
        engine: 'Twin-Supercharged 8.4L V8',
        power: '1,400 BHP',
        acceleration: '1.8s (0-100)',
        topSpeed: '410 KM/H'
      }
    };

    this.cars.push(carData);
    this.carGroup.add(hwGroup);
    hwGroup.visible = false;
  }

  /* ---------------------------------------------------------------
   * 3. CYBERPUNK 2077 QUADRA NEO-SPEC
   * --------------------------------------------------------------- */
  buildCyberpunkCar() {
    const cyberGroup = new THREE.Group();
    cyberGroup.name = 'Cyberpunk Quadra Neo-Spec';

    const cyberPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0c14,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 0.7,
      envMap: this.envMap,
      envMapIntensity: 2.2
    });

    const neonCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 5.0,
      roughness: 0.1
    });

    const neonPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 4.5,
      roughness: 0.1
    });

    const cyberGlass = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.75,
      transparent: true,
      opacity: 0.85,
      envMap: this.envMap
    });

    const wheels = [];
    const paintMeshes = [];

    // Wedge Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.38, 4.2);
    const body = new THREE.Mesh(bodyGeo, cyberPaintMat);
    body.position.y = 0.42;
    cyberGroup.add(body);
    paintMeshes.push(body);

    // Front wedge angle
    const wedgeGeo = new THREE.CylinderGeometry(0.05, 1.8, 1.1, 3);
    wedgeGeo.rotateY(Math.PI / 6);
    wedgeGeo.rotateX(Math.PI / 2);
    const wedge = new THREE.Mesh(wedgeGeo, cyberPaintMat);
    wedge.position.set(0, 0.35, 2.4);
    cyberGroup.add(wedge);
    paintMeshes.push(wedge);

    // Cockpit
    const roofGeo = new THREE.BoxGeometry(1.15, 0.4, 1.8);
    const roof = new THREE.Mesh(roofGeo, cyberGlass);
    roof.position.set(0, 0.76, 0.1);
    cyberGroup.add(roof);

    // Neon Vector Lightbars
    const lightbarGeo = new THREE.BoxGeometry(1.65, 0.05, 0.08);
    const lightbar = new THREE.Mesh(lightbarGeo, neonCyanMat);
    lightbar.position.set(0, 0.48, 2.15);
    cyberGroup.add(lightbar);

    const rearLightbarGeo = new THREE.BoxGeometry(1.7, 0.06, 0.06);
    const rearLightbar = new THREE.Mesh(rearLightbarGeo, neonPinkMat);
    rearLightbar.position.set(0, 0.52, -2.1);
    cyberGroup.add(rearLightbar);

    // Turbofan Aerodisc Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
    const wheelPositions = [
      [-0.92, 0.36, 1.35], [0.92, 0.36, 1.35],
      [-0.92, 0.4, -1.3], [0.92, 0.4, -1.3]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheelGeo = new THREE.CylinderGeometry(y, y, 0.32, 28);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, tireMat);

      const disc = new THREE.Mesh(new THREE.CylinderGeometry(y * 0.75, y * 0.75, 0.34, 6), neonCyanMat);
      disc.rotateZ(Math.PI / 2);
      wheel.add(disc);

      wheel.position.set(x, y, z);
      cyberGroup.add(wheel);
      wheels.push(wheel);
    });

    // Lights
    const leftHeadlight = new THREE.SpotLight(0x00f0ff, 9, 32, Math.PI / 5, 0.25, 1.4);
    leftHeadlight.position.set(-0.6, 0.5, 2.2);
    leftHeadlight.target.position.set(-0.6, 0, 10);
    cyberGroup.add(leftHeadlight);
    cyberGroup.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0x00f0ff, 9, 32, Math.PI / 5, 0.25, 1.4);
    rightHeadlight.position.set(0.6, 0.5, 2.2);
    rightHeadlight.target.position.set(0.6, 0, 10);
    cyberGroup.add(rightHeadlight);
    cyberGroup.add(rightHeadlight.target);

    const glowTex = this.createGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x00f0ff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.95
    });
    const leftGlow = new THREE.Sprite(glowMat);
    leftGlow.scale.set(0.85, 0.85, 0.85);
    leftGlow.position.set(-0.6, 0.5, 2.2);
    cyberGroup.add(leftGlow);

    const rightGlow = new THREE.Sprite(glowMat);
    rightGlow.scale.set(0.85, 0.85, 0.85);
    rightGlow.position.set(0.6, 0.5, 2.2);
    cyberGroup.add(rightGlow);

    const underglow = new THREE.PointLight(0x00f0ff, 6, 5);
    underglow.position.set(0, 0.15, 0);
    cyberGroup.add(underglow);

    const carData = {
      id: 'cyberpunk-quadra',
      name: 'Cyberpunk Quadra Neo-Spec',
      type: 'Futuristic Cyber Wedge // Quad-Flux Turbine',
      model: cyberGroup,
      wheels: wheels,
      paintMeshes: paintMeshes,
      paintMaterial: cyberPaintMat,
      glassMaterial: cyberGlass,
      headlights: [leftHeadlight, rightHeadlight],
      glows: [leftGlow, rightGlow],
      underglow: underglow,
      exhaustPos: [new THREE.Vector3(-0.35, 0.42, -2.1), new THREE.Vector3(0.35, 0.42, -2.1)],
      specs: {
        engine: 'Quad-Flux Hydrogen Turbine',
        power: '1,250 kW (1,675 HP)',
        acceleration: '1.6s (0-100)',
        topSpeed: '425 KM/H'
      }
    };

    this.cars.push(carData);
    this.carGroup.add(cyberGroup);
    cyberGroup.visible = false;
  }

  /* ---------------------------------------------------------------
   * 4. HYPERION TRACK-ONE (EXTREME LE MANS AERO HYPERCAR)
   * --------------------------------------------------------------- */
  buildHyperionTrackCar() {
    const trackGroup = new THREE.Group();
    trackGroup.name = 'Hyperion Track-One';

    const trackPaint = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      metalness: 0.85,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMap: this.envMap,
      envMapIntensity: 2.5
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.4,
      metalness: 0.8
    });

    const neonYellow = new THREE.MeshStandardMaterial({
      color: 0xccff00,
      emissive: 0xccff00,
      emissiveIntensity: 4.0
    });

    const wheels = [];
    const paintMeshes = [];

    // Pod
    const podGeo = new THREE.BoxGeometry(1.25, 0.32, 3.8);
    const pod = new THREE.Mesh(podGeo, trackPaint);
    pod.position.y = 0.38;
    trackGroup.add(pod);
    paintMeshes.push(pod);

    // Bubble Canopy
    const canopyGeo = new THREE.SphereGeometry(0.52, 20, 16);
    canopyGeo.scale(1.0, 0.62, 1.9);
    const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshPhysicalMaterial({
      color: 0x051b2c,
      transmission: 0.85,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      envMap: this.envMap
    }));
    canopy.position.set(0, 0.65, -0.1);
    trackGroup.add(canopy);

    // Front Splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.85), carbonMat);
    splitter.position.set(0, 0.14, 2.0);
    trackGroup.add(splitter);

    // Rear High GT3 Wing
    const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 1.5), carbonMat);
    sharkFin.position.set(0, 0.85, -1.05);
    trackGroup.add(sharkFin);

    const gtWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.5), carbonMat);
    gtWing.position.set(0, 1.2, -1.95);
    gtWing.rotation.x = -0.18;
    trackGroup.add(gtWing);

    [-1.1, 1.1].forEach(x => {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.55), neonYellow);
      ep.position.set(x, 1.2, -1.95);
      trackGroup.add(ep);
    });

    // Wheels
    const wheelPositions = [
      [-0.95, 0.36, 1.3], [0.95, 0.36, 1.3],
      [-0.98, 0.4, -1.3], [0.98, 0.4, -1.3]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wGeo = new THREE.CylinderGeometry(y, y, 0.34, 28);
      wGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wGeo, new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.85 }));

      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.38, 12), neonYellow);
      nut.rotateZ(Math.PI / 2);
      wheel.add(nut);

      wheel.position.set(x, y, z);
      trackGroup.add(wheel);
      wheels.push(wheel);
    });

    // Lights
    const leftHeadlight = new THREE.SpotLight(0xccff00, 8, 30, Math.PI / 5, 0.3, 1.3);
    leftHeadlight.position.set(-0.65, 0.42, 2.1);
    leftHeadlight.target.position.set(-0.65, 0, 10);
    trackGroup.add(leftHeadlight);
    trackGroup.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xccff00, 8, 30, Math.PI / 5, 0.3, 1.3);
    rightHeadlight.position.set(0.65, 0.42, 2.1);
    rightHeadlight.target.position.set(0.65, 0, 10);
    trackGroup.add(rightHeadlight);
    trackGroup.add(rightHeadlight.target);

    const glowTex = this.createGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xccff00,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.95
    });
    const leftGlow = new THREE.Sprite(glowMat);
    leftGlow.scale.set(0.8, 0.8, 0.8);
    leftGlow.position.set(-0.65, 0.42, 2.1);
    trackGroup.add(leftGlow);

    const rightGlow = new THREE.Sprite(glowMat);
    rightGlow.scale.set(0.8, 0.8, 0.8);
    rightGlow.position.set(0.65, 0.42, 2.1);
    trackGroup.add(rightGlow);

    const underglow = new THREE.PointLight(0x00e5ff, 5, 4.5);
    underglow.position.set(0, 0.15, 0);
    trackGroup.add(underglow);

    const carData = {
      id: 'hyperion-track',
      name: 'Hyperion Track-One',
      type: 'Le Mans Prototype Aero // V10 Hybrid Kers',
      model: trackGroup,
      wheels: wheels,
      paintMeshes: paintMeshes,
      paintMaterial: trackPaint,
      glassMaterial: null,
      headlights: [leftHeadlight, rightHeadlight],
      glows: [leftGlow, rightGlow],
      underglow: underglow,
      exhaustPos: [new THREE.Vector3(0, 0.6, -1.9)],
      specs: {
        engine: 'V10 Hybrid KERS Aero-Boost',
        power: '1,050 BHP @ 10,500 RPM',
        acceleration: '2.1s (0-100)',
        topSpeed: '380 KM/H'
      }
    };

    this.cars.push(carData);
    this.carGroup.add(trackGroup);
    trackGroup.visible = false;
  }

  /* ---------------------------------------------------------------
   * CAR SELECTION & CUSTOMIZATION
   * --------------------------------------------------------------- */
  selectCar(index) {
    if (index < 0 || index >= this.cars.length) return;
    this.currentCarIndex = index;

    this.cars.forEach((car, i) => {
      car.model.visible = i === index;
    });

    const activeCar = this.getActiveCar();
    if (activeCar) {
      this.applyPaint(this.currentPaintColor, this.currentFinish);
      this.toggleHeadlights(this.headlightsOn);
      this.setUnderglowColor(this.underglowColor);
      this.toggleUnderglow(this.underglowOn);
    }

    return activeCar;
  }

  nextCar() {
    const nextIdx = (this.currentCarIndex + 1) % this.cars.length;
    return this.selectCar(nextIdx);
  }

  prevCar() {
    const prevIdx = (this.currentCarIndex - 1 + this.cars.length) % this.cars.length;
    return this.selectCar(prevIdx);
  }

  getActiveCar() {
    return this.cars[this.currentCarIndex] || null;
  }

  setPaintColor(hex) {
    this.currentPaintColor = hex;
    this.applyPaint(hex, this.currentFinish);
  }

  setPaintFinish(finish) {
    this.currentFinish = finish;
    this.applyPaint(this.currentPaintColor, finish);
  }

  applyPaint(hex, finish = 'metallic') {
    const activeCar = this.getActiveCar();
    if (!activeCar || !activeCar.paintMaterial) return;

    const col = new THREE.Color(hex);
    activeCar.paintMaterial.color.copy(col);

    if (finish === 'metallic') {
      activeCar.paintMaterial.metalness = 0.9;
      activeCar.paintMaterial.roughness = 0.15;
      activeCar.paintMaterial.clearcoat = 1.0;
      activeCar.paintMaterial.wireframe = false;
    } else if (finish === 'matte') {
      activeCar.paintMaterial.metalness = 0.2;
      activeCar.paintMaterial.roughness = 0.75;
      activeCar.paintMaterial.clearcoat = 0.1;
      activeCar.paintMaterial.wireframe = false;
    } else if (finish === 'chrome') {
      activeCar.paintMaterial.metalness = 1.0;
      activeCar.paintMaterial.roughness = 0.02;
      activeCar.paintMaterial.clearcoat = 1.0;
      activeCar.paintMaterial.wireframe = false;
    } else if (finish === 'wireframe') {
      activeCar.paintMaterial.wireframe = true;
      activeCar.paintMaterial.color.set(0x00f0ff);
    }
  }

  toggleHeadlights(forceState) {
    this.headlightsOn = forceState !== undefined ? forceState : !this.headlightsOn;
    const activeCar = this.getActiveCar();
    if (!activeCar) return this.headlightsOn;

    activeCar.headlights.forEach(hl => {
      hl.visible = this.headlightsOn;
    });
    activeCar.glows.forEach(g => {
      g.visible = this.headlightsOn;
    });

    return this.headlightsOn;
  }

  toggleUnderglow(forceState) {
    this.underglowOn = forceState !== undefined ? forceState : !this.underglowOn;
    const activeCar = this.getActiveCar();
    if (!activeCar || !activeCar.underglow) return this.underglowOn;

    activeCar.underglow.visible = this.underglowOn;
    return this.underglowOn;
  }

  setUnderglowColor(hex) {
    this.underglowColor = hex;
    const activeCar = this.getActiveCar();
    if (!activeCar || !activeCar.underglow) return;

    activeCar.underglow.color.set(hex);
  }

  // Trigger exhaust fire particles when revving
  triggerExhaustFire() {
    this.isRevving = true;
    const activeCar = this.getActiveCar();
    if (!activeCar || !activeCar.exhaustPos) return;

    const particleCount = 45;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    activeCar.exhaustPos.forEach((pos) => {
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.12;
        positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.12;
        positions[i * 3 + 2] = pos.z - Math.random() * 0.9;

        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.35 + Math.random() * 0.5;
        colors[i * 3 + 2] = 0.05;
      }
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const flames = new THREE.Points(geo, mat);
    activeCar.model.add(flames);

    let progress = 0;
    const flameInterval = setInterval(() => {
      progress += 0.05;
      mat.opacity = Math.max(0, 1 - progress);
      flames.position.z -= 0.06;
      if (progress >= 1) {
        clearInterval(flameInterval);
        activeCar.model.remove(flames);
        geo.dispose();
        mat.dispose();
        this.isRevving = false;
      }
    }, 16);
  }

  // Animate car wheels and sports suspension vibration
  update(delta, speed = 1.0) {
    const activeCar = this.getActiveCar();
    if (!activeCar) return;

    // Spin wheels
    if (activeCar.wheels) {
      activeCar.wheels.forEach(wheel => {
        wheel.rotation.x -= delta * speed * 12.0;
      });
    }

    // Subtle sports suspension vibration
    const vibration = Math.sin(Date.now() * 0.02) * 0.003 * (speed > 0.1 ? 1 : 0.2);
    activeCar.model.position.y = vibration;
  }

  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(120,230,255,0.85)');
    grad.addColorStop(0.6, 'rgba(30,120,255,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(canvas);
  }
}
