import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { AbsenceStatus, LimitState } from '../lib/types';

export interface Tower {
  id: string;
  label: string;
  hoursText: string;
  hours: number;
  segments: Record<AbsenceStatus, number>;
  state: LimitState;
}

export interface SkylineApi {
  setTowers(towers: Tower[]): void;
  setSelected(id: string | null): void;
  refreshTheme(): void;
  dispose(): void;
}

interface Slot {
  id: string;
  group: THREE.Group;
  stack: THREE.Group;
  tile: THREE.Mesh;
  tileMaterial: THREE.MeshStandardMaterial;
  label: HTMLDivElement;
  height: number;
  grow: number;
  lift: number;
  spread: number;
  state: LimitState;
}

const TILE = 1.42;
const GAP = 0.26;
const TOWER = 0.82;
const MAX_HEIGHT = 3.1;
const ORDER: AbsenceStatus[] = ['unjustified', 'unclassified', 'justified'];

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const damp = (from: number, to: number, speed: number, dt: number) => from + (to - from) * (1 - Math.exp(-speed * dt));

/** Crea la maqueta en `host`. Lanza un error si el navegador no permite WebGL. */
export function createSkyline(
  host: HTMLElement,
  labels: HTMLElement,
  onSelect: (id: string) => void,
): SkylineApi {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.touchAction = 'pan-y';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const root = new THREE.Group();
  scene.add(root);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6d8c, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(5, 11, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 5;
  scene.add(sun);

  const materials: Record<AbsenceStatus, THREE.MeshStandardMaterial> = {
    justified: new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05 }),
    unjustified: new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05 }),
    unclassified: new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05 }),
  };
  const boardMaterial = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 });

  let board: THREE.Mesh | null = null;
  const tileGeometry = new RoundedBoxGeometry(TILE, 0.14, TILE, 4, 0.06);
  let slots: Slot[] = [];
  let selected: string | null = null;
  let hovered: string | null = null;
  let unit = 1;

  // Encuadre y órbita
  let yaw = -0.62;
  let pitch = 0.72;
  let yawVelocity = 0;
  let radius = 18;
  let lastInteraction = -Infinity;
  const target = new THREE.Vector3(0, 0.95, 0);

  function placeCamera() {
    camera.position.set(
      target.x,
      target.y + radius * Math.sin(pitch),
      target.z + radius * Math.cos(pitch),
    );
    camera.lookAt(target);
    root.rotation.y = yaw;
  }

  function resize() {
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    camera.aspect = width / height;
    radius = 14.8 * Math.max(1, 1.2 / camera.aspect);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  function refreshTheme() {
    materials.justified.color.set(css('--mark-justified'));
    materials.unjustified.color.set(css('--mark-unjustified'));
    materials.unclassified.color.set(css('--mark-unclassified'));
    boardMaterial.color.set(css('--board'));
    slots.forEach(paintTile);
    dirty = true;
  }

  function paintTile(slot: Slot) {
    const token = {
      unset: '--tile-unset',
      ok: '--mark-justified',
      near: '--mark-near',
      reached: '--mark-limit',
      exceeded: '--mark-limit',
    }[slot.state];
    slot.tileMaterial.color.set(css(token));
    slot.tileMaterial.emissive.set(css(token));
    slot.tileMaterial.emissiveIntensity = slot.state === 'unset' ? 0 : 0.18;
  }

  function buildSlots(towers: Tower[]) {
    slots.forEach((s) => {
      root.remove(s.group);
      s.tileMaterial.dispose();
      s.label.remove();
      disposeStack(s);
    });
    if (board) {
      root.remove(board);
      board.geometry.dispose();
    }
    const cols = Math.ceil(Math.sqrt(towers.length));
    const rows = Math.ceil(towers.length / cols);
    const pitchStep = TILE + GAP;
    const width = cols * pitchStep + 0.34;
    const depth = rows * pitchStep + 0.34;
    board = new THREE.Mesh(new RoundedBoxGeometry(width, 0.34, depth, 5, 0.14), boardMaterial);
    board.position.y = -0.17;
    board.receiveShadow = true;
    board.castShadow = true;
    root.add(board);

    slots = towers.map((t, i) => {
      const group = new THREE.Group();
      group.position.set(
        ((i % cols) - (cols - 1) / 2) * pitchStep,
        0,
        (Math.floor(i / cols) - (rows - 1) / 2) * pitchStep,
      );
      const tileMaterial = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      tile.position.y = 0.07;
      tile.receiveShadow = true;
      tile.userData.id = t.id;
      const stack = new THREE.Group();
      stack.position.y = 0.14;
      group.add(tile, stack);
      root.add(group);

      const label = document.createElement('div');
      label.className = 'skyline-label';
      labels.appendChild(label);
      return {
        id: t.id, group, stack, tile, tileMaterial, label,
        height: 0, grow: reduced ? 1 : 0, lift: 0, spread: 1, state: t.state,
      };
    });
  }

  function disposeStack(slot: Slot) {
    slot.stack.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    slot.stack.clear();
  }

  function setTowers(towers: Tower[]) {
    if (towers.map((t) => t.id).join() !== slots.map((s) => s.id).join()) buildSlots(towers);
    unit = MAX_HEIGHT / Math.max(6, ...towers.map((t) => t.hours));

    towers.forEach((t, i) => {
      const slot = slots[i];
      const nextHeight = t.hours * unit;
      // La torre parte de su altura anterior y crece o encoge hasta la nueva.
      if (!reduced && nextHeight > 0 && slot.height > 0) slot.grow = slot.height / nextHeight;
      slot.height = nextHeight;
      slot.state = t.state;
      paintTile(slot);
      disposeStack(slot);

      let y = 0;
      for (const status of ORDER) {
        const h = t.segments[status] * unit;
        if (h <= 0) continue;
        const piece = new THREE.Mesh(
          new RoundedBoxGeometry(TOWER, h, TOWER, 3, Math.min(0.09, h / 2.2)),
          materials[status],
        );
        piece.position.y = y + h / 2;
        piece.castShadow = true;
        piece.receiveShadow = true;
        piece.userData.id = t.id;
        slot.stack.add(piece);
        y += h;
      }
      slot.label.innerHTML = '';
      const name = document.createElement('span');
      name.textContent = t.label;
      const hours = document.createElement('strong');
      hours.textContent = t.hoursText;
      slot.label.append(hours, name);
    });
    dirty = true;
  }

  // Interacción
  const pointer = new THREE.Vector2();
  const ray = new THREE.Raycaster();

  function pick(event: PointerEvent): string | null {
    const box = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const targets = slots.flatMap((s) => [s.tile, ...(s.stack.children as THREE.Mesh[])]);
    const hit = ray.intersectObjects(targets, false)[0];
    return (hit?.object.userData.id as string | undefined) ?? null;
  }

  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    yawVelocity = 0;
    canvas.setPointerCapture(e.pointerId);
    lastInteraction = performance.now();
  };

  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw += dx * 0.008;
      yawVelocity = dx * 0.008 * 60;
      if (e.pointerType === 'mouse') pitch = THREE.MathUtils.clamp(pitch + dy * 0.005, 0.32, 1.25);
      lastInteraction = performance.now();
      dirty = true;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const id = pick(e);
    if (id !== hovered) {
      hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'grab';
      dirty = true;
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) {
      const id = pick(e);
      if (id) onSelect(id);
    }
  };
  const onCancel = () => { dragging = false; };
  const onLeave = () => { hovered = null; dirty = true; };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.style.cursor = 'grab';

  // Bucle: se detiene si la escena no está a la vista.
  let dirty = true;
  let visible = true;
  let frame = 0;
  let last = performance.now();
  // Si el equipo va justo, se baja la calidad en lugar de ralentizar toda la aplicación.
  let slowFrames = 0;
  let sampled = 0;
  let lowQuality = false;

  function watchPerformance(frameMs: number) {
    if (lowQuality) return;
    sampled += 1;
    if (frameMs > 45) slowFrames += 1;
    if (sampled < 45) return;
    if (slowFrames > 20) {
      lowQuality = true;
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      sun.castShadow = false;
      resize();
    }
    sampled = 0;
    slowFrames = 0;
  }
  const v = new THREE.Vector3();

  function updateLabels(width: number, height: number) {
    for (const s of slots) {
      v.set(0, 0.14 + s.height + s.lift + 0.2, 0);
      s.group.localToWorld(v);
      const depth = v.clone().sub(camera.position).length();
      v.project(camera);
      const x = ((v.x + 1) / 2) * width;
      const y = ((1 - v.y) / 2) * height;
      s.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      s.label.style.opacity = String(THREE.MathUtils.clamp(1.9 - depth / radius, 0.55, 1));
      s.label.dataset.selected = String(s.id === selected);
    }
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    const elapsed = now - last;
    const dt = Math.min(elapsed / 1000, 0.05);
    last = now;
    if (!visible || document.hidden) return;

    let moving = false;
    const idle = now - lastInteraction > 5000;
    if (!dragging) {
      if (Math.abs(yawVelocity) > 0.002) {
        yaw += yawVelocity * dt;
        yawVelocity *= Math.exp(-3.2 * dt);
        moving = true;
      } else if (!reduced && idle && !lowQuality) {
        yaw += 0.1 * dt;
        moving = true;
      }
    }

    for (const s of slots) {
      const active = s.id === selected;
      const hover = s.id === hovered;
      const liftTo = active ? 0.2 : hover ? 0.1 : 0;
      const spreadTo = hover || active ? 1.07 : 1;
      if (reduced) {
        s.grow = 1;
        s.lift = liftTo;
        s.spread = spreadTo;
      } else {
        const before = s.grow + s.lift + s.spread;
        s.grow = damp(s.grow, 1, 5, dt);
        s.lift = damp(s.lift, liftTo, 10, dt);
        s.spread = damp(s.spread, spreadTo, 10, dt);
        if (Math.abs(s.grow + s.lift + s.spread - before) > 0.0003) moving = true;
      }
      s.stack.position.y = 0.14 + s.lift;
      s.stack.scale.set(s.spread, s.grow, s.spread);
      s.tile.scale.set(s.spread, 1, s.spread);
      if (s.state === 'exceeded' && !reduced) {
        s.tileMaterial.emissiveIntensity = 0.3 + Math.sin(now / 420) * 0.2;
        moving = true;
      }
    }

    if (moving || dirty) {
      placeCamera();
      root.updateMatrixWorld(true);
      renderer.render(scene, camera);
      updateLabels(host.clientWidth, host.clientHeight);
      dirty = false;
      if (moving) watchPerformance(elapsed);
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; });
  visibility.observe(host);

  resize();
  frame = requestAnimationFrame(tick);

  return {
    setTowers,
    setSelected(id) { selected = id; dirty = true; },
    refreshTheme,
    dispose() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      slots.forEach((s) => { disposeStack(s); s.tileMaterial.dispose(); s.label.remove(); });
      board?.geometry.dispose();
      tileGeometry.dispose();
      boardMaterial.dispose();
      Object.values(materials).forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
