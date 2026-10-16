'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// -------------------------------------------------------------
// 1. SOUND & AUDIO ENGINE (Standalone Web Audio API)
// -------------------------------------------------------------
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isMusicPlaying = false;
    this.musicAudio = null;
    this.windGain = null;
    this.windFilter = null;
    this.isAmbientPlaying = false;
    this.zenTimer = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbient() {
    if (this.isAmbientPlaying || !this.ctx) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = 2 * sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.8;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
      this.windFilter = filter;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.035, this.ctx.currentTime);
      this.windGain = gain;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      this.isAmbientPlaying = true;
    } catch (e) {
      console.warn('Ambient audio error:', e);
    }
  }

  stopAmbient() {
    if (this.windGain && this.ctx) {
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.isAmbientPlaying = false;
  }

  toggleAmbient() {
    this.init();
    if (this.isAmbientPlaying) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  playProceduralZenMusic() {
    if (this.zenTimer || !this.ctx) return;
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 392.00]  // G6
    ];
    let step = 0;

    const playStep = () => {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const currentChord = chords[step % chords.length];
      step++;

      currentChord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const startTime = t + idx * 0.18;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.025, startTime + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 4.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 4.3);
      });
    };

    playStep();
    this.zenTimer = setInterval(playStep, 5000);
  }

  stopProceduralZenMusic() {
    if (this.zenTimer) {
      clearInterval(this.zenTimer);
      this.zenTimer = null;
    }
  }

  playMusic() {
    this.init();
    if (!this.musicAudio && typeof window !== 'undefined') {
      this.musicAudio = new Audio('/wonderwall.mp3');
      this.musicAudio.loop = true;
      this.musicAudio.volume = 0.7;
    }
    if (this.musicAudio) {
      this.musicAudio.muted = this.isMuted;
      this.musicAudio.play().catch(() => {
        this.playProceduralZenMusic();
      });
    } else {
      this.playProceduralZenMusic();
    }
    this.isMusicPlaying = true;
  }

  pauseMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause();
    }
    this.stopProceduralZenMusic();
    this.isMusicPlaying = false;
  }

  toggleMusic() {
    this.init();
    if (this.isMusicPlaying) {
      this.pauseMusic();
      return false;
    } else {
      this.playMusic();
      return true;
    }
  }

  playPetalPluck() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const freq = notes[Math.floor(Math.random() * notes.length)];

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc1.frequency.exponentialRampToValueAtTime(freq * 0.995, t + 0.8);

    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.01, t);
    gain2.gain.setValueAtTime(0.04, t);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.95);
    osc2.stop(t + 0.45);
  }

  playWaterDrop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = 800 + Math.random() * 400;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, t + 0.08);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playBloom() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chord = [392.0, 523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteStart = t + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.85, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq, noteStart + 0.35);

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.linearRampToValueAtTime(0.07, noteStart + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 1.45);
    });
  }

  dispose() {
    this.pauseMusic();
    this.stopAmbient();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
    }
  }
}

// -------------------------------------------------------------
// 2. PROCEDURAL TEXTURES
// -------------------------------------------------------------
function createLotusPetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 1024);

  const grad = ctx.createLinearGradient(0, 1024, 0, 0);
  grad.addColorStop(0, 'rgba(235, 252, 220, 0.95)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.98)');
  grad.addColorStop(0.55, 'rgba(255, 230, 240, 0.92)');
  grad.addColorStop(0.8, 'rgba(255, 128, 170, 0.95)');
  grad.addColorStop(1.0, 'rgba(235, 60, 130, 1.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  ctx.strokeStyle = 'rgba(230, 70, 130, 0.15)';
  ctx.lineWidth = 1.6;
  for (let x = 40; x <= 472; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 1024);
    const ctrl1X = x + (x - 256) * 0.25;
    const ctrl2X = x + (x - 256) * 0.1;
    ctx.bezierCurveTo(ctrl1X, 600, ctrl2X, 250, 256 + (x - 256) * 0.15, 0);
    ctx.stroke();
  }

  const edgeGrad = ctx.createLinearGradient(0, 0, 512, 0);
  edgeGrad.addColorStop(0, 'rgba(240, 90, 150, 0.28)');
  edgeGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0)');
  edgeGrad.addColorStop(0.88, 'rgba(255, 255, 255, 0)');
  edgeGrad.addColorStop(1, 'rgba(240, 90, 150, 0.28)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, 512, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createLotusSeedPodTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bumpCtx = bumpCanvas.getContext('2d');

  const bgGrad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  bgGrad.addColorStop(0, '#e8dc4b');
  bgGrad.addColorStop(0.75, '#c5cf32');
  bgGrad.addColorStop(1.0, '#8ea825');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, 512, 512);

  const carpelPositions = [
    { x: 256, y: 256, r: 18 },
    ...Array.from({ length: 6 }).map((_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return { x: 256 + Math.cos(a) * 78, y: 256 + Math.sin(a) * 78, r: 17 };
    }),
    ...Array.from({ length: 12 }).map((_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.25;
      return { x: 256 + Math.cos(a) * 160, y: 256 + Math.sin(a) * 160, r: 16 };
    })
  ];

  carpelPositions.forEach((pos) => {
    const poreGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pos.r);
    poreGrad.addColorStop(0, '#ffe853');
    poreGrad.addColorStop(0.35, '#8c7e18');
    poreGrad.addColorStop(0.7, '#423c09');
    poreGrad.addColorStop(1.0, 'rgba(80, 100, 20, 0.4)');
    ctx.fillStyle = poreGrad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fill();

    const bGrad = bumpCtx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pos.r);
    bGrad.addColorStop(0, '#ffffff');
    bGrad.addColorStop(0.4, '#202020');
    bGrad.addColorStop(1, '#808080');
    bumpCtx.fillStyle = bGrad;
    bumpCtx.beginPath();
    bumpCtx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    bumpCtx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  return { pod: texture, podBump: bumpMap };
}

function createLotusPadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(512, 512, 20, 512, 512, 510);
  grad.addColorStop(0, '#5ea84c');
  grad.addColorStop(0.4, '#2d6d2a');
  grad.addColorStop(0.85, '#1e4d1c');
  grad.addColorStop(1.0, '#133511');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(512, 512, 508, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b7dc7a';
  ctx.beginPath();
  ctx.arc(512, 512, 16, 0, Math.PI * 2);
  ctx.fill();

  const veinCount = 22;
  for (let i = 0; i < veinCount; i++) {
    const angle = (i / veinCount) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(180, 230, 130, 0.35)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(512, 512);

    const endX = 512 + Math.cos(angle) * 490;
    const endY = 512 + Math.sin(angle) * 490;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    for (let d = 120; d < 460; d += 65) {
      const bx = 512 + Math.cos(angle) * d;
      const by = 512 + Math.sin(angle) * d;
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(160, 220, 120, 0.22)';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(angle + 0.4) * 42, by + Math.sin(angle + 0.4) * 42);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(angle - 0.4) * 42, by + Math.sin(angle - 0.4) * 42);
      ctx.stroke();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

// -------------------------------------------------------------
// 3. 3D LOTUS PETAL GEOMETRY
// -------------------------------------------------------------
function createLotusPetalGeometry(length = 2.0, maxWidth = 0.82, cupDepth = 0.28) {
  const vSegs = 22;
  const uSegs = 12;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= vSegs; i++) {
    const v = i / vSegs;
    let widthFactor;
    if (v < 0.6) {
      widthFactor = 0.25 + 0.75 * Math.sin((v / 0.6) * (Math.PI / 2));
    } else {
      widthFactor = Math.cos(((v - 0.6) / 0.4) * (Math.PI / 2));
    }
    const curWidth = maxWidth * widthFactor;
    const archY = length * v;
    const archZ = -Math.sin(v * Math.PI * 0.75) * 0.45 + Math.pow(v, 2.5) * 0.15;

    for (let j = 0; j <= uSegs; j++) {
      const u = j / uSegs;
      const uCent = (u - 0.5) * 2;
      const posX = uCent * (curWidth * 0.5);
      const transverseCup = cupDepth * (1 - uCent * uCent) * Math.sin(v * Math.PI * 0.85);
      const posZ = archZ + transverseCup;
      const posY = archY;

      positions.push(posX, posY, posZ);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < vSegs; i++) {
    for (let j = 0; j < uSegs; j++) {
      const row1 = i * (uSegs + 1);
      const row2 = (i + 1) * (uSegs + 1);
      const a = row1 + j;
      const b = row1 + j + 1;
      const c = row2 + j;
      const d = row2 + j + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// -------------------------------------------------------------
// 4. LOTUS FLOWER CLASS
// -------------------------------------------------------------
class LotusFlower {
  constructor(textures, soundEngine, options = {}) {
    this.height = options.height || 2.4;
    this.stemBend = options.stemBend || { x: 0.1, z: 0.05 };
    this.textures = textures;
    this.sound = soundEngine;

    this.group = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.petals = [];
    this.pluckedPetals = [];

    this.bloomProgress = 1.0;
    this.targetBloom = 1.0;
    this.windPhase = Math.random() * Math.PI * 2;

    this.initMaterials();
    this.buildStem();
    this.buildReceptacleAndStamens();
    this.buildPetals();

    this.group.add(this.headGroup);
  }

  initMaterials() {
    this.petalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.petal,
      roughness: 0.36,
      metalness: 0.04,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    this.podMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.pod,
      bumpMap: this.textures.podBump,
      bumpScale: 0.06,
      roughness: 0.55,
      metalness: 0.02
    });

    this.stamenMaterial = new THREE.MeshStandardMaterial({
      color: 0xffea5c,
      roughness: 0.4,
      metalness: 0.1
    });

    this.stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x427339,
      roughness: 0.6,
      metalness: 0.03
    });
  }

  buildStem() {
    const h = this.height;
    const bx = this.stemBend.x;
    const bz = this.stemBend.z;

    this.stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bx * 0.25, h * 0.3, bz * 0.25),
      new THREE.Vector3(bx * 0.7, h * 0.7, bz * 0.7),
      new THREE.Vector3(bx, h, bz)
    ]);

    const stemGeom = new THREE.TubeGeometry(this.stemCurve, 32, 0.065, 12, false);
    this.stemMesh = new THREE.Mesh(stemGeom, this.stemMaterial);
    this.stemMesh.castShadow = true;
    this.stemMesh.receiveShadow = true;
    this.group.add(this.stemMesh);

    this.headGroup.position.set(bx, h, bz);

    const calyxGeom = new THREE.CylinderGeometry(0.55, 0.1, 0.25, 24);
    const calyxMesh = new THREE.Mesh(calyxGeom, this.stemMaterial);
    calyxMesh.position.y = -0.12;
    this.headGroup.add(calyxMesh);
  }

  buildReceptacleAndStamens() {
    const podGeom = new THREE.CylinderGeometry(0.52, 0.24, 0.38, 32);
    this.podMesh = new THREE.Mesh(podGeom, this.podMaterial);
    this.podMesh.position.y = 0.14;
    this.podMesh.castShadow = true;
    this.podMesh.receiveShadow = true;
    this.headGroup.add(this.podMesh);

    const stamenCount = 54;
    const stamenGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5);
    stamenGeom.translate(0, 0.16, 0);

    const antherGeom = new THREE.SphereGeometry(0.026, 6, 6);
    antherGeom.scale(1, 1.8, 1);
    antherGeom.translate(0, 0.32, 0);

    const stamenGroup = new THREE.Group();
    for (let i = 0; i < stamenCount; i++) {
      const angle = (i / stamenCount) * Math.PI * 2;
      const rad = 0.44 + (i % 2 === 0 ? 0.06 : 0.0);

      const stamenMesh = new THREE.Mesh(stamenGeom, this.stamenMaterial);
      const antherMesh = new THREE.Mesh(antherGeom, this.stamenMaterial);
      const singleStamen = new THREE.Group();
      singleStamen.add(stamenMesh);
      singleStamen.add(antherMesh);

      singleStamen.position.set(Math.cos(angle) * rad, 0.04, Math.sin(angle) * rad);
      singleStamen.rotation.y = -angle;
      singleStamen.rotation.x = 0.15 + (i % 3) * 0.05;
      stamenGroup.add(singleStamen);
    }
    this.headGroup.add(stamenGroup);
  }

  buildPetals() {
    const layers = [
      { count: 6, length: 1.35, width: 0.65, cup: 0.34, radius: 0.42, yOffset: 0.08, openAngle: 0.28, closedAngle: 0.06 },
      { count: 8, length: 1.65, width: 0.78, cup: 0.30, radius: 0.52, yOffset: 0.04, openAngle: 0.52, closedAngle: 0.10 },
      { count: 10, length: 1.95, width: 0.88, cup: 0.26, radius: 0.62, yOffset: -0.01, openAngle: 0.82, closedAngle: 0.14 },
      { count: 12, length: 2.25, width: 0.98, cup: 0.22, radius: 0.72, yOffset: -0.06, openAngle: 1.15, closedAngle: 0.18 }
    ];

    let globalIndex = 0;
    layers.forEach((layer, layerIdx) => {
      const geom = createLotusPetalGeometry(layer.length, layer.width, layer.cup);

      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + (layerIdx * 0.32);
        const pivot = new THREE.Group();
        pivot.rotation.y = angle;
        this.headGroup.add(pivot);

        const mesh = new THREE.Mesh(geom, this.petalMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(0, layer.yOffset, layer.radius);
        mesh.rotation.x = layer.openAngle;
        pivot.add(mesh);

        const petalData = {
          pivot,
          mesh,
          layerIdx,
          petalIndex: globalIndex++,
          angle,
          layerConfig: layer,
          currentTilt: layer.openAngle,
          isPlucked: false,
          bloomDelay: layerIdx * 0.18 + (i / layer.count) * 0.06
        };

        mesh.userData = {
          isPetal: true,
          data: petalData,
          flower: this
        };

        this.petals.push(petalData);
      }
    });
  }

  setBloom(progress) {
    this.targetBloom = THREE.MathUtils.clamp(progress, 0.05, 1.0);
  }

  pluckPetal(petalData, worldScene) {
    if (petalData.isPlucked) return;
    petalData.isPlucked = true;

    if (this.sound) this.sound.playPetalPluck();

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    petalData.mesh.getWorldPosition(worldPos);
    petalData.mesh.getWorldQuaternion(worldQuat);

    petalData.pivot.remove(petalData.mesh);
    worldScene.add(petalData.mesh);

    petalData.mesh.position.copy(worldPos);
    petalData.mesh.quaternion.copy(worldQuat);

    const physics = {
      mesh: petalData.mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        -0.15 - Math.random() * 0.1,
        (Math.random() - 0.5) * 0.4
      ),
      rotVel: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ),
      hasLanded: false,
      floatTime: 0
    };

    this.pluckedPetals.push(physics);
  }

  pluckRandomPetal(worldScene) {
    const available = this.petals.filter(p => !p.isPlucked);
    if (available.length === 0) return null;
    available.sort((a, b) => b.layerIdx - a.layerIdx);
    const chosen = available[Math.floor(Math.random() * Math.min(6, available.length))];
    this.pluckPetal(chosen, worldScene);
    return chosen;
  }

  resetAllPetals(worldScene) {
    this.pluckedPetals.forEach((p) => {
      worldScene.remove(p.mesh);
    });
    this.pluckedPetals = [];

    this.petals.forEach((p) => {
      if (p.isPlucked) {
        p.isPlucked = false;
        p.pivot.add(p.mesh);
        p.mesh.position.set(0, p.layerConfig.yOffset, p.layerConfig.radius);
        p.mesh.rotation.set(p.currentTilt, 0, 0);
      }
    });

    this.targetBloom = 1.0;
    if (this.sound) this.sound.playBloom();
  }

  update(delta, time, waterSurface) {
    this.bloomProgress += (this.targetBloom - this.bloomProgress) * 3.5 * delta;

    const sway = Math.sin(time * 1.2 + this.windPhase) * 0.04;
    const swayZ = Math.cos(time * 0.9 + this.windPhase) * 0.035;
    this.headGroup.rotation.z = sway;
    this.headGroup.rotation.x = swayZ;

    this.petals.forEach((p) => {
      if (p.isPlucked) return;

      const delayedBloom = THREE.MathUtils.clamp(
        (this.bloomProgress - p.bloomDelay * 0.4) / (1 - p.bloomDelay * 0.4),
        0.0,
        1.0
      );

      const openAngle = p.layerConfig.openAngle;
      const closedAngle = p.layerConfig.closedAngle;
      const targetTilt = closedAngle + (openAngle - closedAngle) * delayedBloom;

      p.currentTilt += (targetTilt - p.currentTilt) * 6.0 * delta;
      p.mesh.rotation.x = p.currentTilt;

      const flutter = Math.sin(time * 2.5 + p.angle * 3.0) * 0.015 * this.bloomProgress;
      p.mesh.rotation.z = flutter;
    });

    for (let i = this.pluckedPetals.length - 1; i >= 0; i--) {
      const item = this.pluckedPetals[i];
      if (!item.hasLanded) {
        item.velocity.y -= 0.8 * delta;
        item.velocity.y = Math.max(item.velocity.y, -1.2);

        item.mesh.position.addScaledVector(item.velocity, delta);
        item.mesh.rotation.x += item.rotVel.x * delta;
        item.mesh.rotation.y += item.rotVel.y * delta;
        item.mesh.rotation.z += item.rotVel.z * delta;

        if (item.mesh.position.y <= 0.05) {
          item.mesh.position.y = 0.05;
          item.hasLanded = true;
          item.velocity.set(0, 0, 0);

          if (waterSurface) {
            waterSurface.addRipple(item.mesh.position.x, item.mesh.position.z, 0.4);
          }
          if (this.sound) this.sound.playWaterDrop();
        }
      } else {
        item.floatTime += delta;
        const floatBob = Math.sin(time * 1.8 + item.mesh.position.x) * 0.015;
        item.mesh.position.y = 0.045 + floatBob;
        item.mesh.rotation.x *= 0.95;
        item.mesh.rotation.z *= 0.95;
        item.mesh.position.x += 0.02 * delta;
      }
    }
  }
}

