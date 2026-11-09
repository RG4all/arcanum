// Three.js presentation layer: deterministic scene construction, reusable helpers and explicit disposal.
const GameEngine3D = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    tableMesh: null,
    avatarMeshes: [],
    decorations: [],
    particles: null,
    clock: null,
    reducedMotion: false,
    lowPowerDevice: false,
    resizeObserver: null,
    rafId: null,
    environment: 'temple',

    init() {
        this.container = document.getElementById('canvas-container');
        if (!this.container || typeof THREE === 'undefined') return;
        try {
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(37, 1, 0.1, 120);
            this.camera.position.set(0, 15.5, 20.5);
            this.camera.lookAt(0, 0.7, 0);
            this.clock = new THREE.Clock();
            this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const lowPowerDevice = window.innerWidth < 720 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
            this.lowPowerDevice = Boolean(lowPowerDevice);
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 1.75));
            this.renderer.shadowMap.enabled = !lowPowerDevice;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.16;
            this.renderer.domElement.setAttribute('aria-label', 'Dreidimensionale Ritual-Arena mit Spieltisch und Avataren');
            this.container.replaceChildren(this.renderer.domElement);
            this.addLighting();
            this.buildEnvironment('temple');
            this.resize();
            if ('ResizeObserver' in window) {
                this.resizeObserver = new ResizeObserver(() => this.resize());
                this.resizeObserver.observe(this.container);
            } else {
                window.addEventListener('resize', () => this.resize(), { passive: true });
            }
            this.animate();
        } catch (error) {
            console.warn('3D-Ansicht konnte nicht initialisiert werden:', error);
            this.container.textContent = '3D-Ansicht nicht verfügbar; das Kartenspiel bleibt spielbar.';
        }
    },

    resize() {
        if (!this.renderer || !this.camera || !this.container) return;
        const width = Math.max(1, this.container.clientWidth);
        const height = Math.max(1, this.container.clientHeight);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    },

    addLighting() {
        this.scene.add(new THREE.HemisphereLight(0xc5bbff, 0x19101c, 1.4));
        const key = new THREE.DirectionalLight(0xffe4af, 2.5);
        key.position.set(-7, 13, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -15;
        key.shadow.camera.right = 15;
        key.shadow.camera.top = 15;
        key.shadow.camera.bottom = -15;
        key.shadow.bias = -0.0004;
        this.scene.add(key);
        const moon = new THREE.DirectionalLight(0x7d8dff, 2.1);
        moon.position.set(7, 8, -9);
        this.scene.add(moon);
        const altarGlow = new THREE.PointLight(0xffbd67, 33, 18, 2);
        altarGlow.position.set(0, 2.8, 0);
        this.scene.add(altarGlow);
    },

    material(color, options = {}) {
        return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12, ...options });
    },

    addMesh(geometry, material, position, parent = this.scene, castShadow = true) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    },

    buildEnvironment(type = 'temple') {
        if (!this.scene) return;
        this.environment = type;
        this.clearEnvironment();
        const palette = {
            temple: { background: 0x090714, floor: 0x100c1c, table: 0x24152d, inlay: 0xd6b36d, accent: 0xb987f6, haze: 0x302044 },
            druid: { background: 0x07120f, floor: 0x0d1d17, table: 0x173126, inlay: 0xb6c77c, accent: 0x69d6a0, haze: 0x163b2c },
            mountain: { background: 0x07101c, floor: 0x101a28, table: 0x1d293a, inlay: 0x9dd9e8, accent: 0x78bfff, haze: 0x19344b }
        }[type] || null;
        const p = palette || { background: 0x090714, floor: 0x100c1c, table: 0x24152d, inlay: 0xd6b36d, accent: 0xb987f6, haze: 0x302044 };
        this.scene.background = new THREE.Color(p.background);
        this.scene.fog = new THREE.FogExp2(p.haze, 0.009);

        const floor = this.addMesh(new THREE.CircleGeometry(42, 96), this.material(p.floor, { roughness: 1 }), [0, -1.25, 0], this.scene, false);
        floor.rotation.x = -Math.PI / 2;
        this.decorations.push(floor);
        const floorRingMat = this.material(p.inlay, { metalness: 0.84, roughness: 0.24, transparent: true, opacity: 0.4 });
        [12.4, 15.2, 20.5].forEach((radius, idx) => {
            const ring = this.addMesh(new THREE.TorusGeometry(radius, idx === 0 ? 0.035 : 0.022, 8, 128), floorRingMat.clone(), [0, -1.18 + idx * 0.002, 0], this.scene, false);
            ring.rotation.x = Math.PI / 2;
            this.decorations.push(ring);
        });

        this.buildAltar(p);
        this.buildArchitecture(p);
        this.buildArcaneDetails(p);
        this.buildStardust(p);
        this.spawnHumanoidAvatars(GameEngine.numPlayers || 3);
    },

    clearEnvironment() {
        if (this.tableMesh) {
            this.disposeObject(this.tableMesh);
            this.tableMesh = null;
        }
        this.decorations.forEach(object => this.disposeObject(object));
        this.avatarMeshes.forEach(object => this.disposeObject(object));
        this.decorations = [];
        this.avatarMeshes = [];
        this.particles = null;
    },

    buildAltar(p) {
        const stone = this.material(p.table, { metalness: 0.42, roughness: 0.34 });
        const obsidian = this.material(0x100d1c, { metalness: 0.54, roughness: 0.25 });
        const gold = this.material(p.inlay, { metalness: 0.92, roughness: 0.18, emissive: p.inlay, emissiveIntensity: 0.075 });
        const stand = this.addMesh(new THREE.CylinderGeometry(5.65, 6.2, 0.62, 96), stone, [0, -0.45, 0]);
        this.tableMesh = new THREE.Group();
        this.tableMesh.add(stand);
        const lip = this.addMesh(new THREE.TorusGeometry(5.64, 0.11, 12, 128), gold, [0, -0.11, 0], this.tableMesh);
        lip.rotation.x = Math.PI / 2;
        const top = this.addMesh(new THREE.CylinderGeometry(5.42, 5.55, 0.16, 96), obsidian, [0, -0.06, 0], this.tableMesh);
        top.receiveShadow = true;
        [5.18, 4.93, 1.78, 1.58].forEach((radius, index) => {
            const ring = this.addMesh(new THREE.TorusGeometry(radius, index < 2 ? 0.035 : 0.025, 8, 128), gold.clone(), [0, 0.035 + index * 0.004, 0], this.tableMesh, false);
            ring.rotation.x = Math.PI / 2;
        });
        const medallion = this.addMesh(new THREE.CircleGeometry(1.5, 64), this.material(p.table, { metalness: 0.4, roughness: 0.35 }), [0, 0.03, 0], this.tableMesh, false);
        medallion.rotation.x = -Math.PI / 2;
        const centerGem = this.addMesh(new THREE.OctahedronGeometry(0.28, 1), this.material(p.accent, { metalness: 0.45, roughness: 0.19, emissive: p.accent, emissiveIntensity: 0.9 }), [0, 0.38, 0], this.tableMesh, false);
        centerGem.name = 'altar-heart';
        for (let i = 0; i < 24; i++) {
            const angle = i * Math.PI * 2 / 24;
            const inner = i % 2 === 0 ? 4.52 : 4.62;
            const outer = i % 2 === 0 ? 4.8 : 4.72;
            const points = [new THREE.Vector3(Math.cos(angle) * inner, 0.045, Math.sin(angle) * inner), new THREE.Vector3(Math.cos(angle) * outer, 0.045, Math.sin(angle) * outer)];
            const glyph = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: p.inlay, transparent: true, opacity: 0.65 }));
            this.tableMesh.add(glyph);
        }
        this.tableMesh.traverse(part => { if (part.isMesh && part !== stand) part.castShadow = true; });
        this.scene.add(this.tableMesh);
    },

    buildArchitecture(p) {
        const stone = this.material(p.table, { roughness: 0.88, metalness: 0.12 });
        const trim = this.material(p.inlay, { metalness: 0.78, roughness: 0.25 });
        const pillarCount = 8;
        for (let i = 0; i < pillarCount; i++) {
            const angle = i * Math.PI * 2 / pillarCount + Math.PI / 8;
            const x = Math.cos(angle) * 13.8;
            const z = Math.sin(angle) * 13.8;
            const pillar = new THREE.Group();
            this.addMesh(new THREE.CylinderGeometry(0.48, 0.65, 8.8, 12), stone.clone(), [0, 3.2, 0], pillar);
            this.addMesh(new THREE.CylinderGeometry(0.78, 0.66, 0.36, 12), trim.clone(), [0, -1.35, 0], pillar);
            this.addMesh(new THREE.CylinderGeometry(0.72, 0.72, 0.22, 12), stone.clone(), [0, 7.65, 0], pillar);
            this.addMesh(new THREE.CylinderGeometry(0.78, 0.55, 0.32, 12), trim.clone(), [0, 7.92, 0], pillar);
            pillar.position.set(x, -1, z);
            pillar.rotation.y = -angle;
            this.scene.add(pillar);
            this.decorations.push(pillar);
            const lamp = new THREE.Group();
            const flame = this.addMesh(new THREE.OctahedronGeometry(0.24, 1), this.material(p.accent, { emissive: p.accent, emissiveIntensity: 1.7, metalness: 0.15, roughness: 0.2 }), [0, 0, 0], lamp, false);
            flame.scale.set(0.8, 1.8, 0.8);
            lamp.position.set(x * 0.97, 5.35, z * 0.97);
            this.scene.add(lamp);
            const glow = new THREE.PointLight(p.accent, 17, 9, 2);
            glow.position.copy(lamp.position);
            this.scene.add(glow);
            this.decorations.push(lamp, glow);
        }

        // Monumental stone arches give the arena a clear silhouette from the table camera.
        [-1, 1].forEach(side => {
            const arch = this.addMesh(new THREE.TorusGeometry(8.9, 0.34, 12, 96, Math.PI), this.material(p.table, { roughness: 0.62 }), [side * 10.7, 3.75, -9.5], this.scene);
            arch.rotation.z = Math.PI;
            arch.rotation.y = side * 0.13;
            this.decorations.push(arch);
            const crown = this.addMesh(new THREE.OctahedronGeometry(0.55, 1), this.material(p.inlay, { emissive: p.inlay, emissiveIntensity: 0.35, metalness: 0.78 }), [side * 10.7, 12.5, -9.5], this.scene);
            this.decorations.push(crown);
        });
    },

    buildArcaneDetails(p) {
        const crystalMaterial = this.material(p.accent, { color: p.accent, emissive: p.accent, emissiveIntensity: 0.48, metalness: 0.22, roughness: 0.16, transparent: true, opacity: 0.86 });
        for (let i = 0; i < 10; i++) {
            const angle = i * Math.PI * 2 / 10 + 0.18;
            const group = new THREE.Group();
            const crystal = this.addMesh(new THREE.OctahedronGeometry(0.6 + (i % 3) * 0.12, 1), crystalMaterial.clone(), [0, 0, 0], group, false);
            crystal.scale.set(0.58, 1.65, 0.58);
            const cage = this.addMesh(new THREE.TorusGeometry(0.52, 0.025, 6, 32), this.material(p.inlay, { metalness: 0.8, roughness: 0.25 }), [0, 0, 0], group, false);
            cage.rotation.x = Math.PI / 2;
            group.position.set(Math.cos(angle) * 10.5, 2.7 + (i % 4) * 1.05, Math.sin(angle) * 10.5);
            group.rotation.set(0.25, -angle, 0.18);
            this.scene.add(group);
            this.decorations.push(group);
        }
        for (let i = 0; i < 36; i++) {
            const angle = i * Math.PI * 2 / 36;
            const star = this.addMesh(new THREE.IcosahedronGeometry(i % 4 === 0 ? 0.12 : 0.07, 0), this.material(i % 3 ? p.inlay : p.accent, { emissive: i % 3 ? p.inlay : p.accent, emissiveIntensity: 0.65 }), [Math.cos(angle) * (19 + i % 3), 4 + (i % 7) * 0.82, Math.sin(angle) * (19 + i % 3)], this.scene, false);
            this.decorations.push(star);
        }
    },

    buildStardust(p) {
        const positions = [];
        const colors = [];
        const color = new THREE.Color(p.inlay);
        const particleCount = this.lowPowerDevice ? 260 : 680;
        for (let i = 0; i < particleCount; i++) {
            positions.push((Math.random() - 0.5) * 64, Math.random() * 22 - 1, (Math.random() - 0.5) * 64);
            const tint = color.clone().lerp(new THREE.Color(p.accent), Math.random() * 0.55);
            colors.push(tint.r, tint.g, tint.b);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true }));
        this.scene.add(this.particles);
        this.decorations.push(this.particles);
    },

    spawnHumanoidAvatars(num) {
        this.avatarMeshes.forEach(object => this.disposeObject(object));
        this.avatarMeshes = [];
        const radius = 8.05;
        const palettes = [0xc89a5c, 0x7b90c8, 0x9d6caa, 0x4d9c84, 0xb96b62, 0x7197a7];
        const skinTones = [0xe8b890, 0x8b563d, 0xd59871, 0x6c4637, 0xf0c9a5, 0xb87857];
        const hairColors = [0x302026, 0x151724, 0x5a2f1d, 0x231713, 0xb68a42, 0x4c263d];
        for (let i = 0; i < num; i++) {
            const angle = (i / num) * Math.PI * 2 + Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const player = GameEngine.players[i];
            const isHuman = player && !player.isBot;
            const robeColor = isHuman ? 0xc39b4e : palettes[(i - 1 + palettes.length) % palettes.length];
            const skinColor = skinTones[i % skinTones.length];
            const hairColor = hairColors[(i * 2 + 1) % hairColors.length];
            const root = new THREE.Group();
            const body = new THREE.Group();
            root.add(body);
            const robe = this.material(robeColor, { roughness: 0.79, metalness: 0.08 });
            const trim = this.material(isHuman ? 0xffdc8d : palettes[(i + 2) % palettes.length], { metalness: 0.55, roughness: 0.32 });
            const skin = this.material(skinColor, { roughness: 0.86 });
            const hair = this.material(hairColor, { roughness: 0.91 });
            const shadow = this.material(0x211a2a, { roughness: 0.92 });
            const gold = this.material(0xd7b777, { metalness: 0.82, roughness: 0.23 });

            // Anatomical silhouette: shoulders, layered mantle, torso, sleeves and hands.
            this.addMesh(new THREE.CylinderGeometry(0.2, 0.72, 1.82, 20, 1), robe, [0, 0.93, 0], body);
            const mantle = this.addMesh(new THREE.SphereGeometry(0.82, 24, 14, 0, Math.PI * 2, 0.15, 1.35), robe.clone(), [0, 1.55, -0.04], body);
            mantle.scale.set(1.04, 0.67, 0.63);
            const collar = this.addMesh(new THREE.TorusGeometry(0.35, 0.095, 10, 28), trim, [0, 1.88, 0.01], body);
            collar.rotation.x = Math.PI / 2;
            const sash = this.addMesh(new THREE.BoxGeometry(0.11, 1.42, 0.93), trim.clone(), [0.12, 0.97, 0.15], body, false);
            sash.rotation.z = -0.08;
            for (const side of [-1, 1]) {
                const sleeve = this.addMesh(new THREE.CylinderGeometry(0.2, 0.24, 0.86, 14), robe.clone(), [side * 0.64, 1.15, 0.02], body);
                sleeve.rotation.z = side * 0.3;
                const cuff = this.addMesh(new THREE.TorusGeometry(0.19, 0.045, 8, 20), trim.clone(), [side * 0.77, 0.81, 0.05], body, false);
                cuff.rotation.z = Math.PI / 2;
                this.addMesh(new THREE.SphereGeometry(0.145, 16, 12), skin.clone(), [side * 0.79, 0.67, 0.1], body);
                const shoulder = this.addMesh(new THREE.SphereGeometry(0.28, 16, 12), robe.clone(), [side * 0.58, 1.63, -0.02], body);
                shoulder.scale.set(1.25, 0.75, 0.8);
            }

            // Neck and expressive face; small asymmetries and hair silhouettes personalize each sitter.
            this.addMesh(new THREE.CylinderGeometry(0.16, 0.19, 0.38, 16), skin.clone(), [0, 1.98, 0.06], body);
            const head = this.addMesh(new THREE.SphereGeometry(0.39, 28, 22), skin.clone(), [0, 2.37, 0.06], body);
            head.scale.set(0.84, 1.12, 0.92);
            for (const side of [-1, 1]) {
                const ear = this.addMesh(new THREE.SphereGeometry(0.105, 12, 10), skin.clone(), [side * 0.32, 2.34, 0.04], body);
                ear.scale.set(0.7, 1, 0.55);
                const eyeWhite = this.material(0xf4eade, { roughness: 0.5 });
                this.addMesh(new THREE.SphereGeometry(0.064, 12, 10), eyeWhite, [side * 0.135, 2.4, 0.385], body, false);
                this.addMesh(new THREE.SphereGeometry(0.033, 10, 8), shadow.clone(), [side * 0.135, 2.4, 0.437], body, false);
                const brow = this.addMesh(new THREE.BoxGeometry(0.14, 0.035, 0.045), hair.clone(), [side * 0.14, 2.5, 0.38], body, false);
                brow.rotation.z = side * -0.09;
            }
            const nose = this.addMesh(new THREE.ConeGeometry(0.075, 0.18, 8), skin.clone(), [0, 2.29, 0.42], body, false);
            nose.rotation.x = Math.PI / 2;
            const mouth = this.addMesh(new THREE.BoxGeometry(0.12, 0.022, 0.025), this.material(0x713f43, { roughness: 0.9 }), [0, 2.17, 0.411], body, false);
            mouth.rotation.z = -0.02;
            // Hair cap, back hair, and a different swept lock per avatar.
            const hairCap = this.addMesh(new THREE.SphereGeometry(0.4, 20, 14, 0, Math.PI * 2, 0, 1.06), hair, [0, 2.57, 0.01], body);
            hairCap.scale.set(0.91, 0.92, 0.94);
            this.addMesh(new THREE.SphereGeometry(0.37, 16, 12), hair.clone(), [i % 2 ? 0.05 : -0.08, 2.53, -0.2], body).scale.set(0.9, 0.48, 0.78);
            const lock = this.addMesh(new THREE.CylinderGeometry(0.055, 0.09, 0.36, 8), hair.clone(), [i % 2 ? -0.28 : 0.28, 2.54, 0.22], body, false);
            lock.rotation.z = i % 2 ? -0.48 : 0.48;

            const circlet = this.addMesh(new THREE.TorusGeometry(0.31, 0.035, 8, 24), gold, [0, 2.61, 0.02], body, false);
            circlet.rotation.x = 0.09;
            const jewel = this.addMesh(new THREE.OctahedronGeometry(0.11, 1), this.material(0x89d7e4, { metalness: 0.4, emissive: 0x216d87, emissiveIntensity: 0.75 }), [0, 2.7, 0.31], body, false);
            jewel.scale.set(0.8, 1.4, 0.7);
            const sigil = this.addMesh(new THREE.OctahedronGeometry(0.12, 0), this.material(0xffd783, { emissive: 0xc47a22, emissiveIntensity: 0.48, metalness: 0.64 }), [0, 1.65, 0.51], body, false);
            sigil.rotation.z = Math.PI / 4;
            const halo = this.addMesh(new THREE.TorusGeometry(0.61, 0.018, 6, 48), this.material(isHuman ? 0xf6d27b : palettes[(i + 3) % palettes.length], { emissive: isHuman ? 0xc28e26 : palettes[(i + 3) % palettes.length], emissiveIntensity: 0.32, transparent: true, opacity: 0.72 }), [0, 3.16, -0.15], body, false);
            halo.rotation.x = 0.18;

            root.position.set(x, -0.45, z);
            root.rotation.y = Math.atan2(-x, -z);
            root.userData.bobOffset = i * 1.7;
            root.userData.body = body;
            root.userData.isHuman = Boolean(isHuman);
            this.scene.add(root);
            this.avatarMeshes.push(root);
        }
    },

    disposeObject(object) {
        if (!this.scene || !object) return;
        this.scene.remove(object);
        object.traverse(part => {
            if (part.geometry) part.geometry.dispose();
            if (part.material) (Array.isArray(part.material) ? part.material : [part.material]).forEach(material => material.dispose());
        });
    },

    changeEnvironment(environment) {
        this.buildEnvironment(environment);
    },

    animate() {
        this.rafId = requestAnimationFrame(() => this.animate());
        if (!this.renderer || !this.scene || !this.camera) return;
        const time = this.clock ? this.clock.getElapsedTime() : 0;
        if (!this.reducedMotion) {
            if (this.particles) this.particles.rotation.y = time * 0.008;
            this.avatarMeshes.forEach(avatar => {
                avatar.position.y = -0.45 + Math.sin(time * 0.72 + avatar.userData.bobOffset) * 0.045;
                avatar.rotation.y += Math.sin(time * 0.24 + avatar.userData.bobOffset) * 0.00018;
            });
            const heart = this.tableMesh && this.tableMesh.getObjectByName('altar-heart');
            if (heart) {
                heart.rotation.y = time * 0.24;
                heart.position.y = 0.34 + Math.sin(time * 1.1) * 0.055;
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
};
