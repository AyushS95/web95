import * as THREE from 'three';
import { RGBELoader } from 'three/addons/RGBELoader.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CarManager } from './carModels.js';
import { EnvironmentManager } from './environments.js';

export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.carManager = null;
    this.envManager = null;
    this.controls = null;
    this.isFreeOrbit = false;

    // Camera waypoint trajectory across sections
    // Frames the supercar dynamically across different sections
    this.cameraWaypoints = [
      // Hero (0.0): Front 3/4 angle, framing supercar gracefully on the right side
      { progress: 0.00, pos: new THREE.Vector3(-1.3, 1.2, 4.6), target: new THREE.Vector3(2.2, 0.45, 0) },
      // About (0.22): Telemetry side profile in Cyber Hangar
      { progress: 0.22, pos: new THREE.Vector3(-3.8, 1.5, 2.4), target: new THREE.Vector3(0, 0.55, 0) },
      // Showcase (0.45): 360° Studio Turntable Showcase
      { progress: 0.45, pos: new THREE.Vector3(3.2, 1.8, 3.6), target: new THREE.Vector3(0, 0.5, 0) },
      // Projects (0.70): Hot Wheels orange track chase / banking angle
      { progress: 0.70, pos: new THREE.Vector3(-1.6, 2.5, -4.0), target: new THREE.Vector3(0, 0.8, 1.0) },
      // Skills & Contact (1.00): Wide cinematic Synthwave sunset
      { progress: 1.00, pos: new THREE.Vector3(2.5, 1.4, 5.2), target: new THREE.Vector3(0, 0.55, 0) }
    ];

    this.currentCamPos = new THREE.Vector3(-1.3, 1.2, 4.6);
    this.currentTarget = new THREE.Vector3(2.2, 0.45, 0);
    this.targetCamPos = new THREE.Vector3(-1.3, 1.2, 4.6);
    this.targetLookAt = new THREE.Vector3(2.2, 0.45, 0);

    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.scrollProgress = 0;
    this.clock = new THREE.Clock();
    this.speed = 1.0;
  }

  async init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060713, 0.015);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.copy(this.currentCamPos);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls (for interactive 360 inspect mode in garage)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 14;
    this.controls.enabled = false;

    // 5. Lighting
    this.setupLighting();

    // 6. Load HDR Environment Map for Realistic Clearcoat Reflections
    await this.loadEnvironmentMap();

    // 7. Initialize Dynamic Revolving 3D Background Environments
    this.envManager = new EnvironmentManager(this.scene);
    this.envManager.init();

    // 8. Initialize Supercar Manager
    this.carManager = new CarManager(this.scene, this.hdrEnvMap);
    await this.carManager.init();

    // 9. Event Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 10. Start Animation Loop
    this.animate();
  }

  setupLighting() {
    // Ambient soft blue/purple fill
    const ambient = new THREE.AmbientLight(0x1a2138, 1.4);
    this.scene.add(ambient);

    // Key Rim Light
    const keyLight = new THREE.DirectionalLight(0xdff4ff, 3.8);
    keyLight.position.set(10, 20, 15);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Dramatic Cyan Fill Light
    const cyanLight = new THREE.DirectionalLight(0x00f0ff, 2.2);
    cyanLight.position.set(-15, 12, -10);
    this.scene.add(cyanLight);

    // Warm Magenta Accent Rim Light
    const magentaLight = new THREE.DirectionalLight(0xff007f, 2.0);
    magentaLight.position.set(12, 8, -15);
    this.scene.add(magentaLight);
  }

  async loadEnvironmentMap() {
    return new Promise((resolve) => {
      const loader = new RGBELoader();
      loader.load(
        './assets/textures/sunset.hdr',
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.hdrEnvMap = texture;
          this.scene.environment = texture;
          resolve();
        },
        undefined,
        (err) => {
          console.warn('HDR texture fallback', err);
          resolve();
        }
      );
    });
  }

  setScrollProgress(progress) {
    this.scrollProgress = Math.max(0, Math.min(1, progress));

    if (this.isFreeOrbit) return;

    // Interpolate camera position and target between waypoints
    const points = this.cameraWaypoints;
    let idx = 0;
    for (let i = 0; i < points.length - 1; i++) {
      if (progress >= points[i].progress && progress <= points[i + 1].progress) {
        idx = i;
        break;
      }
    }

    const pA = points[idx];
    const pB = points[idx + 1] || points[points.length - 1];
    const range = (pB.progress - pA.progress) || 1;
    const factor = THREE.MathUtils.clamp((progress - pA.progress) / range, 0, 1);

    const ease = factor * factor * (3 - 2 * factor);

    this.targetCamPos.lerpVectors(pA.pos, pB.pos, ease);
    this.targetLookAt.lerpVectors(pA.target, pB.target, ease);
  }

  setFreeOrbit(enabled) {
    this.isFreeOrbit = enabled;
    if (this.controls) {
      this.controls.enabled = enabled;
      if (enabled) {
        this.controls.target.set(0, 0.5, 0);
      }
    }
  }

  onMouseMove(e) {
    this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // Smooth mouse lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Update camera trajectory if not in free orbit mode
    if (!this.isFreeOrbit) {
      this.currentCamPos.lerp(this.targetCamPos, 0.07);
      this.currentTarget.lerp(this.targetLookAt, 0.07);

      this.camera.position.x = this.currentCamPos.x + this.mouse.x * 0.35;
      this.camera.position.y = this.currentCamPos.y - this.mouse.y * 0.2;
      this.camera.position.z = this.currentCamPos.z;

      this.camera.lookAt(this.currentTarget);
    } else {
      this.controls.update();
    }

    // Dynamic car rotation & animation
    if (this.carManager && !this.isFreeOrbit) {
      const carGroup = this.carManager.carGroup;
      
      // Interpolate position: x=2.3 on hero, smoothly moves to x=0 on garage
      const targetPosX = THREE.MathUtils.lerp(2.3, 0.0, Math.min(1, this.scrollProgress * 2.5));
      carGroup.position.x += (targetPosX - carGroup.position.x) * 0.06;

      // Revolve car with scroll
      const targetRotY = Math.sin(this.scrollProgress * Math.PI * 1.5) * 0.45;
      carGroup.rotation.y += (targetRotY - carGroup.rotation.y) * 0.05;

      this.carManager.update(delta, this.speed);
    }

    // Update dynamic background environments
    if (this.envManager) {
      this.envManager.update(delta, this.scrollProgress, this.speed);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