// -------------------------------------------------------------
// 5. LOTUS PAD (Water Lily Pad Leaf) CLASS
// -------------------------------------------------------------
class LotusPad {
  constructor(texture, radius = 2.0, x = 0, z = 0) {
    this.radius = radius;
    this.group = new THREE.Group();
    this.phase = Math.random() * Math.PI * 2;

    const segs = 48;
    const positions = [];
    const uvs = [];
    const indices = [];

    positions.push(0, 0, 0);
    uvs.push(0.5, 0.5);

    const notchAngle = 0.32;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const angle = notchAngle / 2 + t * (Math.PI * 2 - notchAngle);
      const edgeWobble = 1.0 + Math.sin(angle * 7) * 0.025;
      const r = radius * edgeWobble;

      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;
      const py = Math.pow(r / radius, 2) * 0.05;

      positions.push(px, py, pz);
      uvs.push(0.5 + Math.cos(angle) * 0.48, 0.5 + Math.sin(angle) * 0.48);
    }

    for (let i = 1; i <= segs; i++) {
      indices.push(0, i, i + 1);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    this.group.position.set(x, 0.02, z);
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  update(time) {
    const bob = Math.sin(time * 1.5 + this.phase) * 0.012;
    this.group.position.y = 0.02 + bob;
  }
}

// -------------------------------------------------------------
// 6. ANIMATED WATER SURFACE (Ripples & Caustic Waves)
// -------------------------------------------------------------
class WaterSurface {
  constructor(radius = 35) {
    this.radius = radius;
    this.ripples = [];

    const geom = new THREE.PlaneGeometry(radius * 2, radius * 2, 80, 80);
    geom.rotateX(-Math.PI / 2);

    this.basePositions = geom.attributes.position.array.slice();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a263d,
      roughness: 0.06,
      metalness: 0.92,
      transparent: true,
      opacity: 0.88
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
    this.mesh.position.y = 0.01;
  }

  addRipple(x, z, strength = 0.5) {
    this.ripples.push({
      x,
      z,
      radius: 0.05,
      maxRadius: 4.5,
      amplitude: 0.08 * strength,
      speed: 1.8 + Math.random() * 0.4,
      life: 1.0
    });
    if (this.ripples.length > 20) {
      this.ripples.shift();
    }
  }

  update(delta, time) {
    const pos = this.mesh.geometry.attributes.position;
    const arr = pos.array;
    const base = this.basePositions;

    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const rip = this.ripples[r];
      rip.radius += rip.speed * delta;
      rip.life -= delta * 0.42;
      if (rip.life <= 0 || rip.radius > rip.maxRadius) {
        this.ripples.splice(r, 1);
      }
    }

    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];

      let waveY =
        Math.sin(x * 0.4 + time * 1.3) * 0.022 +
        Math.cos(z * 0.45 + time * 1.1) * 0.018 +
        Math.sin((x + z) * 0.3 + time * 1.7) * 0.012;

      for (let r = 0; r < this.ripples.length; r++) {
        const rip = this.ripples[r];
        const dist = Math.hypot(x - rip.x, z - rip.z);
        const diff = Math.abs(dist - rip.radius);
        if (diff < 0.8) {
          const factor = Math.cos((diff / 0.8) * (Math.PI / 2));
          waveY += Math.sin(diff * 8 - time * 6) * rip.amplitude * rip.life * factor;
        }
      }

      arr[i + 1] = waveY;
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

// -------------------------------------------------------------
// 7. ANIMATED KOI FISH SCHOOL (Atmospheric Living Water)
// -------------------------------------------------------------
class KoiFishSchool {
  constructor(count = 4) {
    this.group = new THREE.Group();
    this.fishList = [];

    const colors = [
      { body: 0xff6b35, belly: 0xfff0e6, spot: 0xd62828 }, // Orange Kohaku
      { body: 0xffffff, belly: 0xffffff, spot: 0xe63946 }, // White Tancho with red crown
      { body: 0xf4a261, belly: 0xffe8d6, spot: 0xe76f51 }, // Golden Sunset
      { body: 0xe29578, belly: 0xffddd2, spot: 0x9b2226 }  // Deep Amber
    ];

    for (let i = 0; i < count; i++) {
      const fishColor = colors[i % colors.length];
      const fishGroup = new THREE.Group();

      const bodyGeom = new THREE.ConeGeometry(0.14, 0.9, 12);
      bodyGeom.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: fishColor.body,
        roughness: 0.3,
        metalness: 0.15
      });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      fishGroup.add(bodyMesh);

