import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getStageLabels, getZClipByOffset, normalizeBuild } from './frameMath.js';

const SCALE = 0.1;

function sceneThemeColors(theme) {
  return theme === 'light'
    ? { background: 0xf2f5f8, gridMajor: 0x94a3b8, gridMinor: 0xcbd5e1 }
    : { background: 0x0c1117, gridMajor: 0x334155, gridMinor: 0x1f2937 };
}

export class FrameViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1117);
    this.projectionMode = 'perspective';
    this.camera = this.createCamera();
    this.camera.position.set(5.5, 4.2, 6.4);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoverTooltip = this.createHoverTooltip();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('change', () => this.emitCameraChange());
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 8, 4);
    key.castShadow = true;
    this.scene.add(key);
    const underside = new THREE.DirectionalLight(0x9fc5ff, 0.75);
    underside.position.set(-3, -5, 4);
    this.scene.add(underside);
    this.grid = this.createGrid('dark');
    this.scene.add(this.grid);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.canvas.addEventListener('pointerleave', () => this.hideHoverTooltip());
    this.animate();
  }

  createHoverTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'viewerTooltip hidden';
    tooltip.setAttribute('role', 'status');
    tooltip.setAttribute('aria-live', 'polite');
    this.canvas.parentElement.appendChild(tooltip);
    return tooltip;
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster
      .intersectObjects(this.root.children, true)
      .find((intersection) => intersection.object.userData?.partInfo);
    if (!hit) {
      this.hideHoverTooltip();
      return;
    }
    this.showHoverTooltip(hit.object.userData.partInfo, event.clientX - rect.left, event.clientY - rect.top);
  }

  showHoverTooltip(part, x, y) {
    if (!this.hoverTooltip) return;
    this.hoverTooltip.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = part.role || part.name || 'Part';
    const id = document.createElement('span');
    id.textContent = part.id || '';
    this.hoverTooltip.append(title, id);
    const details = [
      part.meta?.group ? `Group: ${part.meta.group}` : null,
      part.size ? `Size: ${formatPartSize(part.size)}` : null,
      part.position ? `Center: ${formatPartPosition(part.position)}` : null
    ].filter(Boolean);
    details.forEach((line) => {
      const item = document.createElement('span');
      item.textContent = line;
      this.hoverTooltip.appendChild(item);
    });
    this.hoverTooltip.style.left = `${Math.min(x + 14, this.canvas.parentElement.clientWidth - 220)}px`;
    this.hoverTooltip.style.top = `${Math.max(8, y + 14)}px`;
    this.hoverTooltip.classList.remove('hidden');
  }

  hideHoverTooltip() {
    this.hoverTooltip?.classList.add('hidden');
  }

  getCameraPosition() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
  }

  getTargetPosition() {
    return {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z
    };
  }

  getProjectionMode() {
    return this.projectionMode;
  }

  toggleProjectionMode() {
    this.setProjectionMode(this.projectionMode === 'perspective' ? 'iso' : 'perspective');
  }

  setProjectionMode(mode) {
    const nextMode = mode === 'iso' ? 'iso' : 'perspective';
    if (nextMode === this.projectionMode && this.camera) return;
    const oldPosition = this.camera?.position.clone() || new THREE.Vector3(5.5, 4.2, 6.4);
    const oldTarget = this.controls?.target.clone() || new THREE.Vector3(0, 0, 0);
    this.projectionMode = nextMode;
    const nextCamera = this.createCamera();
    nextCamera.position.copy(oldPosition);
    nextCamera.up.copy(this.camera.up);
    this.camera = nextCamera;
    if (this.controls) this.controls.dispose();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.copy(oldTarget);
    this.controls.addEventListener('change', () => this.emitCameraChange());
    this.resize();
    this.controls.update();
  }

  createCamera() {
    if (this.projectionMode === 'iso') {
      const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.01, 100);
      camera.zoom = 1;
      return camera;
    }
    return new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  }

  setCameraPosition(position, target) {
    const x = Number(position.x);
    const y = Number(position.y);
    const z = Number(position.z);
    if (![x, y, z].every(Number.isFinite)) return;
    if (target) {
      const tx = Number(target.x);
      const ty = Number(target.y);
      const tz = Number(target.z);
      if ([tx, ty, tz].every(Number.isFinite)) this.controls.target.set(tx, ty, tz);
    }
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.emitCameraChange();
  }

  onCameraChange(callback) {
    this.cameraChangeCallback = callback;
  }

  emitCameraChange() {
    this.cameraChangeCallback?.({ camera: this.getCameraPosition(), target: this.getTargetPosition() });
  }

  update(plan, result) {
    this.plan = plan;
    this.result = result;
    this.applySceneTheme(plan?.modelScene || 'dark');
    this.build();
  }

  createGrid(theme) {
    const colors = sceneThemeColors(theme);
    const grid = new THREE.GridHelper(8, 16, colors.gridMajor, colors.gridMinor);
    grid.userData.theme = theme === 'light' ? 'light' : 'dark';
    return grid;
  }

  applySceneTheme(theme) {
    const mode = theme === 'light' ? 'light' : 'dark';
    const colors = sceneThemeColors(mode);
    this.scene.background = new THREE.Color(colors.background);
    if (this.grid?.userData?.theme === mode) return;
    const wasVisible = this.grid ? this.grid.visible : true;
    if (this.grid) {
      this.scene.remove(this.grid);
      disposeObject(this.grid);
    }
    this.grid = this.createGrid(mode);
    this.grid.userData.theme = mode;
    this.grid.visible = wasVisible;
    this.scene.add(this.grid);
  }

  captureImage(options = {}) {
    if (!this.plan || !this.result?.ok) return null;
    const oldPlan = this.plan;
    const oldManualCamera = this.manualCamera;
    const oldPosition = this.camera.position.clone();
    const oldTarget = this.controls.target.clone();
    const oldUp = this.camera.up.clone();
    const oldGridVisible = this.grid.visible;
    const oldBackground = this.scene.background;
    const oldAspect = this.camera.aspect;
    const oldNear = this.camera.near;
    const oldFar = this.camera.far;
    const oldOrtho = this.camera.isOrthographicCamera ? {
      left: this.camera.left,
      right: this.camera.right,
      top: this.camera.top,
      bottom: this.camera.bottom,
      zoom: this.camera.zoom
    } : null;
    let captureRenderer = null;

    try {
      const width = options.width || 980;
      const height = options.height || 520;
      const shotPlan = {
        ...this.plan,
        stage: options.stage ?? 999,
        vis: options.vis ? { ...this.plan.vis, ...options.vis } : this.plan.vis
      };
      this.manualCamera = true;
      this.grid.visible = options.grid !== false;
      if (options.background) this.scene.background = new THREE.Color(options.background);
      this.plan = shotPlan;
      this.build();

      const captureCanvas = document.createElement('canvas');
      captureRenderer = new THREE.WebGLRenderer({ canvas: captureCanvas, antialias: true, preserveDrawingBuffer: true });
      captureRenderer.setPixelRatio(1);
      captureRenderer.setSize(width, height, false);
      captureRenderer.shadowMap.enabled = this.renderer.shadowMap.enabled;
      if (this.camera.isPerspectiveCamera) {
        this.camera.aspect = width / height;
      } else {
        const aspect = width / height;
        const span = this.orthoSpan || 4;
        this.camera.left = -span * aspect;
        this.camera.right = span * aspect;
        this.camera.top = span;
        this.camera.bottom = -span;
      }
      this.camera.near = 0.01;
      this.camera.far = 100;
      this.camera.updateProjectionMatrix();

      if (options.camera) {
        this.camera.position.set(options.camera.x, options.camera.y, options.camera.z);
      }
      if (options.target) {
        this.controls.target.set(options.target.x, options.target.y, options.target.z);
      }
      const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      this.camera.up.set(0, direction.y < 0 ? -1 : 1, 0);
      this.camera.lookAt(this.controls.target);
      this.controls.update();
      captureRenderer.render(this.scene, this.camera);
      return captureRenderer.domElement.toDataURL('image/png');
    } catch {
      return null;
    } finally {
      captureRenderer?.dispose();
      this.plan = oldPlan;
      this.manualCamera = oldManualCamera;
      this.grid.visible = oldGridVisible;
      this.scene.background = oldBackground;
      this.camera.position.copy(oldPosition);
      this.camera.up.copy(oldUp);
      this.controls.target.copy(oldTarget);
      this.camera.near = oldNear;
      this.camera.far = oldFar;
      if (this.camera.isPerspectiveCamera) {
        this.camera.aspect = oldAspect;
      } else if (oldOrtho) {
        this.camera.left = oldOrtho.left;
        this.camera.right = oldOrtho.right;
        this.camera.top = oldOrtho.top;
        this.camera.bottom = oldOrtho.bottom;
        this.camera.zoom = oldOrtho.zoom;
      }
      this.camera.updateProjectionMatrix();
      this.build();
      this.controls.update();
      this.resize();
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = width / height;
    } else {
      const aspect = width / height;
      const span = this.orthoSpan || 4;
      this.camera.left = -span * aspect;
      this.camera.right = span * aspect;
      this.camera.top = span;
      this.camera.bottom = -span;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);
  }

  build() {
    clearGroup(this.root);
    this.hideHoverTooltip();
    this.setGridFloor(0);
    if (!this.plan || !this.result?.ok) return;
    if (this.result.type === 'shelves') {
      this.buildShelves();
      return;
    }

    const plan = this.plan;
    const buildKind = normalizeBuild(plan.build);
    const result = this.result;
    const labels = getStageLabels(plan.build);
    const maxStage = Math.min(plan.stage ?? labels.length - 1, labels.length - 1);
    const shouldShow = (name) => plan.vis?.[name] !== false;
    const visibleThrough = (label) => maxStage === 0 || labels.indexOf(label) <= maxStage || maxStage >= labels.length - 1;
    const mat = materials(plan);

    const innerW = result.innerW * SCALE;
    const innerH = result.innerH * SCALE;
    const outerW = result.outerW * SCALE;
    const outerH = result.outerH * SCALE;
    const face = plan.face * SCALE;
    const depth = plan.depth * SCALE;
    const faceDepth = depth + (plan.faceLip || 0) * SCALE;
    const linerW = plan.linerW * SCALE;
    const supportDepth = Math.max(0.05, result.supportDepth * SCALE);
    const supportThickness = Math.max(0.01, result.supportThickness * SCALE);
    const supportBottom = Math.max(0, result.supportBottom * SCALE);
    const linerDepth = buildKind === 'strainer' ? supportThickness : supportDepth;
    const reveal = plan.reveal * SCALE;
    const rabbet = (plan.rabbet || 0.125) * SCALE;
    const canvasW = plan.canvasW * SCALE;
    const canvasH = plan.canvasH * SCALE;
    const canvasT = plan.canvasT * SCALE;
    const canvasBottomY = supportDepth;

    if (result.assembly?.type === 'floating-frame') {
      this.buildFrameFromAssembly({
        mat,
        buildKind,
        shouldShow,
        visibleThrough,
        outerW,
        outerH,
        faceDepth,
        canvasW,
        canvasH,
        canvasT,
        canvasBottomY
      });
      if (!this.manualCamera) this.fitCamera(outerW, outerH, faceDepth + canvasT);
      return;
    }

    const isMiter = plan.join === 'miter';
    if (shouldShow('liner') && buildKind === 'liner') {
      const linerShortW = isMiter ? innerW : Math.max(0.001, innerW - linerW * 2);
      addRail(this.root, { name: 'Liner bottom', x: 0, z: -innerH / 2 + linerW / 2, w: linerShortW, h: linerW, d: linerDepth, y: linerDepth / 2, material: mat.liner, visible: visibleThrough('Liner: Bottom'), miter: isMiter, side: 'bottom' });
      addRail(this.root, { name: 'Liner top', x: 0, z: innerH / 2 - linerW / 2, w: linerShortW, h: linerW, d: linerDepth, y: linerDepth / 2, material: mat.liner, visible: visibleThrough('Liner: Top'), miter: isMiter, side: 'top' });
      addRail(this.root, { name: 'Liner left', x: -innerW / 2 + linerW / 2, z: 0, w: linerW, h: innerH, d: linerDepth, y: linerDepth / 2, material: mat.liner, visible: visibleThrough('Liner: Left'), miter: isMiter, side: 'left' });
      addRail(this.root, { name: 'Liner right', x: innerW / 2 - linerW / 2, z: 0, w: linerW, h: innerH, d: linerDepth, y: linerDepth / 2, material: mat.liner, visible: visibleThrough('Liner: Right'), miter: isMiter, side: 'right' });
    }

    if (shouldShow('liner') && buildKind === 'strainer') {
      const strainerShortW = isMiter ? innerW : Math.max(0.001, innerW - linerW * 2);
      const strainerY = supportBottom + linerDepth / 2;
      addRail(this.root, { name: 'Strainer bottom', x: 0, z: -innerH / 2 + linerW / 2, w: strainerShortW, h: linerW, d: linerDepth, y: strainerY, material: mat.liner, visible: visibleThrough('Strainer: Bottom'), miter: isMiter, side: 'bottom' });
      addRail(this.root, { name: 'Strainer top', x: 0, z: innerH / 2 - linerW / 2, w: strainerShortW, h: linerW, d: linerDepth, y: strainerY, material: mat.liner, visible: visibleThrough('Strainer: Top'), miter: isMiter, side: 'top' });
      addRail(this.root, { name: 'Strainer left', x: -innerW / 2 + linerW / 2, z: 0, w: linerW, h: innerH, d: linerDepth, y: strainerY, material: mat.liner, visible: visibleThrough('Strainer: Left'), miter: isMiter, side: 'left' });
      addRail(this.root, { name: 'Strainer right', x: innerW / 2 - linerW / 2, z: 0, w: linerW, h: innerH, d: linerDepth, y: strainerY, material: mat.liner, visible: visibleThrough('Strainer: Right'), miter: isMiter, side: 'right' });
    }

    if (shouldShow('face')) {
      const faceShortW = isMiter ? outerW : Math.max(0.001, outerW - face * 2);
      addRail(this.root, { name: 'Face bottom', x: 0, z: -outerH / 2 + face / 2, w: faceShortW, h: face, d: faceDepth, y: faceDepth / 2, material: mat.frame, visible: visibleThrough('Face: Bottom'), miter: isMiter, side: 'bottom' });
      addRail(this.root, { name: 'Face top', x: 0, z: outerH / 2 - face / 2, w: faceShortW, h: face, d: faceDepth, y: faceDepth / 2, material: mat.frame, visible: visibleThrough('Face: Top'), miter: isMiter, side: 'top' });
      addRail(this.root, { name: 'Face left', x: -outerW / 2 + face / 2, z: 0, w: face, h: outerH, d: faceDepth, y: faceDepth / 2, material: mat.frame, visible: visibleThrough('Face: Left'), miter: isMiter, side: 'left' });
      addRail(this.root, { name: 'Face right', x: outerW / 2 - face / 2, z: 0, w: face, h: outerH, d: faceDepth, y: faceDepth / 2, material: mat.frame, visible: visibleThrough('Face: Right'), miter: isMiter, side: 'right' });
      if (buildKind === 'strainer') {
        addRabbetLedge(this.root, { innerW, innerH, rabbet, ledgeY: supportBottom, material: mat.frame, visible: visibleThrough('Rabbet Ledge') });
      }
    }

    if (shouldShow('spacers') && visibleThrough('Spacers')) {
      const spacer = Math.min(1, Math.max(0.125, plan.reveal)) * SCALE;
      const pts = [
        [-canvasW / 2 - reveal / 2, -canvasH / 2 - reveal / 2],
        [canvasW / 2 + reveal / 2, -canvasH / 2 - reveal / 2],
        [-canvasW / 2 - reveal / 2, canvasH / 2 + reveal / 2],
        [canvasW / 2 + reveal / 2, canvasH / 2 + reveal / 2]
      ];
      const spacerSeatY = buildKind === 'strainer' ? supportBottom + linerDepth : linerDepth;
      pts.forEach(([x, z]) => addRail(this.root, { x, z, w: spacer, h: spacer, d: spacer, y: spacerSeatY + spacer / 2, material: mat.spacer, visible: true }));
    }

    if (shouldShow('canvas') && visibleThrough('Canvas')) {
      addCanvasAssembly(this.root, {
        canvasW,
        canvasH,
        canvasT,
        stretcherW: plan.stretcherW * SCALE,
        bottomY: canvasBottomY,
        materialCanvas: mat.canvas,
        materialCanvasBack: mat.canvasBack,
        materialCanvasSide: mat.canvasSide,
        materialCanvasReverse: mat.canvasReverse,
        materialStretcher: mat.stretcher,
        showStretchers: visibleThrough('Stretchers')
      });
    }

    if (shouldShow('hardware') && visibleThrough('Mounting')) {
      addHardware(this.root, plan, result, mat);
    }

    if (!this.manualCamera) this.fitCamera(outerW, outerH, faceDepth + canvasT);
  }

  buildFrameFromAssembly(opts) {
    const plan = this.plan;
    const result = this.result;
    const assembly = result.assembly;
    const materialForPart = (part) => {
      const group = part.meta?.group;
      if (group === 'face') return partMaterial(plan, opts.mat.frame.color.getHex(), part, 0.65);
      if (group === 'support') return partMaterial(plan, opts.mat.liner.color.getHex(), part, 0.7);
      if (group === 'spacer') return partMaterial(plan, opts.mat.spacer.color.getHex(), part, 0.95);
      if (group === 'guide') return opts.mat.frame;
      if (group === 'fastener') return opts.mat.hardware;
      if (group === 'stretcher') return partMaterial(plan, opts.mat.stretcher.color.getHex(), part, 0.8);
      return partMaterial(plan, opts.mat.frame.color.getHex(), part, 0.75);
    };
    const groupVisible = (group) => {
      if (group === 'face') return opts.shouldShow('face') && opts.visibleThrough('Face: Bottom');
      if (group === 'support') return opts.shouldShow('liner') && opts.visibleThrough(opts.buildKind === 'strainer' ? 'Strainer: Bottom' : 'Liner: Bottom');
      if (group === 'guide') return opts.shouldShow('face') && opts.buildKind === 'strainer' && opts.visibleThrough('Rabbet Ledge');
      if (group === 'spacer') return opts.shouldShow('spacers') && opts.visibleThrough('Spacers');
      if (group === 'fastener') return opts.shouldShow('hardware') && opts.visibleThrough('Mounting');
      if (group === 'stretcher') return opts.shouldShow('canvas') && opts.visibleThrough('Stretchers');
      if (group === 'canvas') return opts.shouldShow('canvas') && opts.visibleThrough('Canvas');
      return true;
    };

    assembly.parts.forEach((part) => {
      const group = part.meta?.group;
      if (group === 'canvas' || group === 'stretcher') return;
      if (!groupVisible(group)) return;
      if (part.material === 'fastener') {
        const start = part.meta?.start || part.position;
        addShelfScrew(
          this.root,
          start.x * SCALE,
          start.y * SCALE,
          start.z * SCALE,
          part.meta?.axis || 'y',
          part.meta?.direction || 1,
          (part.meta?.length || part.size.y) * SCALE,
          opts.mat.hardware,
          opts.mat.screwShank,
          part
        );
        return;
      }

      addRail(this.root, {
        x: part.position.x * SCALE,
        y: part.position.y * SCALE,
        z: part.position.z * SCALE,
        w: part.size.x * SCALE,
        d: part.size.y * SCALE,
        h: part.size.z * SCALE,
        material: materialForPart(part),
        visible: true,
        miter: Boolean(part.meta?.miterSide),
        side: part.meta?.miterSide,
        partInfo: part
      });
    });

    if (opts.shouldShow('canvas') && opts.visibleThrough('Canvas')) {
      addCanvasAssembly(this.root, {
        canvasW: opts.canvasW,
        canvasH: opts.canvasH,
        canvasT: opts.canvasT,
        stretcherW: plan.stretcherW * SCALE,
        bottomY: opts.canvasBottomY,
        materialCanvas: opts.mat.canvas,
        materialCanvasBack: opts.mat.canvasBack,
        materialCanvasSide: opts.mat.canvasSide,
        materialCanvasReverse: opts.mat.canvasReverse,
        materialStretcher: opts.mat.stretcher,
        showStretchers: opts.visibleThrough('Stretchers')
      });
    }

    if (plan.mountMethod === 'clips' && opts.shouldShow('hardware') && opts.visibleThrough('Mounting')) {
      addHardware(this.root, plan, result, opts.mat);
    }
  }

  buildShelves() {
    const plan = this.plan;
    const result = this.result;
    const mat = materials(plan);
    const width = result.shelfW * SCALE;
    const height = result.shelfH * SCALE;
    const depth = result.shelfD * SCALE;
    const post = result.post * SCALE;
    const stock = result.stock * SCALE;
    const rail = result.rail * SCALE;
    const deck = result.deck * SCALE;
    const levels = result.levels;
    const bays = result.bays;
    const slats = result.slats;
    const labels = ['Plan', 'Posts', 'Rails', 'Shelf slats', 'Fasteners'];
    const maxStage = Math.min(plan.stage ?? labels.length - 1, labels.length - 1);
    const shouldShow = (name) => plan.vis?.[name] !== false;
    const visibleThrough = (label) => maxStage === 0 || labels.indexOf(label) <= maxStage || maxStage >= labels.length - 1;
    const xStart = -width / 2 + stock / 2;
    const postXForIndex = (index) => {
      if (index === 0) return -width / 2 + post / 2;
      if (index === bays) return width / 2 - post / 2;
      return xStart + index * bayStep;
    };
    const zFront = -depth / 2 + stock / 2;
    const zBack = depth / 2 - stock / 2;
    const zFrontRail = -depth / 2 + stock * 1.5;
    const zBackRail = depth / 2 - stock * 1.5;
    const bayStep = (width - stock) / bays;
    const railSpan = Math.max(stock, bayStep - stock);
    const depthRailSpan = Math.max(stock, depth - stock * 2);
    const slatSpan = Math.max(stock, width);
    const yForLevel = (level) => levels === 1 ? height * 0.55 : (rail / 2) + level * ((height - rail) / (levels - 1));

    if (result.assembly?.parts?.length) {
      this.setGridFloor(assemblyFloorY(result.assembly) * SCALE);
      const stageLabelForGroup = (group) => ({
        posts: 'Posts',
        rails: 'Rails',
        slats: 'Shelf slats',
        totes: 'Shelf slats',
        hardware: 'Fasteners',
        fasteners: 'Fasteners'
      }[group]);
      const visKeyForGroup = (group) => group === 'fasteners' || group === 'hardware' ? 'hardware' : group === 'totes' ? 'slats' : group;
      const materialForPart = (part) => {
        if (part.material === 'fastener') return mat.shelfScrew;
        return shelfPartMaterial(plan, part);
      };
      result.assembly.parts.forEach((part) => {
        const group = part.meta?.group;
        const stageLabel = stageLabelForGroup(group);
        if (!stageLabel || !shouldShow(visKeyForGroup(group)) || !visibleThrough(stageLabel)) return;
        if (part.material === 'hardware' && part.meta?.kind === 'caster') {
          addCaster(this.root, part, mat);
          return;
        }
        if (part.material === 'fastener') {
          const start = part.meta.start;
          addShelfScrew(
            this.root,
            start.x * SCALE,
            start.y * SCALE,
            start.z * SCALE,
            part.meta.axis,
            part.meta.direction,
            part.meta.length * SCALE,
            mat.shelfScrew,
            mat.screwShank,
            part
          );
          return;
        }
        addRail(this.root, {
          x: part.position.x * SCALE,
          y: part.position.y * SCALE,
          z: part.position.z * SCALE,
          w: part.size.x * SCALE,
          d: part.size.y * SCALE,
          h: part.size.z * SCALE,
          material: materialForPart(part),
          visible: true,
          partInfo: part
        });
      });
      if (!this.manualCamera) this.fitCamera(width, depth, height);
      return;
    }

    if (shouldShow('posts') && visibleThrough('Posts')) {
      for (let i = 0; i <= bays; i += 1) {
        const x = postXForIndex(i);
        addRail(this.root, { x, z: zFront, w: post, h: stock, d: height, y: height / 2, material: mat.liner, visible: true });
        addRail(this.root, { x, z: zBack, w: post, h: stock, d: height, y: height / 2, material: mat.liner, visible: true });
      }
    }

    if (shouldShow('rails') && visibleThrough('Rails')) {
      for (let level = 0; level < levels; level += 1) {
        const y = yForLevel(level);
        for (let bay = 0; bay < bays; bay += 1) {
          const x = xStart + bay * bayStep + bayStep / 2;
          addRail(this.root, { x, z: zFrontRail, w: railSpan, h: stock, d: rail, y, material: mat.frame, visible: true });
          addRail(this.root, { x, z: zBackRail, w: railSpan, h: stock, d: rail, y, material: mat.frame, visible: true });
        }
        for (let i = 0; i <= bays; i += 1) {
          const x = xStart + i * bayStep;
          addRail(this.root, { x, z: 0, w: stock, h: depthRailSpan, d: rail, y, material: mat.frame, visible: true });
        }
      }
    }

    if (shouldShow('slats') && visibleThrough('Shelf slats')) {
      const usableDepth = Math.max(stock, depth - stock * 4);
      const slatDepth = stock;
      for (let level = 0; level < levels; level += 1) {
        const y = yForLevel(level) + rail / 2 + slatDepth / 2;
        for (let s = 0; s < slats; s += 1) {
          const z = -usableDepth / 2 + (s + 0.5) * (usableDepth / slats);
          addRail(this.root, { x: 0, z, w: slatSpan, h: Math.min(deck, usableDepth / slats * 0.82), d: slatDepth, y, material: mat.stretcher, visible: true });
        }
      }
    }

    if (shouldShow('hardware') && visibleThrough('Fasteners')) {
      addShelfFasteners(this.root, { width, height, depth, post, stock, rail, levels, bays, bayStep, xStart, yForLevel, material: mat.shelfScrew, shankMaterial: mat.screwShank });
    }

    if (!this.manualCamera) this.fitCamera(width, depth, height);
  }

  fitCamera(width, height, depth) {
    this.manualCamera = false;
    const radius = Math.max(width, height, depth, 1.5);
    this.orthoSpan = radius * 0.72;
    this.controls.target.set(0, depth / 3, 0);
    this.camera.position.set(radius * 1.25, radius * 0.85, radius * 1.35);
    this.camera.near = 0.01;
    this.camera.far = radius * 10;
    if (this.camera.isOrthographicCamera) {
      this.resize();
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setGridFloor(y) {
    if (!this.grid) return;
    this.grid.position.y = Number.isFinite(y) ? y : 0;
  }
}

function addHardware(group, plan, result, mat) {
  if (plan.mountMethod === 'clips' && plan.mountClip !== 'none' && result.clipFit?.ok) {
    const clip = getZClipByOffset(Number(plan.mountClip));
    addZClips(group, plan, result, clip, mat.hardware);
    return;
  }

  const outerW = result.outerW * SCALE;
  const outerH = result.outerH * SCALE;
  const canvasW = plan.canvasW * SCALE;
  const canvasH = plan.canvasH * SCALE;
  const reveal = plan.reveal * SCALE;
  const linerW = plan.linerW * SCALE;
  const screwInset = 0.18 * SCALE;
  const y = (result.supportBottom || 0) * SCALE - 0.012;
  const bottomLine = -canvasH / 2 - reveal + linerW / 2;
  const topLine = canvasH / 2 + reveal - linerW / 2;
  const leftLine = -canvasW / 2 - reveal + linerW / 2;
  const rightLine = canvasW / 2 + reveal - linerW / 2;
  const xPoints = [-outerW * 0.24, outerW * 0.24];
  const zPoints = [-outerH * 0.24, outerH * 0.24];
  xPoints.forEach((x) => {
    addScrew(group, x, y, bottomLine + screwInset, plan, result, mat.hardware, mat.screwShank);
    addScrew(group, x, y, topLine - screwInset, plan, result, mat.hardware, mat.screwShank);
  });
  zPoints.forEach((z) => {
    addScrew(group, leftLine + screwInset, y, z, plan, result, mat.hardware, mat.screwShank);
    addScrew(group, rightLine - screwInset, y, z, plan, result, mat.hardware, mat.screwShank);
  });
}

function addShelfFasteners(group, opts) {
  const faceOffset = 0.004;
  const railScrewOffset = opts.rail * 0.32;
  const endInset = opts.stock * 0.25;
  const shankLength = opts.stock * 1.55;
  for (let level = 0; level < opts.levels; level += 1) {
    const y = opts.yForLevel(level);
    for (let bay = 0; bay < opts.bays; bay += 1) {
      const leftX = opts.xStart + bay * opts.bayStep + opts.stock / 2 + endInset;
      const rightX = opts.xStart + (bay + 1) * opts.bayStep - opts.stock / 2 - endInset;
      [leftX, rightX].forEach((x) => {
        [-railScrewOffset, railScrewOffset].forEach((dy) => {
          addShelfScrew(group, x, y + dy, -opts.depth / 2 - faceOffset, 'z', 1, shankLength, opts.material, opts.shankMaterial);
          addShelfScrew(group, x, y + dy, opts.depth / 2 + faceOffset, 'z', -1, shankLength, opts.material, opts.shankMaterial);
        });
      });
    }
  }
}

function addShelfScrew(group, x, y, z, axis, dir, length, headMaterial, shankMaterial, partInfo = null) {
  addPocketHoleMarker(group, partInfo, headMaterial);
  addShelfScrewShank(group, x, y, z, axis, dir, length, shankMaterial, partInfo);
  addShelfScrewHead(group, x, y, z, axis, headMaterial, partInfo);
}

function addPocketHoleMarker(group, partInfo, material) {
  const pocket = partInfo?.meta?.pocket;
  if (!pocket?.position) return;
  const major = Math.max(0.12, pocket.size?.major || 0.52) * SCALE;
  const minor = Math.max(0.06, pocket.size?.minor || 0.24) * SCALE;
  const faceAxis = pocket.faceAxis || 'z';
  const faceDirection = pocket.faceDirection || 1;
  const offset = 0.012 * SCALE * faceDirection;
  const geometry = new THREE.CircleGeometry(0.5, 32);
  const marker = new THREE.Mesh(geometry, material);
  marker.scale.set(major, minor, 1);
  if (faceAxis === 'x') {
    marker.rotation.y = Math.PI / 2;
    marker.rotation.z = THREE.MathUtils.degToRad(pocket.angleDeg || 0);
    marker.position.set(
      pocket.position.x * SCALE + offset,
      pocket.position.y * SCALE,
      pocket.position.z * SCALE
    );
  } else {
    marker.rotation.z = THREE.MathUtils.degToRad(pocket.angleDeg || 0);
    marker.position.set(
      pocket.position.x * SCALE,
      pocket.position.y * SCALE,
      pocket.position.z * SCALE + offset
    );
  }
  marker.renderOrder = 2;
  marker.userData.partInfo = partInfo;
  group.add(marker);

  const rim = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 48 }, (_, index) => {
        const angle = (index / 48) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
      })
    ),
    new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55 })
  );
  rim.scale.copy(marker.scale);
  rim.rotation.copy(marker.rotation);
  rim.position.copy(marker.position);
  rim.renderOrder = 3;
  rim.userData.partInfo = partInfo;
  group.add(rim);
}

function addCaster(group, part, mat) {
  const x = part.position.x * SCALE;
  const z = part.position.z * SCALE;
  const bottomY = (part.position.y - part.size.y / 2) * SCALE;
  const height = (part.meta?.height || part.size.y) * SCALE;
  const topY = bottomY + height;
  const plateW = (part.meta?.plate?.x || 3.62) * SCALE;
  const plateD = (part.meta?.plate?.z || 2.44) * SCALE;
  const plateT = 0.12 * SCALE;
  const wheelRadius = (part.meta?.wheel?.diameter || 2.95) * SCALE / 2;
  const wheelWidth = (part.meta?.wheel?.width || 1.24) * SCALE;
  const swivelRadius = 0.55 * SCALE;
  const bodyY = topY - plateT - 0.5 * SCALE;
  const axleY = bottomY + wheelRadius;
  const casterGroup = new THREE.Group();
  casterGroup.position.set(x, 0, z);

  const black = mat.casterBlack;
  const metal = mat.casterMetal;
  const wheel = mat.casterWheel;

  const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, plateT, plateD), black);
  plate.position.y = topY - plateT / 2;
  plate.castShadow = true;
  casterGroup.add(plate);

  const swivel = new THREE.Mesh(new THREE.CylinderGeometry(swivelRadius, swivelRadius, 0.18 * SCALE, 32), black);
  swivel.position.y = topY - plateT - 0.09 * SCALE;
  swivel.castShadow = true;
  casterGroup.add(swivel);

  const forkHeight = Math.max(0.2 * SCALE, bodyY - axleY);
  [-1, 1].forEach((side) => {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.18 * SCALE, forkHeight, 0.28 * SCALE), black);
    fork.position.set(side * (wheelWidth / 2 + 0.1 * SCALE), axleY + forkHeight / 2, 0);
    fork.castShadow = true;
    casterGroup.add(fork);
  });

  const wheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 36), wheel);
  wheelMesh.rotation.z = Math.PI / 2;
  wheelMesh.position.y = axleY;
  wheelMesh.castShadow = true;
  casterGroup.add(wheelMesh);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.38, wheelRadius * 0.38, wheelWidth * 1.08, 24), metal);
  hub.rotation.z = Math.PI / 2;
  hub.position.y = axleY;
  casterGroup.add(hub);

  if (part.meta?.locking) {
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.86 * SCALE, 0.12 * SCALE, 0.34 * SCALE), black);
    brake.position.set(0.38 * SCALE, bodyY + 0.18 * SCALE, -plateD * 0.38);
    brake.rotation.x = -0.35;
    brake.castShadow = true;
    casterGroup.add(brake);
  }

  const holeRadius = 0.08 * SCALE;
  [
    [-plateW * 0.36, -plateD * 0.32],
    [plateW * 0.36, -plateD * 0.32],
    [-plateW * 0.36, plateD * 0.32],
    [plateW * 0.36, plateD * 0.32]
  ].forEach(([hx, hz]) => {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(holeRadius, holeRadius, plateT * 1.3, 16), metal);
    hole.position.set(hx, topY - plateT / 2 - 0.001, hz);
    casterGroup.add(hole);
  });

  casterGroup.traverse((mesh) => {
    if (mesh.isMesh) mesh.userData.partInfo = part;
  });
  group.add(casterGroup);
}