      const tailGeom = new THREE.BufferGeometry();
      const tailVerts = new Float32Array([
        0, 0, -0.45,
        -0.18, 0, -0.85,
        0.18, 0, -0.85
      ]);
      tailGeom.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
      tailGeom.computeVertexNormals();
      const tailMat = new THREE.MeshStandardMaterial({
        color: fishColor.spot,
        roughness: 0.4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const tailMesh = new THREE.Mesh(tailGeom, tailMat);
      fishGroup.add(tailMesh);

      const finGeom = new THREE.BufferGeometry();
      const finVerts = new Float32Array([
        0, 0, 0.1,
        0.28, -0.05, -0.15,
        0.1, -0.02, -0.22
      ]);
      finGeom.setAttribute('position', new THREE.BufferAttribute(finVerts, 3));
      finGeom.computeVertexNormals();
      const finMat = new THREE.MeshStandardMaterial({
        color: fishColor.belly,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const leftFin = new THREE.Mesh(finGeom, finMat);
      const rightFin = leftFin.clone();
      rightFin.scale.x = -1;
      fishGroup.add(leftFin, rightFin);

      fishGroup.scale.setScalar(0.75 + Math.random() * 0.35);
      this.group.add(fishGroup);

      this.fishList.push({
        group: fishGroup,
        tailMesh,
        leftFin,
        rightFin,
        angle: (i / count) * Math.PI * 2,
        radius: 2.3 + i * 1.1 + Math.random() * 0.6,
        speed: 0.28 + Math.random() * 0.18,
        depth: -0.08 - (i * 0.05),
        wobbleSpeed: 4.5 + Math.random() * 2.0,
        rippleTimer: 0
      });
    }
  }

  update(delta, time, waterSurface) {
    this.fishList.forEach((fish) => {
      fish.angle += fish.speed * delta;
      
      const px = Math.cos(fish.angle) * fish.radius + Math.sin(time * 0.5 + fish.angle) * 0.4;
      const pz = Math.sin(fish.angle) * fish.radius * 0.85 + Math.cos(time * 0.4 + fish.angle) * 0.4;
      const py = fish.depth + Math.sin(time * 1.5 + fish.angle) * 0.03;

      fish.group.position.set(px, py, pz);

      const nextAngle = fish.angle + 0.05;
      const nx = Math.cos(nextAngle) * fish.radius;
      const nz = Math.sin(nextAngle) * fish.radius * 0.85;
      fish.group.rotation.y = Math.atan2(px - nx, pz - nz);

      const wiggle = Math.sin(time * fish.wobbleSpeed) * 0.45;
      fish.tailMesh.rotation.y = wiggle;
      fish.group.rotation.z = Math.sin(time * fish.wobbleSpeed * 0.5) * 0.08;

      fish.leftFin.rotation.z = Math.sin(time * 5.0) * 0.2;
      fish.rightFin.rotation.z = -Math.sin(time * 5.0) * 0.2;

      fish.rippleTimer += delta;
      if (fish.rippleTimer > 2.8 + Math.random() * 2.0) {
        fish.rippleTimer = 0;
        if (waterSurface) {
          waterSurface.addRipple(px, pz, 0.25);
        }
      }
    });
  }
}

// -------------------------------------------------------------
// 8. ANIMATED DRAGONFLIES (Ethereal Pond Insects)
// -------------------------------------------------------------
class DragonflySystem {
  constructor(count = 2) {
    this.group = new THREE.Group();
    this.dragonflies = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x48cae4,
      emissive: 0x0077b6,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.4,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < count; i++) {
      const dfGroup = new THREE.Group();

      const bodyGeom = new THREE.CylinderGeometry(0.015, 0.008, 0.4, 8);
      bodyGeom.rotateX(Math.PI / 2);
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      dfGroup.add(bodyMesh);

      const headGeom = new THREE.SphereGeometry(0.03, 8, 8);
      const headMesh = new THREE.Mesh(headGeom, bodyMat);
      headMesh.position.z = 0.22;
      dfGroup.add(headMesh);

      const wingGeom = new THREE.PlaneGeometry(0.35, 0.07);
      const wingFL = new THREE.Mesh(wingGeom, wingMat);
      const wingFR = new THREE.Mesh(wingGeom, wingMat);
      const wingBL = new THREE.Mesh(wingGeom, wingMat);
      const wingBR = new THREE.Mesh(wingGeom, wingMat);

      wingFL.position.set(-0.2, 0.02, 0.08);
      wingFR.position.set(0.2, 0.02, 0.08);
      wingBL.position.set(-0.18, 0.01, -0.04);
      wingBR.position.set(0.18, 0.01, -0.04);

      dfGroup.add(wingFL, wingFR, wingBL, wingBR);
      this.group.add(dfGroup);

      this.dragonflies.push({
        group: dfGroup,
        wingFL, wingFR, wingBL, wingBR,
        baseAngle: (i / count) * Math.PI * 2,
        speed: 0.7 + i * 0.3,
        hoverY: 1.6 + i * 0.8,
        radius: 2.8 + i * 1.5
      });
    }
  }

  update(delta, time) {
    this.dragonflies.forEach((df) => {
      const t = time * df.speed + df.baseAngle;
      const x = Math.cos(t) * df.radius + Math.sin(t * 2.3) * 0.6;
      const z = Math.sin(t * 0.9) * df.radius + Math.cos(t * 1.7) * 0.6;
      const y = df.hoverY + Math.sin(time * 3.0 + df.baseAngle) * 0.35;

      df.group.position.set(x, y, z);

      const nextT = t + 0.05;
      const nx = Math.cos(nextT) * df.radius + Math.sin(nextT * 2.3) * 0.6;
      const nz = Math.sin(nextT * 0.9) * df.radius + Math.cos(nextT * 1.7) * 0.6;
      df.group.rotation.y = Math.atan2(x - nx, z - nz);

      const flutter = Math.sin(time * 55) * 0.5;
      df.wingFL.rotation.z = flutter;
      df.wingFR.rotation.z = -flutter;
      df.wingBL.rotation.z = -flutter * 0.9;
      df.wingBR.rotation.z = flutter * 0.9;
    });
  }
}

// -------------------------------------------------------------
// 9. BREEZE PETALS (Floating Ambient Wind Petals in Landscape)
// -------------------------------------------------------------
class BreezePetalsSystem {
  constructor(count = 28) {
    this.group = new THREE.Group();
    this.petals = [];

    const geom = new THREE.PlaneGeometry(0.14, 0.22);
    geom.rotateX(Math.PI / 4);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffb3c6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      roughness: 0.35
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      const x = (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 16;
      const y = 0.2 + Math.random() * 4.5;

      mesh.position.set(x, y, z);
      this.group.add(mesh);

      this.petals.push({
        mesh,
        baseX: x,
        baseZ: z,
        driftSpeedX: 0.4 + Math.random() * 0.5,
        driftSpeedZ: -0.2 + Math.random() * 0.4,
        fallSpeed: 0.15 + Math.random() * 0.2,
        rotSpeed: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(delta, time) {
    this.petals.forEach((p) => {
      p.mesh.position.y -= p.fallSpeed * delta;
      p.mesh.position.x += (p.driftSpeedX + Math.sin(time + p.phase) * 0.3) * delta;
      p.mesh.position.z += (p.driftSpeedZ + Math.cos(time + p.phase) * 0.3) * delta;

      p.mesh.rotation.x += p.rotSpeed.x * delta;
      p.mesh.rotation.y += p.rotSpeed.y * delta;
      p.mesh.rotation.z += p.rotSpeed.z * delta;

      if (p.mesh.position.y <= 0.05 || p.mesh.position.x > 9 || p.mesh.position.x < -9) {
        p.mesh.position.y = 3.5 + Math.random() * 2.0;
        p.mesh.position.x = -8 + Math.random() * 4;
        p.mesh.position.z = (Math.random() - 0.5) * 14;
      }
    });
  }
}

// -------------------------------------------------------------
// 10. ANIMATED SKY & CELESTIAL PHENOMENA (Stars, Meteors, Moon)
// -------------------------------------------------------------
class DynamicSkySystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    const starCount = 350;
    const starGeom = new THREE.BufferGeometry();
    const starPos = [];
    const starColors = [];
    this.starTwinkle = [];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 40 + Math.random() * 10;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 5.0;
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPos.push(x, y, z);
      starColors.push(1.0, 1.0, 1.0);
      this.starTwinkle.push({
        freq: 1.5 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeom.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    this.starMaterial = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    this.starPoints = new THREE.Points(starGeom, this.starMaterial);
    this.group.add(this.starPoints);

    // Moon
    const moonGeom = new THREE.SphereGeometry(1.4, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfdf0d5
    });
    this.moon = new THREE.Mesh(moonGeom, moonMat);
    this.moon.position.set(-14, 22, -26);
    this.group.add(this.moon);

    // Moon Glow Aura
    const moonHaloGeom = new THREE.PlaneGeometry(7.5, 7.5);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0xa8dadc,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    });
    this.moonHalo = new THREE.Mesh(moonHaloGeom, moonHaloMat);
    this.moonHalo.position.copy(this.moon.position);
    this.moonHalo.lookAt(0, 0, 0);
    this.group.add(this.moonHalo);

    // Shooting Star (Meteor)
    const meteorGeom = new THREE.BufferGeometry();
    const meteorVerts = new Float32Array([0, 0, 0, -2.5, -1.2, -1.8]);
    meteorGeom.setAttribute('position', new THREE.BufferAttribute(meteorVerts, 3));
    this.meteorMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0
    });
    this.meteor = new THREE.Line(meteorGeom, this.meteorMat);
    this.meteorData = {
      active: false,
      timer: 2.0,
      start: new THREE.Vector3(),
      dir: new THREE.Vector3(-18, -9, -12),
      progress: 0
    };
    this.group.add(this.meteor);