function assemblyFloorY(assembly) {
  const floorY = (assembly?.parts || [])
    .filter((part) => part.material !== 'fastener')
    .map((part) => part.position?.y - part.size?.y / 2)
    .filter(Number.isFinite)
    .reduce((min, value) => Math.min(min, value), 0);
  return Number.isFinite(floorY) ? floorY : 0;
}

function addShelfScrewShank(group, x, y, z, axis, dir, length, material, partInfo = null) {
  const radius = 0.0045;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 14);
  const mesh = new THREE.Mesh(geometry, material);
  if (axis === 'z') {
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z + dir * length / 2);
  } else if (axis === 'x') {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x + dir * length / 2, y, z);
  } else {
    mesh.position.set(x, y + dir * length / 2, z);
  }
  mesh.castShadow = true;
  if (partInfo) mesh.userData.partInfo = partInfo;
  group.add(mesh);
}

function addShelfScrewHead(group, x, y, z, axis, material, partInfo = null) {
  const radius = 0.018;
  const height = 0.007;
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 20);
  const mesh = new THREE.Mesh(geometry, material);
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  if (partInfo) mesh.userData.partInfo = partInfo;
  group.add(mesh);
}

function addZClips(group, plan, result, clip, material) {
  const canvasW = plan.canvasW * SCALE;
  const canvasH = plan.canvasH * SCALE;
  const reveal = plan.reveal * SCALE;
  const linerW = plan.linerW * SCALE;
  const stretcherW = plan.stretcherW * SCALE;
  const seatY = result.supportDepth * SCALE;
  const seg = 0.5 * SCALE;
  const t = Math.max(0.012, (clip?.thickness || 0.06) * SCALE);
  const clipWidth = 0.62 * SCALE;
  const xPositions = [-canvasW * 0.28, canvasW * 0.28];
  const zPositions = [-canvasH * 0.28, canvasH * 0.28];

  const bottomStretcherInner = -canvasH / 2 + stretcherW;
  const bottomLinerInner = -canvasH / 2 - reveal + linerW;
  const topStretcherInner = canvasH / 2 - stretcherW;
  const topLinerInner = canvasH / 2 + reveal - linerW;
  xPositions.forEach((x) => {
    addZClipAlongX(group, x, bottomLinerInner, bottomStretcherInner, seatY, seg, t, clipWidth, material);
    addZClipAlongX(group, x, topLinerInner, topStretcherInner, seatY, seg, t, clipWidth, material);
  });

  const leftStretcherInner = -canvasW / 2 + stretcherW;
  const leftLinerInner = -canvasW / 2 - reveal + linerW;
  const rightStretcherInner = canvasW / 2 - stretcherW;
  const rightLinerInner = canvasW / 2 + reveal - linerW;
  zPositions.forEach((z) => {
    addZClipAlongZ(group, leftLinerInner, leftStretcherInner, z, seatY, seg, t, clipWidth, material);
    addZClipAlongZ(group, rightLinerInner, rightStretcherInner, z, seatY, seg, t, clipWidth, material);
  });
}

function addZClipAlongX(group, x, linerInnerZ, stretcherInnerZ, seatY, seg, t, width, material) {
  const dir = Math.sign(stretcherInnerZ - linerInnerZ) || 1;
  addMetalBox(group, { x, y: seatY - seg / 2, z: linerInnerZ + dir * t / 2, w: width, d: seg, h: t, material });
  addMetalBox(group, { x, y: seatY - t / 2, z: (linerInnerZ + stretcherInnerZ) / 2, w: width, d: t, h: Math.abs(stretcherInnerZ - linerInnerZ), material });
  addMetalBox(group, { x, y: seatY + seg / 2, z: stretcherInnerZ - dir * t / 2, w: width, d: seg, h: t, material });
}

function addZClipAlongZ(group, linerInnerX, stretcherInnerX, z, seatY, seg, t, width, material) {
  const dir = Math.sign(stretcherInnerX - linerInnerX) || 1;
  addMetalBox(group, { x: linerInnerX + dir * t / 2, y: seatY - seg / 2, z, w: t, d: seg, h: width, material });
  addMetalBox(group, { x: (linerInnerX + stretcherInnerX) / 2, y: seatY - t / 2, z, w: Math.abs(stretcherInnerX - linerInnerX), d: t, h: width, material });
  addMetalBox(group, { x: stretcherInnerX - dir * t / 2, y: seatY + seg / 2, z, w: t, d: seg, h: width, material });
}