    this.scene.add(this.group);
  }

  setMode(mode) {
    if (mode === 'night') {
      this.starPoints.visible = true;
      this.moon.visible = true;
      this.moonHalo.visible = true;
    } else {
      this.starPoints.visible = false;
      this.moon.visible = false;
      this.moonHalo.visible = false;
    }
  }

  update(delta, time) {
    if (!this.starPoints.visible) return;

    const colors = this.starPoints.geometry.attributes.color.array;
    for (let i = 0; i < this.starTwinkle.length; i++) {
      const sw = this.starTwinkle[i];
      const brightness = 0.4 + 0.6 * Math.sin(time * sw.freq + sw.phase);
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.98;
      colors[i * 3 + 2] = brightness;
    }
    this.starPoints.geometry.attributes.color.needsUpdate = true;

    if (!this.meteorData.active) {
      this.meteorData.timer -= delta;
      if (this.meteorData.timer <= 0) {
        this.meteorData.active = true;
        this.meteorData.progress = 0;
        this.meteorData.start.set(
          (Math.random() - 0.5) * 20 + 5,
          18 + Math.random() * 8,
          -15 - Math.random() * 15
        );
        this.meteor.position.copy(this.meteorData.start);
      }
    } else {
      this.meteorData.progress += delta * 2.2;
      this.meteor.position.addScaledVector(this.meteorData.dir, delta * 1.5);
      const alpha = Math.sin(this.meteorData.progress * Math.PI);
      this.meteorMat.opacity = Math.max(0, alpha * 0.9);

      if (this.meteorData.progress >= 1.0) {
        this.meteorData.active = false;
        this.meteorMat.opacity = 0;
        this.meteorData.timer = 5.0 + Math.random() * 6.0;
      }
    }
  }
}

// -------------------------------------------------------------
// 11. PARTICLE SYSTEMS (Fireflies & Glow Motes)
// -------------------------------------------------------------
class FireflySystem {
  constructor(count = 45) {
    this.group = new THREE.Group();
    this.fireflies = [];
    this.visible = false;

    const geom = new THREE.SphereGeometry(0.045, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ff66,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        0.3 + Math.random() * 3.8,
        (Math.random() - 0.5) * 16
      );
      mesh.position.copy(basePos);

      let light = null;
      if (i < 8) {
        light = new THREE.PointLight(0x88ff66, 0.65, 3.2);
        mesh.add(light);
      }

      this.group.add(mesh);
      this.fireflies.push({
        mesh,
        light,
        basePos,
        freq: 0.7 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        radius: 0.6 + Math.random() * 1.4
      });
    }

    this.group.visible = false;
  }

  setVisible(val) {
    this.visible = val;
    this.group.visible = val;
  }

  update(time) {
    if (!this.visible) return;
    this.fireflies.forEach((f) => {
      const t = time * f.freq + f.phase;
      f.mesh.position.x = f.basePos.x + Math.sin(t) * f.radius;
      f.mesh.position.y = f.basePos.y + Math.cos(t * 0.75) * (f.radius * 0.45);
      f.mesh.position.z = f.basePos.z + Math.cos(t) * f.radius;

      const pulse = 0.3 + 0.7 * Math.pow(Math.sin(t * 2.2), 4);
      f.mesh.material.opacity = pulse;
      if (f.light) {
        f.light.intensity = 0.75 * pulse;
      }
    });
  }
}

class GlowSystem {
  constructor(count = 140) {
    this.group = new THREE.Group();
    this.particles = [];
    this.visible = false;

    const geom = new THREE.SphereGeometry(0.038, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffb6c1,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      const x = (Math.random() - 0.5) * 8.5;
      const z = (Math.random() - 0.5) * 8.5;
      const y = Math.random() * 5.0;
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0.6 + Math.random() * 1.2);

      this.group.add(mesh);
      this.particles.push({
        mesh,
        baseX: x,
        baseZ: z,
        speedY: 0.4 + Math.random() * 0.6,
        freq: 1.0 + Math.random() * 2.0,
        amp: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.group.visible = false;
  }

  setVisible(val) {
    this.visible = val;
    this.group.visible = val;
  }

  update(delta, time) {
    if (!this.visible) return;
    this.particles.forEach((p) => {
      p.mesh.position.y += p.speedY * delta;
      const t = time * p.freq + p.phase;
      p.mesh.position.x = p.baseX + Math.sin(t) * p.amp;
      p.mesh.position.z = p.baseZ + Math.cos(t) * p.amp;

      const relY = p.mesh.position.y / 5.0;
      let alpha = 0.85;
      if (relY < 0.15) alpha = relY / 0.15;
      else if (relY > 0.85) alpha = (1 - relY) / 0.15;

      p.mesh.material.opacity = Math.max(0, alpha * 0.85);

      if (p.mesh.position.y > 5.0) {
        p.mesh.position.y = 0.1;
        p.baseX = (Math.random() - 0.5) * 8.5;
        p.baseZ = (Math.random() - 0.5) * 8.5;
      }
    });
  }
}

// -------------------------------------------------------------
// 12. ENVIRONMENT & ATMOSPHERE MANAGER
// -------------------------------------------------------------
class EnvironmentManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.currentMode = 'sunset';

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.dirLight.position.set(6, 12, 8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.bias = -0.0002;
    this.scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0xffd5bb, 0x1f382a, 1.2);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.flowerGlowLight = new THREE.PointLight(0xff88aa, 1.8, 12);
    this.flowerGlowLight.position.set(0, 2.6, 0.8);
    this.scene.add(this.flowerGlowLight);

    this.scene.fog = new THREE.FogExp2(0x1a0f24, 0.02);

    this.setMode('sunset', true);
  }