function addMetalBox(group, opts) {
  const geometry = new THREE.BoxGeometry(Math.max(opts.w, 0.001), Math.max(opts.d, 0.001), Math.max(opts.h, 0.001));
  const mesh = new THREE.Mesh(geometry, opts.material);
  mesh.position.set(opts.x, opts.y, opts.z);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), new THREE.LineBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.35 }));
  mesh.add(edges);
  group.add(mesh);
}

function addRabbetLedge(group, opts) {
  if (!opts.visible) return;
  const ledgeT = Math.max(0.006, opts.rabbet * 0.5);
  const y = Math.max(ledgeT / 2, opts.ledgeY - ledgeT / 2);
  addRail(group, { name: 'Rabbet ledge bottom', x: 0, z: -opts.innerH / 2 + opts.rabbet / 2, w: opts.innerW, h: opts.rabbet, d: ledgeT, y, material: opts.material, visible: true });
  addRail(group, { name: 'Rabbet ledge top', x: 0, z: opts.innerH / 2 - opts.rabbet / 2, w: opts.innerW, h: opts.rabbet, d: ledgeT, y, material: opts.material, visible: true });
  addRail(group, { name: 'Rabbet ledge left', x: -opts.innerW / 2 + opts.rabbet / 2, z: 0, w: opts.rabbet, h: opts.innerH, d: ledgeT, y, material: opts.material, visible: true });
  addRail(group, { name: 'Rabbet ledge right', x: opts.innerW / 2 - opts.rabbet / 2, z: 0, w: opts.rabbet, h: opts.innerH, d: ledgeT, y, material: opts.material, visible: true });
}

function addScrew(group, x, y, z, plan, result, headMaterial, shankMaterial) {
  const linerDepth = Math.max(0.001, (result.supportThickness || result.linerDepth) * SCALE);
  const stretcherBite = Math.max(0.001, plan.canvasT * SCALE * 0.5);
  const shankLength = linerDepth + stretcherBite;
  const shankRadius = 0.0045;
  const shankGeo = new THREE.CylinderGeometry(shankRadius, shankRadius, shankLength, 16);
  const shank = new THREE.Mesh(shankGeo, shankMaterial);
  shank.position.set(x, y + shankLength / 2, z);
  group.add(shank);
  addScrewHead(group, x, y, z, headMaterial);
}

function addScrewHead(group, x, y, z, material) {
  const radius = 0.012;
  const height = 0.006;
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 24);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  const slotGeo = new THREE.BoxGeometry(radius * 1.55, height * 1.2, radius * 0.22);
  const slot = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.5, metalness: 0.3 }));
  slot.position.y = height * 0.58;
  mesh.add(slot);
  group.add(mesh);
}

function addCanvasAssembly(group, opts) {
  const fabricT = Math.max(0.012, Math.min(0.035, opts.canvasT * 0.08));
  const wrapLip = Math.max(0.045, Math.min(opts.stretcherW * 0.38, 0.12));
  const stretcherDepth = Math.max(0.04, opts.canvasT - fabricT);
  const inset = Math.max(0.012, fabricT + 0.006);
  const stretcherW = Math.max(0.01, opts.stretcherW - inset);
  const stretcherCanvasW = Math.max(0.01, opts.canvasW - inset * 2);
  const stretcherCanvasH = Math.max(0.01, opts.canvasH - inset * 2);
  const topY = opts.bottomY + opts.canvasT;
  const stretcherY = opts.bottomY + stretcherDepth / 2;

  if (opts.showStretchers) {
    addRail(group, { name: 'Stretcher bottom', x: 0, z: -opts.canvasH / 2 + inset + stretcherW / 2, w: stretcherCanvasW, h: stretcherW, d: stretcherDepth, y: stretcherY, material: opts.materialStretcher, visible: true });
    addRail(group, { name: 'Stretcher top', x: 0, z: opts.canvasH / 2 - inset - stretcherW / 2, w: stretcherCanvasW, h: stretcherW, d: stretcherDepth, y: stretcherY, material: opts.materialStretcher, visible: true });
    addRail(group, { name: 'Stretcher left', x: -opts.canvasW / 2 + inset + stretcherW / 2, z: 0, w: stretcherW, h: stretcherCanvasH, d: stretcherDepth, y: stretcherY, material: opts.materialStretcher, visible: true });
    addRail(group, { name: 'Stretcher right', x: opts.canvasW / 2 - inset - stretcherW / 2, z: 0, w: stretcherW, h: stretcherCanvasH, d: stretcherDepth, y: stretcherY, material: opts.materialStretcher, visible: true });
  }

  // Painted face: a one-sided front surface. From the back, the canvas stays white/open.
  addCanvasFace(group, opts.canvasW, opts.canvasH, topY + fabricT * 0.1, opts.materialCanvas);
  addCanvasFace(group, opts.canvasW, opts.canvasH, topY, opts.materialCanvasReverse);

  // Fabric wrapped down the outside edges.
  addRail(group, { name: 'Canvas wrap bottom', x: 0, z: -opts.canvasH / 2 + fabricT / 2, w: opts.canvasW, h: fabricT, d: opts.canvasT, y: opts.bottomY + opts.canvasT / 2, material: opts.materialCanvasSide, visible: true });
  addRail(group, { name: 'Canvas wrap top', x: 0, z: opts.canvasH / 2 - fabricT / 2, w: opts.canvasW, h: fabricT, d: opts.canvasT, y: opts.bottomY + opts.canvasT / 2, material: opts.materialCanvasSide, visible: true });
  addRail(group, { name: 'Canvas wrap left', x: -opts.canvasW / 2 + fabricT / 2, z: 0, w: fabricT, h: opts.canvasH, d: opts.canvasT, y: opts.bottomY + opts.canvasT / 2, material: opts.materialCanvasSide, visible: true });
  addRail(group, { name: 'Canvas wrap right', x: opts.canvasW / 2 - fabricT / 2, z: 0, w: fabricT, h: opts.canvasH, d: opts.canvasT, y: opts.bottomY + opts.canvasT / 2, material: opts.materialCanvasSide, visible: true });

  // Back-side fabric return: a narrow perimeter lip only, leaving the center open.
  const backLipY = opts.bottomY - fabricT * 0.55;
  addRail(group, { name: 'Canvas back lip bottom', x: 0, z: -opts.canvasH / 2 + wrapLip / 2, w: opts.canvasW, h: wrapLip, d: fabricT, y: backLipY, material: opts.materialCanvasBack, visible: true });
  addRail(group, { name: 'Canvas back lip top', x: 0, z: opts.canvasH / 2 - wrapLip / 2, w: opts.canvasW, h: wrapLip, d: fabricT, y: backLipY, material: opts.materialCanvasBack, visible: true });
  addRail(group, { name: 'Canvas back lip left', x: -opts.canvasW / 2 + wrapLip / 2, z: 0, w: wrapLip, h: opts.canvasH, d: fabricT, y: backLipY, material: opts.materialCanvasBack, visible: true });
  addRail(group, { name: 'Canvas back lip right', x: opts.canvasW / 2 - wrapLip / 2, z: 0, w: wrapLip, h: opts.canvasH, d: fabricT, y: backLipY, material: opts.materialCanvasBack, visible: true });
}