  setMode(mode, immediate = false) {
    this.currentMode = mode;
    const configs = {
      day: {
        bg: new THREE.Color(0x8ecae6),
        fog: new THREE.Color(0xa7d8f0),
        dirColor: new THREE.Color(0xfffdf2),
        dirIntensity: 2.3,
        dirPos: new THREE.Vector3(7, 14, 8),
        hemiSky: new THREE.Color(0xe0f2fe),
        hemiGround: new THREE.Color(0x2d5a27),
        ambient: 0.65,
        glowColor: new THREE.Color(0xffb6c1),
        glowIntensity: 1.2
      },
      sunset: {
        bg: new THREE.Color(0x28122c),
        fog: new THREE.Color(0x351733),
        dirColor: new THREE.Color(0xff8c42),
        dirIntensity: 2.6,
        dirPos: new THREE.Vector3(9, 6, 9),
        hemiSky: new THREE.Color(0xffb088),
        hemiGround: new THREE.Color(0x26142c),
        ambient: 0.45,
        glowColor: new THREE.Color(0xff69b4),
        glowIntensity: 1.8
      },
      night: {
        bg: new THREE.Color(0x040612),
        fog: new THREE.Color(0x060919),
        dirColor: new THREE.Color(0x8ec5fc),
        dirIntensity: 0.85,
        dirPos: new THREE.Vector3(-6, 11, -7),
        hemiSky: new THREE.Color(0x1a2b4c),
        hemiGround: new THREE.Color(0x040810),
        ambient: 0.28,
        glowColor: new THREE.Color(0xff77aa),
        glowIntensity: 2.4
      }
    };

    const cfg = configs[mode] || configs.sunset;
    this.targetConfig = cfg;

    if (immediate) {
      this.scene.background = cfg.bg.clone();
      this.scene.fog.color.copy(cfg.fog);
      this.dirLight.color.copy(cfg.dirColor);
      this.dirLight.intensity = cfg.dirIntensity;
      this.dirLight.position.copy(cfg.dirPos);
      this.hemiLight.color.copy(cfg.hemiSky);
      this.hemiLight.groundColor.copy(cfg.hemiGround);
      this.ambientLight.intensity = cfg.ambient;
      this.flowerGlowLight.color.copy(cfg.glowColor);
      this.flowerGlowLight.intensity = cfg.glowIntensity;
    }
  }

  update(delta) {
    if (!this.targetConfig) return;
    const cfg = this.targetConfig;
    const lerpSpeed = 3.0 * delta;

    this.scene.background.lerp(cfg.bg, lerpSpeed);
    this.scene.fog.color.lerp(cfg.fog, lerpSpeed);
    this.dirLight.color.lerp(cfg.dirColor, lerpSpeed);
    this.dirLight.intensity += (cfg.dirIntensity - this.dirLight.intensity) * lerpSpeed;
    this.dirLight.position.lerp(cfg.dirPos, lerpSpeed);

    this.hemiLight.color.lerp(cfg.hemiSky, lerpSpeed);
    this.hemiLight.groundColor.lerp(cfg.hemiGround, lerpSpeed);
    this.ambientLight.intensity += (cfg.ambient - this.ambientLight.intensity) * lerpSpeed;

    this.flowerGlowLight.color.lerp(cfg.glowColor, lerpSpeed);
    this.flowerGlowLight.intensity += (cfg.glowIntensity - this.flowerGlowLight.intensity) * lerpSpeed;
  }
}