function addCanvasFace(group, width, height, y, material) {
  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, 0);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addRail(group, opts) {
  if (!opts.visible) return;
  const w = Math.max(opts.w, 0.001);
  const d = Math.max(opts.d, 0.001);
  const h = Math.max(opts.h, 0.001);
  const geo = opts.miter ? makeMiteredRailGeometry(w, d, h, opts.side) : new THREE.BoxGeometry(w, d, h);
  const mesh = new THREE.Mesh(geo, opts.material);
  mesh.position.set(opts.x, opts.y, opts.z);
  if (opts.partInfo) mesh.userData.partInfo = opts.partInfo;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.7 }));
  mesh.add(edges);
  group.add(mesh);
}

function makeMiteredRailGeometry(w, d, h, side) {
  const x0 = -w / 2;
  const x1 = w / 2;
  const z0 = -h / 2;
  const z1 = h / 2;
  let points;
  if (side === 'bottom') {
    points = [[x0, z0], [x1, z0], [x1 - h, z1], [x0 + h, z1]];
  } else if (side === 'top') {
    points = [[x0 + h, z0], [x1 - h, z0], [x1, z1], [x0, z1]];
  } else if (side === 'left') {
    points = [[x0, z0], [x1, z0 + w], [x1, z1 - w], [x0, z1]];
  } else if (side === 'right') {
    points = [[x0, z0 + w], [x1, z0], [x1, z1], [x0, z1 - w]];
  } else {
    return new THREE.BoxGeometry(w, d, h);
  }
  const y0 = -d / 2;
  const y1 = d / 2;
  const vertices = [];
  points.forEach(([x, z]) => vertices.push(x, y0, z));
  points.forEach(([x, z]) => vertices.push(x, y1, z));
  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function modelOpacity(plan) {
  return plan.modelOpacity === 'transparent' ? 0.5 : 1;
}

function materialSettings(plan, roughness, extra = {}) {
  const opacity = modelOpacity(plan);
  return {
    roughness,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    ...extra
  };
}

function makeModelMaterial(plan, color, roughness = 0.7, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    ...materialSettings(plan, roughness, extra)
  });
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function shadeHex(hex, amount) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const mix = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const nr = Math.round(r + (mix - r) * t);
  const ng = Math.round(g + (mix - g) * t);
  const nb = Math.round(b + (mix - b) * t);
  return (nr << 16) | (ng << 8) | nb;
}

function partMaterial(plan, naturalColor, part, roughness = 0.7) {
  const group = part.meta?.group || part.group;
  if (plan.modelPalette === 'component') {
    const componentColors = {
      face: 0x8b5a2b,
      support: 0x78b159,
      guide: 0x66d17a,
      spacer: 0x9ca3af,
      stretcher: 0xf4c86a,
      canvas: 0xf4f1e8,
      posts: 0xd8a7f1,
      rails: 0x3aa7a3,
      slats: 0x75d879,
      fasteners: 0x111827
    };
    return makeModelMaterial(plan, componentColors[group] || naturalColor, roughness);
  }
  const variation = ((hashString(part.id || part.name) % 9) - 4) / 40;
  return makeModelMaterial(plan, shadeHex(naturalColor, variation), roughness);
}

function shelfPartMaterial(plan, part) {
  const group = part.meta?.group;
  if (part.material === 'tote') {
    return makeModelMaterial(plan, plan.modelPalette === 'component' ? 0xfacc15 : 0xfbbf24, 0.58, { transparent: true, opacity: plan.modelOpacity === 'transparent' ? 0.35 : 0.68, depthWrite: false });
  }
  if (part.material === 'plywood') {
    return partMaterial(plan, 0xc7a268, { ...part, meta: { ...part.meta, group: 'slats' } }, 0.72);
  }
  if (plan.build === 'tote-rack') {
    const toteColors = {
      posts: 0xd8a7f1,
      frame: 0xf3f7bd,
      tie: 0x5ec46e,
      runner: 0x36aaa3,
      rails: 0x36aaa3,
      fasteners: 0x111827
    };
    const colorKey = part.meta?.subgroup || group;
    return makeModelMaterial(plan, toteColors[colorKey] || 0xc5a178, group === 'rails' ? 0.6 : 0.72);
  }
  const naturalColors = {
    posts: 0xb08f64,
    rails: 0x7a4a2d,
    slats: 0xc5a178,
    fasteners: 0x111827
  };
  return partMaterial(plan, naturalColors[group] || 0xc5a178, part, group === 'rails' ? 0.66 : 0.74);
}

function materials(plan) {
  const colors = {
    stain_dark_brown: 0x6f4e37,
    walnut: 0x8a5a3b,
    maple: 0xd4b483,
    black: 0x171717,
    white: 0xe5e7eb
  };
  const roughness = plan.finishSheen === 'gloss' ? 0.25 : plan.finishSheen === 'satin' ? 0.5 : 0.85;
  const isComponentPalette = plan.modelPalette === 'component';
  const canvasColor = isComponentPalette ? 0x93c5fd : 0xf4f1e8;
  return {
    frame: makeModelMaterial(plan, colors[plan.finishColor] || colors.stain_dark_brown, roughness),
    liner: makeModelMaterial(plan, 0xb08f64, 0.7),
    canvas: makeCanvasFrontMaterial(plan),
    canvasBack: makeModelMaterial(plan, canvasColor, 0.95, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    canvasSide: makeCanvasSideMaterial(plan),
    canvasReverse: makeModelMaterial(plan, canvasColor, 0.95, { side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    stretcher: makeModelMaterial(plan, isComponentPalette ? 0xf4c86a : 0xc5a178, 0.8),
    spacer: makeModelMaterial(plan, isComponentPalette ? 0x9ca3af : 0x9ca3af, 0.95),
    hardware: new THREE.MeshStandardMaterial({ color: plan.mountMethod === 'clips' ? 0x22c55e : 0x93c5fd, roughness: 0.35, metalness: 0.65 }),
    shelfScrew: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.7 }),
    screwShank: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.75 }),
    casterBlack: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.38, metalness: 0.55 }),
    casterMetal: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.8 }),
    casterWheel: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55, metalness: 0.05 })
  };
}

function makeCanvasFrontMaterial(plan) {
  const common = materialSettings(plan, 0.92, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  if (plan.modelPalette === 'component') {
    return new THREE.MeshStandardMaterial({ ...common, color: 0x93c5fd });
  }
  const style = normalizeCanvasArtStyle(plan.canvasAppearance);
  if (style === 'white') {
    return new THREE.MeshStandardMaterial({ ...common, color: 0xf4f1e8 });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  drawCanvasArtwork(ctx, canvas.width, canvas.height, style, 'front');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ ...common, color: 0xffffff, map: texture });
}

function makeCanvasSideMaterial(plan) {
  const common = materialSettings(plan, 0.94, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  if (plan.modelPalette === 'component') {
    return new THREE.MeshStandardMaterial({ ...common, color: 0x93c5fd });
  }
  const style = normalizeCanvasArtStyle(plan.canvasAppearance);
  if (style === 'white') {
    return new THREE.MeshStandardMaterial({ ...common, color: 0xf4f1e8 });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  drawCanvasArtwork(ctx, canvas.width, canvas.height, style, 'side');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1.5, 1);
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ ...common, color: 0xffffff, map: texture });
}

function normalizeCanvasArtStyle(value) {
  if (value === 'white') return 'white';
  if (value === 'art' || !value) return 'art_translucent';
  return value;
}

function drawCanvasArtwork(ctx, width, height, style, surface) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, width, height);
  if (style === 'art_spiral') {
    drawSpiralArtwork(ctx, width, height, surface);
  } else if (style === 'art_landscape') {
    drawLandscapeArtwork(ctx, width, height, surface);
  } else if (style === 'art_blocks') {
    drawBlockArtwork(ctx, width, height, surface);
  } else {
    drawTranslucentArtwork(ctx, width, height, surface);
  }
}

function drawTranslucentArtwork(ctx, width, height, surface) {
  const scaleX = width / 512;
  const scaleY = height / 384;
  const shapes = surface === 'side'
    ? [
        ['#255f9f', 0.55, [[-30, 34], [178, 2], [238, 132], [28, 118]]],
        ['#e2554f', 0.5, [[150, 18], [336, 0], [386, 96], [190, 126]]],
        ['#f3b33d', 0.52, [[304, 30], [536, 4], [500, 124], [270, 116]]],
        ['#58a875', 0.48, [[30, 74], [192, 42], [286, 126], [88, 132]]],
        ['#202632', 0.4, [[360, 70], [526, 40], [554, 122], [390, 128]]]
      ]
    : [
        ['#255f9f', 0.48, [[-40, 238], [246, 150], [512, 214], [512, 384], [42, 384]]],
        ['#f3b33d', 0.5, [[38, 22], [348, 0], [424, 136], [96, 154]]],
        ['#e2554f', 0.44, [[334, 40], [540, 76], [512, 224], [296, 184]]],
        ['#58a875', 0.42, [[96, 126], [286, 88], [330, 234], [122, 260]]],
        ['#202632', 0.34, [[-24, 248], [190, 206], [282, 298], [36, 346]]]
      ];
  drawPolygons(ctx, shapes, scaleX, scaleY);
  ctx.globalAlpha = surface === 'side' ? 0.1 : 0.16;
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 4 * Math.min(scaleX, scaleY);
  for (let x = -80 * scaleX; x < width + 80 * scaleX; x += 120 * scaleX) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + 180 * scaleX, 0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawBlockArtwork(ctx, width, height, surface) {
  const scaleX = width / 512;
  const scaleY = height / 384;
  const shapes = surface === 'side'
    ? [
        ['#255f9f', 0.82, [[0, 18], [208, 0], [254, 128], [0, 128]]],
        ['#202632', 0.74, [[224, 26], [386, 10], [430, 102], [244, 126]]],
        ['#58a875', 0.72, [[382, 0], [520, 0], [512, 82], [356, 104]]],
        ['#f3b33d', 0.78, [[500, 28], [620, 8], [620, 128], [468, 126]]]
      ]
    : [
        ['#e2554f', 0.88, [[28, 44], [178, 20], [138, 168], [16, 150]]],
        ['#255f9f', 0.88, [[226, 0], [512, 0], [512, 118], [318, 148]]],
        ['#f3b33d', 0.88, [[44, 236], [196, 176], [252, 360], [84, 384]]],
        ['#202632', 0.88, [[286, 162], [408, 116], [470, 234], [342, 282]]],
        ['#58a875', 0.88, [[176, 230], [302, 196], [296, 318], [190, 344]]]
      ];
  drawPolygons(ctx, shapes, scaleX, scaleY);
}

function drawSpiralArtwork(ctx, width, height, surface) {
  const cx = width / 2;
  const cy = height / 2;
  const count = surface === 'side' ? 9 : 16;
  const colors = ['#255f9f', '#58a875', '#f3b33d', '#e2554f', '#202632'];
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const angle = t * Math.PI * (surface === 'side' ? 2.6 : 4.4) - Math.PI * 0.45;
    const radius = Math.min(width, height) * (0.42 - t * 0.32);
    const size = Math.min(width, height) * (0.2 - t * 0.13);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 6);
    ctx.globalAlpha = 0.58 + t * 0.18;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.01);
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(width, height) * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLandscapeArtwork(ctx, width, height, surface) {
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.58);
  sky.addColorStop(0, '#d7ecff');
  sky.addColorStop(1, '#f4f1e8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#f3b33d';
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.24, Math.min(width, height) * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.82;
  drawPolygons(ctx, [
    ['#255f9f', 0.62, [[0, 220], [150, 118], [294, 226], [512, 106], [512, 384], [0, 384]]],
    ['#58a875', 0.72, [[0, 260], [188, 184], [356, 252], [512, 182], [512, 384], [0, 384]]],
    ['#202632', 0.25, [[0, 306], [512, 248], [512, 384], [0, 384]]]
  ], width / 512, height / 384);
  if (surface === 'side') {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#255f9f';
    ctx.fillRect(0, height * 0.64, width, height * 0.36);
  }
  ctx.globalAlpha = 1;
}

function drawPolygons(ctx, shapes, scaleX, scaleY) {
  shapes.forEach(([color, alpha, points]) => {
    ctx.beginPath();
    ctx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
    points.slice(1).forEach(([x, y]) => ctx.lineTo(x * scaleX, y * scaleY));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function formatPartSize(size) {
  return `${formatPartNumber(size.x)} x ${formatPartNumber(size.y)} x ${formatPartNumber(size.z)} in`;
}

function formatPartPosition(position) {
  return `${formatPartNumber(position.x)}, ${formatPartNumber(position.y)}, ${formatPartNumber(position.z)} in`;
}

function formatPartNumber(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, '');
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

function disposeObject(object) {
  object.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose?.());
    else node.material?.dispose?.();
  });
}