// -------------------------------------------------------------
// 13. MAIN LOTUS GARDEN REACT COMPONENT
// -------------------------------------------------------------
export default function LotusGarden() {
  const canvasContainerRef = useRef(null);
  const soundEngineRef = useRef(null);
  const sceneControllerRef = useRef(null);

  // UI state
  const [scenePreset, setScenePreset] = useState('solo');
  const [timeMode, setTimeMode] = useState('sunset');
  const [bloomLevel, setBloomLevel] = useState(1.0);
  const [isAutoBloom, setIsAutoBloom] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [isGlowEnabled, setIsGlowEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  // Initialize SoundEngine on mount
  useEffect(() => {
    soundEngineRef.current = new SoundEngine();
    return () => {
      if (soundEngineRef.current) {
        soundEngineRef.current.dispose();
      }
    };
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const sound = soundEngineRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x28122c);

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    function updateCameraProjection() {
      const aspect = window.innerWidth / window.innerHeight;
      camera.aspect = aspect;
      if (aspect < 1.0) {
        // Mobile portrait: dynamically widen FOV so horizontal flowers aren't cut off
        camera.fov = THREE.MathUtils.clamp(42 / Math.max(0.52, aspect * 1.15), 44, 68);
      } else {
        camera.fov = 42;
      }
      camera.updateProjectionMatrix();
    }
    updateCameraProjection();
    camera.position.set(0, 3.2, 5.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 25.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.target.set(0, 1.8, 0);
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    const textures = {
      petal: createLotusPetalTexture(),
      ...createLotusSeedPodTextures(),
      pad: createLotusPadTexture()
    };

    const envManager = new EnvironmentManager(scene, renderer);
    const skySystem = new DynamicSkySystem(scene);
    const waterSurface = new WaterSurface(35);
    scene.add(waterSurface.mesh);

    const koiSchool = new KoiFishSchool(4);
    scene.add(koiSchool.group);

    const dragonflySystem = new DragonflySystem(2);
    scene.add(dragonflySystem.group);

    const breezePetals = new BreezePetalsSystem(26);
    scene.add(breezePetals.group);

    const fireflies = new FireflySystem(45);
    scene.add(fireflies.group);

    const glowMotes = new GlowSystem(140);
    scene.add(glowMotes.group);

    const flowersGroup = new THREE.Group();
    scene.add(flowersGroup);
    let currentFlowers = [];
    let currentPads = [];

    let targetCameraPos = camera.position.clone();
    let targetCameraLook = controls.target.clone();

    // -------------------------------------------------------------
    // SCENE PRESETS (WIDE SEPARATION FOR MULTIPLE FLOWERS)
    // -------------------------------------------------------------
    function clearCurrentScene() {
      while (flowersGroup.children.length > 0) {
        flowersGroup.remove(flowersGroup.children[0]);
      }
      currentFlowers = [];
      currentPads = [];
    }

    function setupScene(preset) {
      clearCurrentScene();
      const isPortrait = window.innerWidth < window.innerHeight;

      if (preset === 'solo') {
        const flower = new LotusFlower(textures, sound, {
          height: 2.6,
          stemBend: { x: 0.12, z: -0.08 }
        });
        flowersGroup.add(flower.group);
        currentFlowers.push(flower);

        const pad1 = new LotusPad(textures.pad, 2.1, -1.6, 0.8);
        const pad2 = new LotusPad(textures.pad, 1.7, 1.8, -0.6);
        const pad3 = new LotusPad(textures.pad, 1.5, -0.6, -1.6);
        flowersGroup.add(pad1.group, pad2.group, pad3.group);
        currentPads.push(pad1, pad2, pad3);

        targetCameraLook.set(0, 1.8, 0);
        if (isPortrait) {
          targetCameraPos.set(0, 3.8, 7.2);
        } else {
          targetCameraPos.set(0, 3.2, 5.8);
        }
      } else if (preset === 'trio') {
        // Generous spatial separation so petals NEVER touch!
        const f1 = new LotusFlower(textures, sound, {
          height: 2.7,
          stemBend: { x: -0.22, z: 0.12 }
        });
        f1.group.position.set(-2.5, 0, -0.5);
        f1.setBloom(1.0);

        const f2 = new LotusFlower(textures, sound, {
          height: 2.9,
          stemBend: { x: 0.2, z: -0.15 }
        });
        f2.group.position.set(2.6, 0, 0.3);
        f2.setBloom(0.88);

        const f3 = new LotusFlower(textures, sound, {
          height: 2.25,
          stemBend: { x: 0.15, z: 0.2 }
        });
        f3.group.position.set(0.1, 0, 2.4);
        f3.setBloom(0.52);

        flowersGroup.add(f1.group, f2.group, f3.group);
        currentFlowers.push(f1, f2, f3);

        const padCoords = [
          [-1.3, 0.9, 1.9],
          [-3.6, -0.4, 2.2],
          [1.3, -0.8, 1.9],
          [3.6, 0.8, 1.8],
          [-0.3, 3.1, 1.5],
          [0.4, -2.1, 1.7]
        ];
        padCoords.forEach(([x, z, r]) => {
          const pad = new LotusPad(textures.pad, r, x, z);
          flowersGroup.add(pad.group);
          currentPads.push(pad);
        });

        targetCameraLook.set(0, 1.7, 0.5);
        if (isPortrait) {
          targetCameraPos.set(0, 5.2, 10.8);
        } else {
          targetCameraPos.set(0, 4.2, 8.2);
        }
      } else if (preset === 'pond') {
        // Expansive sanctuary with 6 well-spaced flowers across the pond
        const positions = [
          { x: 0, z: 0.1, h: 2.75, bloom: 1.0, bend: { x: 0.08, z: 0.06 } },
          { x: -3.8, z: -1.4, h: 2.45, bloom: 0.85, bend: { x: -0.2, z: 0.12 } },
          { x: 3.7, z: 0.8, h: 2.65, bloom: 0.92, bend: { x: 0.18, z: -0.14 } },
          { x: -2.6, z: 3.3, h: 2.15, bloom: 0.6, bend: { x: -0.12, z: -0.18 } },
          { x: 2.3, z: -3.5, h: 2.85, bloom: 0.45, bend: { x: 0.16, z: 0.2 } },
          { x: -2.0, z: -3.8, h: 2.3, bloom: 0.75, bend: { x: -0.15, z: -0.15 } }
        ];

        positions.forEach((p) => {
          const fl = new LotusFlower(textures, sound, { height: p.h, stemBend: p.bend });
          fl.group.position.set(p.x, 0, p.z);
          fl.setBloom(p.bloom);
          flowersGroup.add(fl.group);
          currentFlowers.push(fl);
        });

        const pondPads = [
          [-0.6, 0.5, 2.2],
          [-4.3, -0.8, 2.0],
          [4.2, 1.2, 1.9],
          [-1.8, 2.4, 1.8],
          [1.5, -2.6, 1.7],
          [0.3, -1.6, 1.6],
          [3.2, -1.2, 1.5],
          [-3.0, -2.8, 1.6],
          [2.6, 2.8, 1.7],
          [-0.4, 4.0, 1.5]
        ];
        pondPads.forEach(([x, z, r]) => {
          const pad = new LotusPad(textures.pad, r, x, z);
          flowersGroup.add(pad.group);
          currentPads.push(pad);
        });

        targetCameraLook.set(0, 1.5, 0);
        if (isPortrait) {
          targetCameraPos.set(0, 7.8, 15.6);
        } else {
          targetCameraPos.set(0, 6.2, 11.8);
        }
      }
    }

    setupScene(scenePreset);

    // Raycaster for petal & water clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const maxTapDist = isTouchDevice ? 15 : 6;
      if (moved > maxTapDist) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const petalMeshes = [];
      currentFlowers.forEach((flower) => {
        flower.petals.forEach((p) => {
          if (!p.isPlucked) petalMeshes.push(p.mesh);
        });
      });

      const petalHits = raycaster.intersectObjects(petalMeshes);
      if (petalHits.length > 0) {
        const hitData = petalHits[0].object.userData;
        if (hitData && hitData.isPetal) {
          hitData.flower.pluckPetal(hitData.data, scene);
          return;
        }
      }

      const waterHits = raycaster.intersectObject(waterSurface.mesh);
      if (waterHits.length > 0) {
        const pt = waterHits[0].point;
        waterSurface.addRipple(pt.x, pt.z, 0.75);
        if (sound) sound.playWaterDrop();
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    // Audio unlock on touch for iOS/Android
    const unlockAudio = () => {
      if (sound) sound.init();
    };
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();
    let autoBloomTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      camera.position.lerp(targetCameraPos, 2.5 * delta);
      controls.target.lerp(targetCameraLook, 2.5 * delta);

      // Auto-bloom or manual bloom
      if (sceneControllerRef.current?.isAutoBloom) {
        autoBloomTime += delta * 0.75;
        const progress = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(autoBloomTime));
        setBloomLevel(progress);
        currentFlowers.forEach((fl) => fl.setBloom(progress));
      } else {
        const curBloom = sceneControllerRef.current?.bloomLevel ?? 1.0;
        currentFlowers.forEach((fl) => fl.setBloom(curBloom));
      }

      currentFlowers.forEach((flower) => {
        flower.update(delta, time, waterSurface);
      });

      currentPads.forEach((pad) => {
        pad.update(time);
      });

      waterSurface.update(delta, time);
      koiSchool.update(delta, time, waterSurface);
      dragonflySystem.update(delta, time);
      breezePetals.update(delta, time);
      skySystem.update(delta, time);
      fireflies.update(time);
      glowMotes.update(delta, time);
      envManager.update(delta);
      controls.update();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      updateCameraProjection();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 120);
    });

    // Controller handle
    sceneControllerRef.current = {
      setupScene,
      pluckRandomPetal: () => {
        if (currentFlowers.length > 0) {
          const flower = currentFlowers[Math.floor(Math.random() * currentFlowers.length)];
          flower.pluckRandomPetal(scene);
        }
      },
      resetAllPetals: () => {
        currentFlowers.forEach((fl) => fl.resetAllPetals(scene));
      },
      setTimeMode: (mode) => {
        envManager.setMode(mode);
        skySystem.setMode(mode);
        fireflies.setVisible(mode === 'night');
      },
      setGlow: (val) => {
        glowMotes.setVisible(val);
      },
      captureSnapshot: () => {
        try {
          renderer.render(scene, camera);
          const dataURL = renderer.domElement.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `flor-de-loto-${Date.now()}.png`;
          link.href = dataURL;
          link.click();
        } catch (e) {
          console.error('Snapshot failed:', e);
        }
      },
      bloomLevel: 1.0,
      isAutoBloom: false
    };

    sceneControllerRef.current.setTimeMode(timeMode);
    sceneControllerRef.current.setGlow(isGlowEnabled);

    setTimeout(() => {
      setIsLoading(false);
    }, 450);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync state with scene controller
  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setupScene(scenePreset);
    }
  }, [scenePreset]);

  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setTimeMode(timeMode);
    }
  }, [timeMode]);

  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setGlow(isGlowEnabled);
    }
  }, [isGlowEnabled]);

  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.bloomLevel = bloomLevel;
      sceneControllerRef.current.isAutoBloom = isAutoBloom;
    }
  }, [bloomLevel, isAutoBloom]);

  // Handlers
  const handleToggleMusic = () => {
    if (!soundEngineRef.current) return;
    const playing = soundEngineRef.current.toggleMusic();
    setIsMusicPlaying(playing);
  };

  const handleToggleAmbient = () => {
    if (!soundEngineRef.current) return;
    const playing = soundEngineRef.current.toggleAmbient();
    setIsAmbientPlaying(playing);
  };

  const handleToggleGlow = () => {
    setIsGlowEnabled((prev) => !prev);
  };

  const handleSnapshot = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
    if (sceneControllerRef.current) {
      sceneControllerRef.current.captureSnapshot();
    }
  };

  const handlePluck = () => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.pluckRandomPetal();
    }
  };

  const handleReset = () => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.resetAllPetals();
      setBloomLevel(1.0);
      setIsAutoBloom(false);
    }
  };

  const handleToggleAutoBloom = () => {
    setIsAutoBloom((prev) => !prev);
  };

  const handleSliderBloom = (e) => {
    const val = parseFloat(e.target.value);
    setBloomLevel(val);
    setIsAutoBloom(false);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading Overlay */}
      <div id="loading-overlay" className={isLoading ? '' : 'fade-out'}>
        <svg
          className="lotus-spinner"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2.5c-2.8 4.2-4.5 9-4.5 13a4.5 4.5 0 0 0 9 0c0-4-1.7-8.8-4.5-13Z" />
          <path d="M6.5 7.5c-2.8 3.5-4 7.2-4 9.5a4.5 4.5 0 0 0 7.8 3.1c-1.5-2.6-2.6-6.5-3.8-12.6Z" />
          <path d="M17.5 7.5c2.8 3.5 4 7.2 4 9.5a4.5 4.5 0 0 1-7.8 3.1c1.5-2.6 2.6-6.5 3.8-12.6Z" />
          <path d="M12 16.5v5.5" />
        </svg>
      </div>

      {/* Snapshot Flash Overlay */}
      <div id="flash-overlay" className={isFlashing ? 'flashing' : ''} />

      {/* 3D Canvas Viewport */}
      <div id="canvas-container" ref={canvasContainerRef} />

      {/* UI Controls Layer */}
      <div className="ui-layer">
        {/* Top Floating Toolbar */}
        <header className="top-bar">
          {/* Audio Controls */}
          <div className="top-group glass-panel">
            <button
              id="btn-music"
              className={`btn icon-btn ${isMusicPlaying ? 'active music-playing' : ''}`}
              onClick={handleToggleMusic}
              aria-label="Music"
              title="Música zen / Wonderwall"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </button>

            <button
              id="btn-ambient"
              className={`btn icon-btn ${isAmbientPlaying ? 'active' : ''}`}
              onClick={handleToggleAmbient}
              aria-label="Ambient Sound"
              title="Sonido ambiental del viento y agua"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
          </div>

          {/* Glow & Camera Snapshot */}
          <div className="top-group glass-panel">
            <button
              id="btn-glow"
              className={`btn icon-btn ${isGlowEnabled ? 'active-gold' : ''}`}
              onClick={handleToggleGlow}
              aria-label="Glow"
              title="Aura luminosa y motas mágicas"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" />
                <path d="M19 17v4" />
                <path d="M3 5h4" />
                <path d="M17 19h4" />
              </svg>
            </button>

            <button
              id="btn-camera"
              className="btn icon-btn"
              onClick={handleSnapshot}
              aria-label="Snapshot"
              title="Captura de pantalla HD"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </button>
          </div>
        </header>

        {/* Side Actions (Pluck, Restore, Auto-bloom) */}
        <aside className="side-actions glass-panel">
          <button
            id="btn-pluck"
            className="btn icon-btn"
            onClick={handlePluck}
            aria-label="Pluck Petal"
            title="Desprender pétalo al estanque"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8 6 5 11 5 15a7 7 0 0 0 14 0c0-4-3-9-7-13Z" />
              <path d="M12 9v7" />
            </svg>
          </button>

          <button
            id="btn-reset"
            className="btn icon-btn"
            onClick={handleReset}
            aria-label="Restore"
            title="Restaurar todos los pétalos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15.54-6.36L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.54 6.36L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>

          <button
            id="btn-autobloom"
            className={`btn icon-btn ${isAutoBloom ? 'active' : ''}`}
            onClick={handleToggleAutoBloom}
            aria-label="Auto Bloom"
            title="Animación de floración continua"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2a4 4 0 0 0-4 4c0 3 4 5 4 5s4-2 4-5a4 4 0 0 0-4-4Z" />
              <path d="M12 22a4 4 0 0 0 4-4c0-3-4-5-4-5s-4 2-4 5a4 4 0 0 0 4 4Z" />
              <path d="M2 12a4 4 0 0 0 4 4c3 0 5-4 5-4s-2-4-5-4a4 4 0 0 0-4 4Z" />
              <path d="M22 12a4 4 0 0 0-4-4c-3 0-5 4-5 4s2 4 5 4a4 4 0 0 0 4-4Z" />
            </svg>
          </button>
        </aside>

        {/* Bottom Navigation Dock */}
        <footer className="bottom-bar">
          <nav className="bottom-dock glass-panel">
            {/* Presets: Solo, Trio, Pond */}
            <button
              id="btn-scene-solo"
              className={`btn icon-btn ${scenePreset === 'solo' ? 'active' : ''}`}
              onClick={() => setScenePreset('solo')}
              aria-label="Single Lotus"
              title="Flor de loto individual"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5C9.2 7.5 7.5 12 7.5 15.5a4.5 4.5 0 0 0 9 0c0-3.5-1.7-8-4.5-12Z" />
                <path d="M12 16v6" />
                <path d="M8 22h8" />
              </svg>
            </button>

            <button
              id="btn-scene-trio"
              className={`btn icon-btn ${scenePreset === 'trio' ? 'active' : ''}`}
              onClick={() => setScenePreset('trio')}
              aria-label="Trio Arrangement"
              title="Trío de flores separadas armónicamente"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c-1.8 2.8-3 6.5-3 9a3 3 0 0 0 6 0c0-2.5-1.2-6.2-3-9Z" />
                <path d="M6 7c-1.2 2-2 4.5-2 6.5a2.2 2.2 0 0 0 4.4 0C8.4 11.5 7.6 9 6 7Z" />
                <path d="M18 7c-1.2 2-2 4.5-2 6.5a2.2 2.2 0 0 0 4.4 0C20.4 11.5 19.6 9 18 7Z" />
                <path d="M12 15v7" />
              </svg>
            </button>

            <button
              id="btn-scene-pond"
              className={`btn icon-btn ${scenePreset === 'pond' ? 'active' : ''}`}
              onClick={() => setScenePreset('pond')}
              aria-label="Lotus Pond"
              title="Estanque santuario espacioso con peces koi"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3c-1.8 2.8-3 6-3 8.5a3 3 0 0 0 6 0c0-2.5-1.2-5.7-3-8.5Z" />
                <path d="M2 17c3-1 6 1 10 0s7-1 10 0" />
                <path d="M2 21c3-1 6 1 10 0s7-1 10 0" />
              </svg>
            </button>

            <div className="dock-divider" />

            {/* Atmosphere: Day, Sunset, Night */}
            <button
              id="btn-time-day"
              className={`btn icon-btn ${timeMode === 'day' ? 'active-cyan' : ''}`}
              onClick={() => setTimeMode('day')}
              aria-label="Day"
              title="Modo Día cristalino"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            </button>

            <button
              id="btn-time-sunset"
              className={`btn icon-btn ${timeMode === 'sunset' ? 'active-gold' : ''}`}
              onClick={() => setTimeMode('sunset')}
              aria-label="Sunset"
              title="Modo Atardecer dorado"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 10V2" />
                <path d="m4.93 10.93 1.41-1.41" />
                <path d="M2 16h20" />
                <path d="M4 20h16" />
                <path d="m19.07 10.93-1.41-1.41" />
                <path d="M16 16a4 4 0 0 0-8 0" />
              </svg>
            </button>

            <button
              id="btn-time-night"
              className={`btn icon-btn ${timeMode === 'night' ? 'active' : ''}`}
              onClick={() => setTimeMode('night')}
              aria-label="Night"
              title="Modo Noche estrellada con luna y luciérnagas"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                <path d="M19 3v4" />
                <path d="M21 5h-4" />
              </svg>
            </button>

            <div className="dock-divider" />

            {/* Bloom Slider */}
            <div className="slider-container">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3C9.5 6.5 8.5 12 8.5 15.5a3.5 3.5 0 0 0 7 0c0-3.5-1-9-3.5-12.5Z" />
                <path d="M12 16v6" />
              </svg>

              <input
                id="slider-bloom"
                type="range"
                min="0.05"
                max="1.0"
                step="0.01"
                value={bloomLevel}
                onChange={handleSliderBloom}
                aria-label="Bloom Slider"
                title="Desliza para abrir o cerrar los pétalos"
              />

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2.5" />
                <path d="M12 2a3.5 3.5 0 0 0-3.5 3.5c0 2.5 3.5 4.5 3.5 4.5s3.5-2 3.5-4.5A3.5 3.5 0 0 0 12 2Z" />
                <path d="M12 22a3.5 3.5 0 0 0 3.5-3.5c0-2.5-3.5-4.5-3.5-4.5s-3.5 2-3.5 4.5A3.5 3.5 0 0 0 12 22Z" />
                <path d="M2 12a3.5 3.5 0 0 0 3.5 3.5c2.5 0 4.5-3.5 4.5-3.5s-2-3.5-4.5-3.5A3.5 3.5 0 0 0 2 12Z" />
                <path d="M22 12a3.5 3.5 0 0 0-3.5-3.5c-2.5 0-4.5 3.5-4.5 3.5s2 3.5 4.5 3.5A3.5 3.5 0 0 0 22 12Z" />
              </svg>
            </div>
          </nav>
        </footer>
      </div>
    </div>
  );
}
