// Three.js presentation layer. Ten hand-built locations share a common ritual table,
// but each room has its own architecture, furniture language, materials and atmosphere.
const GameEngine3D = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    environmentRoot: null,
    tableMesh: null,
    avatarMeshes: [],
    decorations: [],
    animatedObjects: [],
    particles: null,
    clock: null,
    reducedMotion: false,
    lowPowerDevice: false,
    resizeObserver: null,
    rafId: null,
    environment: 'temple',
    profile: null,
    textures: [],
    textureCache: new Map(),
    cameraFov: 36,
    cameraTarget: { x: 0, y: 1.25, z: 0 },

    // Keep this manifest data-only: it is also used by the UI and Node tests without WebGL.
    environments: [
        { id: 'temple', label: 'Sanctum der Sieben Siegel', description: 'Ein stiller Gewölbehof aus dunklem Marmor, vergoldeten Säulen und einem sternverglasten Sanktuarium.', architecture: 'sanctum', background: 0x110d1b, fog: 0x282037, fogDensity: 0.008, stone: 0x51445a, trim: 0xc7a96a, accent: 0xb591ed, glass: 0x654b91, floor: 0x211b2a, wood: 0x3b2930, seat: 0x593d58, keyLight: 0xffd8a0, fillLight: 0x9d85d2, tableShape: 12, floorPattern: 'radial', particles: 'dust', particleTint: 0xe7c987 },
        { id: 'druid', label: 'Hain der Wurzelchronik', description: 'Ein uralter Baumkreis: verwachsene Wurzeln, Moossteine, schwebende Samen und ein lebender Holzaltar.', architecture: 'grove', background: 0x071410, fog: 0x18392b, fogDensity: 0.012, stone: 0x344c3a, trim: 0xb1a36b, accent: 0x70ce91, glass: 0x38865d, floor: 0x17291d, wood: 0x493923, seat: 0x38533b, keyLight: 0xb7e8a0, fillLight: 0x5abf9d, tableShape: 14, floorPattern: 'moss', particles: 'spores', particleTint: 0xc9e88e },
        { id: 'mountain', label: 'Observatorium am Himmelsgrat', description: 'Eine offene Sternwarte auf einem schneebedeckten Grat mit Armillarsphäre, Fernrohr und fernen Gipfeln.', architecture: 'peak', background: 0x0a1726, fog: 0x263b53, fogDensity: 0.006, stone: 0x596b7c, trim: 0xa8d2e3, accent: 0x8dc8ef, glass: 0x47748e, floor: 0x263442, wood: 0x493e34, seat: 0x34495c, keyLight: 0xc6eaff, fillLight: 0x829dd4, tableShape: 10, floorPattern: 'star', particles: 'snow', particleTint: 0xd9f2ff },
        { id: 'library', label: 'Bibliothek der Nachtflügel', description: 'Eine gotische Wissenshalle mit mehrstöckigen Galerien, dicht gefüllten Eichenregalen und einer Rosette aus Glas.', architecture: 'library', background: 0x17101b, fog: 0x30263a, fogDensity: 0.007, stone: 0x554650, trim: 0xd1ac72, accent: 0xd19a55, glass: 0x597a9d, floor: 0x251b24, wood: 0x543a2a, seat: 0x593d32, keyLight: 0xffd49a, fillLight: 0x9b82ae, tableShape: 8, floorPattern: 'parquet', particles: 'dust', particleTint: 0xe2bc78 },
        { id: 'undersea', label: 'Abtei der Tiefenströmung', description: 'Eine versunkene Abtei aus Perlmutt und Korallen, durch deren Spitzbogenfenster blaues Meereslicht fällt.', architecture: 'undersea', background: 0x06202a, fog: 0x0e5260, fogDensity: 0.014, stone: 0x397078, trim: 0x91d9cb, accent: 0x68e0dc, glass: 0x347e9b, floor: 0x14343b, wood: 0x3a655f, seat: 0x315d63, keyLight: 0x9bf5ed, fillLight: 0x5eadd8, tableShape: 16, floorPattern: 'tide', particles: 'bubbles', particleTint: 0x97f4ec },
        { id: 'desert', label: 'Sonnenpalast der Glasdünen', description: 'Ein warmer Hof aus Sandstein, Hufeisenarkaden, Sternmosaiken, Palmen und einem stillen Wasserbecken.', architecture: 'desert', background: 0x28180f, fog: 0x70452b, fogDensity: 0.009, stone: 0x9d704a, trim: 0xe5bd75, accent: 0xf2a85d, glass: 0x3c8690, floor: 0x70513b, wood: 0x6e472b, seat: 0x835542, keyLight: 0xffdfa5, fillLight: 0xe79050, tableShape: 8, floorPattern: 'mosaic', particles: 'sand', particleTint: 0xffd69b },
        { id: 'moon', label: 'Mondkloster der stillen Gezeiten', description: 'Ein stiller Mondhof mit Torii, silbernem Mondtor, spiegelndem Wasser und sorgfältig geharktem Kies.', architecture: 'moon', background: 0x0a1020, fog: 0x202b4a, fogDensity: 0.006, stone: 0x505a70, trim: 0xc3d1e6, accent: 0x9eb7ed, glass: 0x768fba, floor: 0x252c3b, wood: 0x433c39, seat: 0x35405b, keyLight: 0xd5e3ff, fillLight: 0x778cce, tableShape: 12, floorPattern: 'zen', particles: 'moonlight', particleTint: 0xe0e7ff },
        { id: 'forge', label: 'Schmiede des Phönix', description: 'Eine unterirdische Schmiede aus Basalt und Eisen, durchzogen von Lavaadern und beherrscht von einem Glutofen.', architecture: 'forge', background: 0x190b0a, fog: 0x592219, fogDensity: 0.011, stone: 0x493436, trim: 0xb98453, accent: 0xff653c, glass: 0xee4c2e, floor: 0x241819, wood: 0x3a2521, seat: 0x563329, keyLight: 0xffa05b, fillLight: 0xa13c32, tableShape: 10, floorPattern: 'lava', particles: 'embers', particleTint: 0xffa052 },
        { id: 'ice', label: 'Kristallhalle des Nordlichts', description: 'Eine Kathedrale aus Gletschereis mit prismatischen Pfeilern, gläsernen Spitzbögen und tanzendem Nordlicht.', architecture: 'ice', background: 0x09172b, fog: 0x263f62, fogDensity: 0.008, stone: 0x5f89a1, trim: 0xc1eaff, accent: 0x7cdcf1, glass: 0x80c8eb, floor: 0x1c3047, wood: 0x37495c, seat: 0x32536c, keyLight: 0xc4f2ff, fillLight: 0x8b91e1, tableShape: 8, floorPattern: 'ice', particles: 'snow', particleTint: 0xbdeaff },
        { id: 'sky', label: 'Hängende Gärten der Äonen', description: 'Ein offenes Himmelsheiligtum auf schwebenden Inseln, verbunden durch Brücken, Pergolen und Wasserfälle aus Licht.', architecture: 'sky', background: 0x13223b, fog: 0x5b7a9b, fogDensity: 0.006, stone: 0x728b8d, trim: 0xe3c77b, accent: 0x91d8dc, glass: 0x94cde4, floor: 0x344f51, wood: 0x67533a, seat: 0x48645e, keyLight: 0xffe0a1, fillLight: 0x86c4e4, tableShape: 12, floorPattern: 'garden', particles: 'pollen', particleTint: 0xfff0b0 }
    ],

    cameraDistanceForAspect(aspect) {
        const ratio = Math.max(0.55, Math.min(4, Number(aspect) || 1));
        const halfFov = (this.cameraFov * Math.PI / 180) / 2;
        const neededForWidth = 25 / (2 * Math.tan(halfFov) * ratio);
        return Math.max(25, Math.min(54, neededForWidth));
    },

    handLayout(width, cardCount) {
        const available = Math.max(1, Number(width) || 360);
        const count = Math.max(0, Math.floor(Number(cardCount) || 0));
        if (!count) return { cardWidth: 0, overlap: 0, totalWidth: 0 };
        const cardWidth = Math.min(124, Math.max(60, Math.floor(available / (1 + (count - 1) * 0.58))));
        if (count === 1) return { cardWidth, overlap: 0, totalWidth: cardWidth };
        const minimumVisible = Math.min(cardWidth, Math.max(44, cardWidth * 0.56));
        const step = Math.max(minimumVisible, Math.min(cardWidth, (available - cardWidth) / (count - 1)));
        const overlap = Math.max(0, cardWidth - step);
        return { cardWidth, overlap, totalWidth: cardWidth + (count - 1) * step };
    },

    init() {
        this.container = document.getElementById('canvas-container');
        if (!this.container || typeof THREE === 'undefined') return;
        try {
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(this.cameraFov, 1, 0.1, 180);
            this.clock = new THREE.Clock();
            this.reducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            const hardware = typeof navigator !== 'undefined' ? navigator : {};
            this.lowPowerDevice = Boolean(window.innerWidth < 720 || (hardware.hardwareConcurrency && hardware.hardwareConcurrency <= 4) || (hardware.deviceMemory && hardware.deviceMemory <= 4));
            this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowPowerDevice, alpha: false, powerPreference: 'high-performance' });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPowerDevice ? 1.25 : 1.6));
            this.renderer.shadowMap.enabled = !this.lowPowerDevice;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.12;
            this.renderer.domElement.setAttribute('aria-label', 'Dreidimensionale Ritual-Arena mit zehn individuell gestalteten Spielorten');
            this.container.replaceChildren(this.renderer.domElement);
            this.buildEnvironment(this.environment);
            this.resize();
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => this.resize());
                this.resizeObserver.observe(this.container);
            } else {
                window.addEventListener('resize', () => this.resize(), { passive: true });
            }
            this.animate();
        } catch (error) {
            console.warn('3D-Ansicht konnte nicht initialisiert werden:', error);
            this.container.classList.add('canvas-fallback');
            this.container.textContent = '3D-Ansicht nicht verfügbar; das Kartenspiel bleibt spielbar.';
        }
    },

    resize() {
        if (!this.renderer || !this.camera || !this.container) return;
        const width = Math.max(1, this.container.clientWidth);
        const height = Math.max(1, this.container.clientHeight);
        const aspect = width / height;
        this.camera.aspect = aspect;
        const distance = this.cameraDistanceForAspect(aspect);
        const direction = { x: 0, y: 0.55, z: 0.835 };
        const length = Math.hypot(direction.y, direction.z);
        this.camera.position.set(
            this.cameraTarget.x,
            this.cameraTarget.y + distance * direction.y / length,
            this.cameraTarget.z + distance * direction.z / length
        );
        this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    },

    colorCss(color) {
        return `#${Number(color).toString(16).padStart(6, '0')}`;
    },

    makeTexture(kind, colors, seed = 17) {
        const key = `${kind}:${colors.join(',')}`;
        if (this.textureCache && this.textureCache.has(key)) return this.textureCache.get(key);
        if (typeof document === 'undefined' || !document.createElement) return null;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const palette = colors.map(color => this.colorCss(color));
        let state = (seed >>> 0) || 1;
        const random = () => {
            state += 0x6D2B79F5;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, palette[0] || '#45394a');
        gradient.addColorStop(0.52, palette[1] || palette[0] || '#45394a');
        gradient.addColorStop(1, palette[2] || palette[0] || '#45394a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        if (kind === 'wood') {
            for (let i = 0; i < 92; i++) {
                const y = random() * 512;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(145, y + random() * 20 - 10, 340, y + random() * 26 - 13, 512, y + random() * 18 - 9);
                ctx.strokeStyle = i % 5 === 0 ? 'rgba(24,13,8,.32)' : 'rgba(240,202,134,.09)';
                ctx.lineWidth = i % 7 === 0 ? 3 : 1;
                ctx.stroke();
            }
            for (let i = 0; i < 5; i++) {
                const x = random() * 512;
                const y = random() * 512;
                ctx.beginPath(); ctx.ellipse(x, y, 9 + random() * 13, 4 + random() * 6, random(), 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(27,14,9,.28)'; ctx.lineWidth = 2; ctx.stroke();
            }
        } else if (kind === 'cloth') {
            for (let i = 0; i < 512; i += 4) {
                ctx.fillStyle = i % 8 === 0 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.035)';
                ctx.fillRect(i, 0, 1, 512); ctx.fillRect(0, i, 512, 1);
            }
            for (let i = 0; i < 220; i++) {
                ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 1 + random() * 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,234,197,.05)'; ctx.fill();
            }
        } else if (kind === 'metal') {
            for (let i = 0; i < 70; i++) {
                const y = i * 8 + random() * 4;
                ctx.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)';
                ctx.fillRect(0, y, 512, 1 + random() * 3);
            }
            for (let i = 0; i < 30; i++) {
                ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 1 + random() * 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,238,193,.08)'; ctx.fill();
            }
        } else if (kind === 'ice') {
            for (let i = 0; i < 34; i++) {
                const x = random() * 512, y = random() * 512;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - .5) * 90, y + (random() - .5) * 120);
                ctx.lineTo(x + (random() - .5) * 170, y + (random() - .5) * 210);
                ctx.strokeStyle = `rgba(211,244,255,${.08 + random() * .18})`; ctx.lineWidth = 1 + random() * 2; ctx.stroke();
            }
            for (let i = 0; i < 180; i++) {
                ctx.fillStyle = `rgba(255,255,255,${.025 + random() * .08})`;
                ctx.fillRect(random() * 512, random() * 512, 2 + random() * 11, 1 + random() * 3);
            }
        } else if (kind === 'water') {
            for (let i = 0; i < 110; i++) {
                const x = random() * 512, y = random() * 512;
                ctx.beginPath(); ctx.ellipse(x, y, 8 + random() * 44, 2 + random() * 8, random() * Math.PI, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(180,255,245,${.05 + random() * .18})`; ctx.lineWidth = 1 + random() * 2; ctx.stroke();
            }
        } else {
            // Stone, sand and ceramic get a hand-worn mineral grain with occasional hairline fractures.
            for (let i = 0; i < 1200; i++) {
                const shade = random() > .5 ? 255 : 0;
                ctx.fillStyle = `rgba(${shade},${shade},${shade},${.012 + random() * .055})`;
                const s = 1 + random() * 4;
                ctx.fillRect(random() * 512, random() * 512, s, s);
            }
            for (let i = 0; i < 16; i++) {
                let x = random() * 512, y = random() * 512;
                ctx.beginPath(); ctx.moveTo(x, y);
                for (let n = 0; n < 5; n++) { x += random() * 50 - 25; y += random() * 42 - 21; ctx.lineTo(x, y); }
                ctx.strokeStyle = 'rgba(10,8,10,.17)'; ctx.lineWidth = 1 + random(); ctx.stroke();
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(kind === 'wood' ? 2 : 3, kind === 'wood' ? 1 : 3);
        texture.anisotropy = this.renderer ? Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) : 1;
        texture.encoding = THREE.sRGBEncoding;
        this.textures.push(texture);
        if (this.textureCache) this.textureCache.set(key, texture);
        return texture;
    },

    material(color, options = {}) {
        return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12, ...options });
    },

    surface(kind, colors, options = {}) {
        const map = this.makeTexture(kind, colors, (Number(colors[0]) || 1) ^ (kind.length * 101));
        return this.material(0xffffff, { map, roughness: kind === 'metal' ? 0.35 : 0.82, ...options });
    },

    addMesh(geometry, material, position = [0, 0, 0], parent = this.environmentRoot || this.scene, castShadow = true) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position[0], position[1], position[2]);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        if (parent) parent.add(mesh);
        return mesh;
    },

    addBox(parent, size, position, material, rotation = [0, 0, 0], castShadow = true) {
        const mesh = this.addMesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material, position, parent, castShadow);
        mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        return mesh;
    },

    addCylinder(parent, top, bottom, height, radialSegments, position, material, castShadow = true) {
        return this.addMesh(new THREE.CylinderGeometry(top, bottom, height, radialSegments), material, position, parent, castShadow);
    },

    addTube(parent, points, radius, material, segments = 48, radialSegments = 8, closed = false) {
        const vectors = points.map(point => new THREE.Vector3(point[0], point[1], point[2]));
        const curve = new THREE.CatmullRomCurve3(vectors, closed, 'catmullrom', 0.5);
        return this.addMesh(new THREE.TubeGeometry(curve, segments, radius, radialSegments, closed), material, [0, 0, 0], parent);
    },

    addPointLight(parent, color, intensity, distance, position, decay = 2) {
        const light = new THREE.PointLight(color, intensity, distance, decay);
        light.position.set(position[0], position[1], position[2]);
        parent.add(light);
        return light;
    },

    addColumn(parent, x, z, height, radius, stone, trim, flutes = 8) {
        const group = new THREE.Group();
        group.position.set(x, -1.03, z);
        parent.add(group);
        const base = this.addCylinder(group, radius * 1.28, radius * 1.5, 0.34, 12, [0, 0.17, 0], trim);
        const plinth = this.addCylinder(group, radius * 1.04, radius * 1.16, 0.25, 12, [0, 0.44, 0], stone);
        this.addCylinder(group, radius * 0.82, radius, height - 1.2, 16, [0, height / 2 + 0.25, 0], stone);
        this.addCylinder(group, radius * 1.14, radius * 0.92, 0.24, 12, [0, height - 0.55, 0], trim);
        this.addCylinder(group, radius * 1.36, radius * 1.12, 0.36, 12, [0, height - 0.25, 0], stone);
        for (let i = 0; i < flutes; i++) {
            const angle = i * Math.PI * 2 / flutes;
            const flute = this.addCylinder(group, radius * 0.035, radius * 0.035, height - 1.25, 6,
                [Math.cos(angle) * radius * 0.82, height / 2 + 0.25, Math.sin(angle) * radius * 0.82], trim, false);
            flute.material = trim;
        }
        group.userData.parts = [base, plinth];
        return group;
    },

    addArch(parent, x, baseY, z, radius, material, thickness = 0.22, pointed = false) {
        const group = new THREE.Group();
        group.position.set(x, baseY, z);
        parent.add(group);
        if (pointed) {
            this.addTube(group, [
                [-radius, 0, 0], [-radius, radius * .58, 0], [-radius * .76, radius * 1.02, 0],
                [-radius * .42, radius * 1.42, 0], [0, radius * 1.58, 0],
                [radius * .42, radius * 1.42, 0], [radius * .76, radius * 1.02, 0], [radius, radius * .58, 0]
            ], thickness, material, 56, 8, false);
        } else {
            const arch = this.addMesh(new THREE.TorusGeometry(radius, thickness, 10, 64, Math.PI), material, [0, radius, 0], group);
            arch.rotation.z = 0;
        }
        return group;
    },

    addMosaicWindow(parent, x, y, z, radius, profile, segments = 12) {
        const windowGroup = new THREE.Group();
        windowGroup.position.set(x, y, z);
        parent.add(windowGroup);
        const glassColors = [profile.glass, profile.accent, profile.trim, 0x6652a0, 0xd98574, 0x63a8a6];
        for (let i = 0; i < segments; i++) {
            const a = (Math.PI * 2 * i) / segments;
            this.addMesh(
                new THREE.CircleGeometry(radius * 0.88, 3, a, Math.PI * 2 / segments),
                this.material(glassColors[i % glassColors.length], { roughness: 0.32, metalness: 0.18, emissive: glassColors[i % glassColors.length], emissiveIntensity: 0.11, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
                [0, 0, -0.045], windowGroup, false
            );
        }
        const rim = this.addMesh(new THREE.TorusGeometry(radius, radius * 0.075, 10, 64), this.material(profile.trim, { metalness: 0.72, roughness: 0.24 }), [0, 0, 0], windowGroup, false);
        for (let i = 0; i < segments; i++) {
            const a = (Math.PI * 2 * i) / segments;
            const spoke = this.addBox(windowGroup, [radius * 0.94, radius * 0.055, 0.12], [Math.cos(a) * radius * 0.47, Math.sin(a) * radius * 0.47, 0.035], this.material(profile.trim, { metalness: 0.65, roughness: 0.3 }), [0, 0, a], false);
            spoke.rotation.z = a;
        }
        this.addMesh(new THREE.CircleGeometry(radius * 0.18, 16), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: 0.6, metalness: 0.3 }), [0, 0, 0.055], windowGroup, false);
        return windowGroup;
    },

    buildEnvironment(type = 'temple') {
        if (!this.scene) return;
        const profile = this.environments.find(item => item.id === type) || this.environments[0];
        this.environment = profile.id;
        this.profile = profile;
        this.clearEnvironment();
        this.environmentRoot = new THREE.Group();
        this.environmentRoot.name = `environment-${profile.id}`;
        this.scene.add(this.environmentRoot);
        this.scene.background = new THREE.Color(profile.background);
        this.scene.fog = new THREE.FogExp2(profile.fog, profile.fogDensity);
        this.addLighting(profile);
        this.buildFloor(profile);
        this.buildAltar(profile);
        this.buildSeating(profile);
        this[`build${profile.architecture[0].toUpperCase()}${profile.architecture.slice(1)}`](profile);
        this.buildAtmosphere(profile);
        this.spawnHumanoidAvatars((typeof GameEngine !== 'undefined' && GameEngine.numPlayers) || 3);
        const label = typeof document !== 'undefined' && document.getElementById('environment-description');
        if (label) label.textContent = profile.description;
        if (this.container && this.renderer) this.resize();
    },

    clearEnvironment() {
        if (this.environmentRoot) this.disposeObject(this.environmentRoot);
        this.environmentRoot = null;
        this.tableMesh = null;
        this.decorations = [];
        this.avatarMeshes = [];
        this.animatedObjects = [];
        this.particles = null;
        this.textures = [];
        this.textureCache = new Map();
    },

    addLighting(profile) {
        const root = this.environmentRoot;
        root.add(new THREE.HemisphereLight(profile.keyLight, profile.floor, 1.5));
        const key = new THREE.DirectionalLight(profile.keyLight, 2.35);
        key.position.set(-8, 15, 8);
        key.castShadow = !this.lowPowerDevice;
        key.shadow.mapSize.set(this.lowPowerDevice ? 512 : 1024, this.lowPowerDevice ? 512 : 1024);
        key.shadow.camera.left = -18; key.shadow.camera.right = 18;
        key.shadow.camera.top = 18; key.shadow.camera.bottom = -18;
        key.shadow.bias = -0.00035;
        root.add(key);
        const fill = new THREE.DirectionalLight(profile.fillLight, 1.15);
        fill.position.set(8, 9, -12);
        root.add(fill);
        const rim = new THREE.DirectionalLight(profile.accent, 0.62);
        rim.position.set(0, 12, 14);
        root.add(rim);
        this.addPointLight(root, profile.accent, 24, 21, [0, 4.1, 0], 2);
        this.addPointLight(root, profile.keyLight, 12, 18, [-8, 5, -8], 2);
    },

    buildFloor(profile) {
        const root = this.environmentRoot;
        const floorTexture = profile.floorPattern === 'ice' ? 'ice' : profile.floorPattern === 'tide' ? 'water' : 'stone';
        const floorColors = [profile.floor, profile.stone, profile.background];
        let ground = null;
        if (profile.id !== 'sky') {
            ground = this.addMesh(new THREE.PlaneGeometry(78, 78), this.surface(floorTexture, floorColors, { roughness: profile.floorPattern === 'tide' || profile.floorPattern === 'ice' ? 0.32 : 0.92, metalness: profile.floorPattern === 'tide' ? 0.32 : 0.08 }), [0, -1.16, 0], root, false);
            ground.rotation.x = -Math.PI / 2;
        } else {
            const floatingBedrock = this.addMesh(new THREE.DodecahedronGeometry(13.5, 1), this.surface('stone', [0x596b68, 0x2e4141, profile.floor], { roughness: .95 }), [0, -7.15, 0], root);
            floatingBedrock.scale.set(1.08, .47, 1.02);
            for (let i = 0; i < 7; i++) {
                const a = i * Math.PI * 2 / 7;
                const hangingRoot = this.addMesh(new THREE.ConeGeometry(.55 + (i % 3) * .18, 4.2 + (i % 2), 5), this.material(i % 2 ? 0x4e665b : 0x675c45, { roughness: .94 }), [Math.cos(a) * 8.8, -6.9, Math.sin(a) * 8.8], root);
                hangingRoot.rotation.z = Math.cos(a) * .2;
                hangingRoot.rotation.x = Math.sin(a) * .2;
            }
        }
        const platformMat = this.surface(profile.floorPattern === 'mosaic' ? 'stone' : floorTexture, [profile.floor, profile.stone, profile.trim], { roughness: .7, metalness: .14 });
        this.addCylinder(root, 13.35, 14.1, 0.42, profile.tableShape, [0, -0.91, 0], platformMat);
        const outerBand = this.material(profile.trim, { metalness: .72, roughness: .26 });
        const floorRing = this.addMesh(new THREE.TorusGeometry(13.15, .075, 8, 120), outerBand, [0, -.69, 0], root, false);
        floorRing.rotation.x = Math.PI / 2;
        const innerRing = this.addMesh(new THREE.TorusGeometry(10.15, .035, 6, 120), this.material(profile.trim, { metalness: .6, roughness: .4, transparent: true, opacity: .7 }), [0, -.68, 0], root, false);
        innerRing.rotation.x = Math.PI / 2;
        this.decorations.push(ground, floorRing, innerRing);

        if (profile.floorPattern === 'radial' || profile.floorPattern === 'star' || profile.floorPattern === 'mosaic') {
            for (let i = 0; i < 24; i++) {
                const a = i * Math.PI / 12;
                const inner = i % 2 ? 5.8 : 6.05;
                const outer = i % 2 ? 12.4 : 12.8;
                this.addTube(root, [[Math.cos(a) * inner, -.675, Math.sin(a) * inner], [Math.cos(a) * ((inner + outer) * .53), -.675, Math.sin(a) * ((inner + outer) * .53)], [Math.cos(a) * outer, -.675, Math.sin(a) * outer]], .016, this.material(profile.trim, { metalness: .7, roughness: .28, transparent: true, opacity: .56 }), 10, 4, false);
            }
        }
        if (profile.floorPattern === 'moss' || profile.floorPattern === 'garden') {
            for (let i = 0; i < 18; i++) {
                const angle = i * Math.PI * 2 / 18;
                const patch = this.addMesh(new THREE.SphereGeometry(.75 + (i % 3) * .16, 12, 8), this.material(i % 2 ? 0x315b3b : 0x4b6c3b, { roughness: 1 }), [Math.cos(angle) * 11.5, -.89, Math.sin(angle) * 11.5], root, false);
                patch.scale.set(1.8, .14, .75);
            }
        }
        if (profile.floorPattern === 'zen') {
            for (let i = 0; i < 13; i++) {
                const x = -11 + i * 1.83;
                const rake = this.addBox(root, [0.025, .015, 8.8], [x, -.672, 0], this.material(0xb1a990, { roughness: 1, transparent: true, opacity: .48 }), [0, 0, (i % 2 ? .035 : -.035)], false);
                rake.position.z = -1.2 + (i % 3) * .22;
            }
            for (const [x, z, scale] of [[-9, -7, .8], [9, -5, 1], [-6, 6, .7], [7, 7, .85]]) {
                const stone = this.addMesh(new THREE.DodecahedronGeometry(1.15, 0), this.material(0x697076, { roughness: .93 }), [x, -.48, z], root);
                stone.scale.set(scale * 1.45, scale * .38, scale);
                stone.rotation.y = x * .07;
            }
        }
        if (profile.floorPattern === 'lava') {
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3;
                this.addTube(root, [[Math.cos(a) * 13, -.655, Math.sin(a) * 13], [Math.cos(a) * 10, -.655, Math.sin(a) * 10], [Math.cos(a + .08) * 7.5, -.655, Math.sin(a + .08) * 7.5]], .07, this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: 1.2, roughness: .3 }), 24, 6, false);
            }
        }
        if (profile.floorPattern === 'ice') {
            for (let i = 0; i < 16; i++) {
                const a = i * Math.PI / 8;
                this.addTube(root, [[Math.cos(a) * 3.5, -.66, Math.sin(a) * 3.5], [Math.cos(a + .08) * 7.2, -.66, Math.sin(a + .08) * 7.2], [Math.cos(a - .06) * 11.9, -.66, Math.sin(a - .06) * 11.9]], .018, this.material(0xa5eaff, { emissive: 0x3f9ec5, emissiveIntensity: .4, transparent: true, opacity: .68 }), 18, 4, false);
            }
        }
    },

    buildAltar(profile) {
        const group = new THREE.Group();
        group.name = 'ritual-table';
        const stone = this.surface('stone', [profile.stone, profile.floor, profile.background], { roughness: .48, metalness: .28 });
        const topMat = this.surface(profile.id === 'druid' || profile.id === 'sky' ? 'wood' : 'stone', [profile.wood, profile.stone, profile.floor], { roughness: profile.id === 'ice' ? .28 : .48, metalness: profile.id === 'undersea' ? .27 : .13 });
        const trim = this.material(profile.trim, { metalness: .86, roughness: .22, emissive: profile.trim, emissiveIntensity: .045 });
        const dark = this.material(profile.background, { roughness: .35, metalness: .48 });
        this.addCylinder(group, 3.55, 4.15, .54, profile.tableShape, [0, -.82, 0], stone);
        this.addCylinder(group, 1.38, 2.55, 1.38, profile.tableShape, [0, -.26, 0], stone);
        this.addCylinder(group, 4.85, 5.22, .44, profile.tableShape, [0, -.23, 0], stone);
        this.addCylinder(group, 5.12, 5.12, .19, profile.tableShape, [0, .085, 0], trim);
        this.addCylinder(group, 4.99, 4.99, .14, profile.tableShape, [0, .19, 0], topMat);
        const lip = this.addMesh(new THREE.TorusGeometry(5.02, .11, 12, 96), trim, [0, .23, 0], group);
        lip.rotation.x = Math.PI / 2;
        [4.72, 4.5, 1.78, 1.55].forEach((radius, index) => {
            const ring = this.addMesh(new THREE.TorusGeometry(radius, index < 2 ? .028 : .035, 8, 96), index === 1 ? this.material(profile.accent, { metalness: .6, roughness: .3, emissive: profile.accent, emissiveIntensity: .22 }) : trim, [0, .274 + index * .006, 0], group, false);
            ring.rotation.x = Math.PI / 2;
        });
        const medallion = this.addMesh(new THREE.CircleGeometry(1.42, 64), dark, [0, .267, 0], group, false);
        medallion.rotation.x = -Math.PI / 2;
        const starPoints = [];
        for (let i = 0; i < 12; i++) {
            const a = Math.PI * i / 6;
            const radius = i % 2 ? .72 : 1.16;
            starPoints.push([Math.cos(a) * radius, .285, Math.sin(a) * radius]);
        }
        this.addTube(group, [...starPoints, starPoints[0]], .026, trim, 40, 6, false);
        for (let i = 0; i < 24; i++) {
            const angle = i * Math.PI * 2 / 24;
            const r0 = i % 2 ? 4.18 : 4.26, r1 = i % 2 ? 4.42 : 4.36;
            this.addTube(group, [[Math.cos(angle) * r0, .285, Math.sin(angle) * r0], [Math.cos(angle) * r1, .285, Math.sin(angle) * r1]], .018, trim, 4, 4, false);
        }
        // Six restrained ritual objects sit in an intentional ring, leaving the playable center clear.
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + Math.PI / 6;
            const prop = new THREE.Group();
            prop.position.set(Math.cos(a) * 4.36, .29, Math.sin(a) * 4.36);
            prop.rotation.y = -a;
            group.add(prop);
            if (i % 3 === 0) {
                this.addCylinder(prop, .14, .17, .19, 12, [0, .12, 0], trim, false);
                const flame = this.addMesh(new THREE.ConeGeometry(.09, .27, 8), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: 1.55, roughness: .2 }), [0, .34, 0], prop, false);
                flame.userData.baseY = .34;
                this.animatedObjects.push({ object: flame, type: 'flicker', offset: i });
            } else if (i % 3 === 1) {
                this.addBox(prop, [.56, .08, .72], [0, .08, 0], this.surface('cloth', [profile.seat, profile.background, profile.stone], { roughness: .9 }), [0, .04, 0], false);
                this.addBox(prop, [.46, .035, .61], [0, .14, 0], this.material(profile.trim, { metalness: .76, roughness: .3 }), [0, .04, 0], false);
            } else {
                this.addCylinder(prop, .16, .2, .13, 8, [0, .08, 0], stone, false);
                const gem = this.addMesh(new THREE.OctahedronGeometry(.14, 1), this.material(profile.glass, { emissive: profile.accent, emissiveIntensity: .65, metalness: .35, roughness: .18 }), [0, .25, 0], prop, false);
                gem.scale.y = 1.45;
            }
        }
        const heart = this.addMesh(new THREE.OctahedronGeometry(.31, 1), this.material(profile.accent, { metalness: .38, roughness: .16, emissive: profile.accent, emissiveIntensity: .9 }), [0, .69, 0], group, false);
        heart.name = 'altar-heart';
        this.animatedObjects.push({ object: heart, type: 'heart', offset: 0 });
        // Fluted structural ribs make the pedestal read as carved furniture rather than a floating slab.
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            const rib = this.addBox(group, [.17, 1.12, .18], [Math.cos(a) * 1.69, -.28, Math.sin(a) * 1.69], trim, [0, -a, -.12], false);
        }
        this.tableMesh = group;
        this.environmentRoot.add(group);
    },

    buildSeating(profile) {
        const timber = this.surface('wood', [profile.wood, profile.stone, profile.background], { roughness: .68, metalness: .12 });
        const upholstery = this.surface('cloth', [profile.seat, profile.background, profile.accent], { roughness: .94 });
        const trim = this.material(profile.trim, { metalness: .74, roughness: .28 });
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 + Math.PI / 2;
            const seat = new THREE.Group();
            seat.position.set(Math.cos(angle) * 7.45, -.63, Math.sin(angle) * 7.45);
            seat.rotation.y = Math.atan2(-seat.position.x, -seat.position.z);
            this.environmentRoot.add(seat);
            this.addBox(seat, [1.48, .28, 1.4], [0, .34, 0], timber);
            this.addBox(seat, [1.22, .17, 1.12], [0, .53, .06], upholstery);
            for (const sx of [-.59, .59]) {
                this.addBox(seat, [.18, .78, .18], [sx, -.03, -.5], timber);
                this.addBox(seat, [.18, .78, .18], [sx, -.03, .51], timber);
                this.addBox(seat, [.22, 1.02, .23], [sx * 1.38, .8, -.46], timber);
                this.addMesh(new THREE.SphereGeometry(.15, 12, 10), trim, [sx * 1.38, 1.34, -.46], seat, false);
                this.addBox(seat, [.24, .12, 1.05], [sx * 1.18, .82, .02], trim);
            }
            this.addBox(seat, [1.26, 1.28, .24], [0, 1.02, -.56], upholstery);
            this.addBox(seat, [1.48, .2, .32], [0, 1.75, -.56], trim);
            this.addBox(seat, [.09, 1.2, .13], [-.51, 1.01, -.4], trim, [0, 0, -.05], false);
            this.addBox(seat, [.09, 1.2, .13], [.51, 1.01, -.4], trim, [0, 0, .05], false);
            const backGem = this.addMesh(new THREE.OctahedronGeometry(.18, 1), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: .32, metalness: .35 }), [0, 1.78, -.38], seat, false);
            backGem.scale.y = 1.45;
            seat.userData.playerIndex = i;
            this.decorations.push(seat);
        }
    },

    buildSanctum(profile) {
        const root = this.environmentRoot;
        const stone = this.surface('stone', [profile.stone, profile.floor, profile.background], { roughness: .8 });
        const gold = this.material(profile.trim, { metalness: .78, roughness: .23 });
        // Deep apse, stepped sanctuary and a star-glass rose give the room a clear axial composition.
        this.addBox(root, [24, 10.5, 1.2], [0, 4.1, -15.5], stone);
        this.addBox(root, [25, .72, 1.65], [0, 9.25, -15.35], gold);
        this.addBox(root, [19, .32, 1.9], [0, 9.8, -15.25], stone);
        for (let i = -2; i <= 2; i++) {
            this.addColumn(root, i * 4.8, -13.8, 8.1 - (Math.abs(i) === 2 ? 1 : 0), .56, stone, gold, 10);
        }
        for (let i = -1; i <= 1; i++) this.addArch(root, i * 4.8, 6.6, -13.55, 2.35, gold, .22, false);
        this.addMosaicWindow(root, 0, 6.7, -14.82, 3.05, profile, 16);
        for (let step = 0; step < 5; step++) {
            this.addBox(root, [9.7 - step * .75, .2, .62], [0, -.62 + step * .19, -11.3 - step * .47], stone);
        }
        for (const side of [-1, 1]) {
            this.addColumn(root, side * 12.6, -5, 8.2, .72, stone, gold, 12);
            this.addColumn(root, side * 12.6, 5, 8.2, .72, stone, gold, 12);
            this.addArch(root, side * 12.3, 5.1, -5.2, 4.8, stone, .38, false);
            const torch = new THREE.Group();
            torch.position.set(side * 11.9, 4.7, -3.8);
            root.add(torch);
            this.addCylinder(torch, .2, .3, .65, 10, [0, 0, 0], gold);
            this.addMesh(new THREE.ConeGeometry(.2, .74, 9), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: 1.4 }), [0, .6, 0], torch, false);
            this.addPointLight(root, profile.accent, 11, 9, [side * 11.9, 5.2, -3.8]);
        }
        for (let i = 0; i < 9; i++) {
            const a = i * Math.PI / 8;
            const x = Math.sin(a) * 17, z = -10 - Math.cos(a) * 5;
            const floorLantern = this.addMesh(new THREE.OctahedronGeometry(.25, 1), this.material(profile.trim, { emissive: profile.trim, emissiveIntensity: .6 }), [x, -.43, z], root, false);
            floorLantern.scale.y = 1.6;
        }
    },

    buildGrove(profile) {
        const root = this.environmentRoot;
        const bark = this.surface('wood', [0x533c24, 0x342719, 0x78603a], { roughness: 1 });
        const leaf = this.material(0x507d4b, { roughness: .94 });
        const leafLight = this.material(0x88a85a, { roughness: .9, emissive: 0x18351f, emissiveIntensity: .16 });
        const moss = this.material(0x34553a, { roughness: 1 });
        // The enormous chronicle-tree is the focal structure; smaller elders create a natural clearing around it.
        const trunk = this.addTube(root, [[0, -1, -15], [-.45, 2.3, -15], [.35, 5.4, -15], [-.2, 8.6, -15], [.2, 11.6, -15]], 1.18, bark, 60, 12, false);
        trunk.scale.x = 1.12;
        const branchPaths = [
            [[0, 4.2, -15], [-2.1, 5.9, -14.7], [-4.4, 8.2, -14.5], [-5.8, 10, -14.4]],
            [[.1, 6, -15], [2.4, 7.2, -15.3], [4.6, 9.7, -15.6], [6.2, 11, -15.5]],
            [[0, 8.1, -15], [-1.2, 10, -15.2], [-1.9, 12, -15.4]]
        ];
        branchPaths.forEach((points, index) => this.addTube(root, points, .42 - index * .06, bark, 36, 9, false));
        for (let i = 0; i < 17; i++) {
            const a = i * 2.399;
            const x = Math.cos(a) * (4.5 + (i % 4) * .85);
            const y = 8.7 + (i % 5) * .85;
            const z = -15 + Math.sin(a) * 1.5;
            const canopy = this.addMesh(new THREE.DodecahedronGeometry(1.9 + (i % 3) * .36, 1), i % 4 ? leaf : leafLight, [x, y, z], root);
            canopy.scale.set(1.25, .67 + (i % 2) * .2, .92);
            canopy.rotation.y = a;
        }
        for (const [x, z, h] of [[-12, -10, 10], [12, -10, 11], [-13, 1, 8.5], [13, 2, 9]]) {
            const tree = new THREE.Group(); root.add(tree); tree.position.set(x, -1, z);
            this.addTube(tree, [[0, 0, 0], [.22, h * .34, -.1], [-.18, h * .67, .1], [0, h, 0]], .7, bark, 38, 10, false);
            for (let j = 0; j < 5; j++) {
                const a = j * Math.PI * 2 / 5;
                const bough = this.addMesh(new THREE.DodecahedronGeometry(1.75, 1), j % 2 ? leaf : leafLight, [Math.cos(a) * 1.4, h * .74 + (j % 3) * .6, Math.sin(a) * 1.25], tree);
                bough.scale.set(1.4, .78, 1.1);
            }
            for (let j = 0; j < 4; j++) {
                const a = j * Math.PI / 2;
                this.addTube(tree, [[0, .4, 0], [Math.cos(a) * 1.3, .05, Math.sin(a) * 1.3], [Math.cos(a) * 2.5, -.05, Math.sin(a) * 2.5]], .18, bark, 22, 6, false);
            }
        }
        // Five carved standing stones form a ceremonial semicircle, each with a small moss cap.
        for (let i = 0; i < 5; i++) {
            const a = Math.PI * (i / 4) + Math.PI;
            const x = Math.cos(a) * 12.1, z = Math.sin(a) * 12.1;
            const stone = this.addMesh(new THREE.DodecahedronGeometry(1, 1), this.surface('stone', [profile.stone, profile.floor, 0x22352b], { roughness: 1 }), [x, 1.5 + (i % 3) * .42, z], root);
            stone.scale.set(.9 + (i % 2) * .18, 2.35 + (i % 3) * .3, .58);
            stone.rotation.z = (i % 2 ? -.12 : .1);
            this.addTube(root, [[x, -.35, z], [x + .25, .7, z], [x, 2.3 + (i % 3) * .42, z]], .035, this.material(profile.trim, { emissive: profile.trim, emissiveIntensity: .45 }), 14, 5, false);
        }
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            const x = Math.cos(a) * 10.8, z = Math.sin(a) * 10.8;
            this.addTube(root, [[x, -.77, z], [x * .87, -.5, z * .87], [x * .7, -.68, z * .7]], .1, bark, 20, 6, false);
        }
        for (let i = 0; i < 12; i++) {
            const x = Math.cos(i * 2.4) * (7.3 + i % 3), z = Math.sin(i * 2.4) * (7.3 + i % 3);
            const cap = this.addMesh(new THREE.SphereGeometry(.38 + (i % 3) * .1, 12, 9), this.material(i % 2 ? 0xd6b66d : 0xd47c63, { roughness: .8, emissive: 0x31200b, emissiveIntensity: .18 }), [x, -.45, z], root);
            cap.scale.y = .55;
            this.addCylinder(root, .1, .2, .32, 9, [x, -.63, z], moss, false);
        }
        for (let i = 0; i < 7; i++) {
            const x = -8 + i * 2.6;
            this.addTube(root, [[x, 9, -12], [x + .6, 6, -10], [x - .4, 4, -8], [x + .2, 2.6, -7]], .055, this.material(0x537c45, { roughness: .9 }), 28, 6, false);
        }
    },

    buildPeak(profile) {
        const root = this.environmentRoot;
        const rock = this.surface('stone', [0x435364, 0x2a3947, 0x788b9b], { roughness: .95 });
        const snow = this.material(0xc8e0e9, { roughness: .72 });
        // Open-air horizon: layered ridgelines replace the silhouette of a conventional room.
        for (let i = 0; i < 11; i++) {
            const x = -25 + i * 5.1;
            const h = 8 + ((i * 7) % 9);
            const backPeak = this.addMesh(new THREE.ConeGeometry(4.5 + (i % 3) * .9, h, 5 + (i % 3)), rock, [x, h * .42 - 1.0, -23 - (i % 3) * 2], root);
            backPeak.rotation.y = i * .47;
            const cap = this.addMesh(new THREE.ConeGeometry(1.9 + (i % 2) * .7, h * .34, 5), snow, [x - .18, h * .74 - .7, -23.2 - (i % 3) * 2], root, false);
            cap.rotation.y = backPeak.rotation.y;
        }
        for (const side of [-1, 1]) {
            const crag = this.addMesh(new THREE.DodecahedronGeometry(4.2, 1), rock, [side * 16, 2.7, -9], root);
            crag.scale.set(1.5, 1.35, 1.2);
            const snowline = this.addMesh(new THREE.ConeGeometry(2.1, 3.8, 6), snow, [side * 16.5, 6.4, -9.3], root, false);
            snowline.rotation.z = side * .16;
        }
        // Brass armillary and an inclined telescope occupy a proper observatory deck behind the table.
        const deck = this.addCylinder(root, 6.2, 6.8, .56, 12, [0, -.39, -12.4], this.surface('stone', [profile.stone, profile.floor, 0x253443], { roughness: .72 }));
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            this.addColumn(root, Math.cos(a) * 7.2, -12.4 + Math.sin(a) * 5.8, 4.6 + (i % 2), .32, rock, this.material(profile.trim, { metalness: .76, roughness: .25 }), 6);
        }
        const armillary = new THREE.Group(); armillary.position.set(0, 6.2, -12.4); root.add(armillary);
        const metal = this.material(profile.trim, { metalness: .9, roughness: .18 });
        for (let i = 0; i < 4; i++) {
            const hoop = this.addMesh(new THREE.TorusGeometry(2.2 - i * .18, .075, 10, 64), metal, [0, 0, 0], armillary);
            hoop.rotation.set(i * .68, i * .54, i * .27);
        }
        const star = this.addMesh(new THREE.OctahedronGeometry(.75, 1), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: .8, metalness: .3 }), [0, 0, 0], armillary, false);
        this.animatedObjects.push({ object: armillary, type: 'armillary', offset: 0 });
        const telescope = new THREE.Group(); telescope.position.set(-5.5, 1.3, -10.2); telescope.rotation.z = -.52; telescope.rotation.x = .14; root.add(telescope);
        this.addCylinder(telescope, .34, .53, 4.4, 16, [0, 1.8, 0], metal);
        this.addCylinder(telescope, .55, .37, .42, 16, [0, 4.05, 0], this.material(0x304b5c, { metalness: .78, roughness: .24 }));
        const lens = this.addMesh(new THREE.TorusGeometry(.46, .08, 10, 32), metal, [0, 4.17, 0], telescope);
        lens.rotation.x = Math.PI / 2;
        this.addBox(telescope, [1.5, .4, 2.5], [0, -.35, 0], rock);
        for (const side of [-1, 1]) {
            const cairn = new THREE.Group(); cairn.position.set(side * 11.8, -.65, 3.5); root.add(cairn);
            for (let i = 0; i < 4; i++) {
                const stone = this.addMesh(new THREE.DodecahedronGeometry(.7 - i * .09, 0), rock, [side * i * .08, i * .52, 0], cairn);
                stone.scale.set(1.35, .7, 1.1);
            }
        }
        for (let i = 0; i < 8; i++) {
            const x = -10 + i * 2.8;
            this.addBox(root, [2.65, .22, .58], [x, -.57 + (i % 2) * .07, -8.2 - i * .42], this.material(profile.trim, { metalness: .63, roughness: .35 }));
        }
    },

    addBookcase(parent, x, z, width, profile) {
        const wood = this.surface('wood', [profile.wood, 0x281b16, 0x775331], { roughness: .8 });
        const dark = this.material(0x211720, { roughness: .88 });
        const shelf = new THREE.Group(); shelf.position.set(x, -.9, z); parent.add(shelf);
        this.addBox(shelf, [width, 7.8, .58], [0, 4, 0], dark);
        this.addBox(shelf, [width + .38, .34, .82], [0, .22, 0], wood);
        this.addBox(shelf, [width + .38, .38, .82], [0, 7.75, 0], wood);
        this.addBox(shelf, [.3, 7.4, .8], [-width / 2 + .12, 4, 0], wood);
        this.addBox(shelf, [.3, 7.4, .8], [width / 2 - .12, 4, 0], wood);
        const spineColors = [0x803b3f, 0x304d5b, 0x75603b, 0x4d3c6a, 0x49694e, 0x9b6543, 0x713d62];
        const booksByColor = spineColors.map(() => []);
        for (let row = 0; row < 5; row++) {
            const y = .95 + row * 1.34;
            this.addBox(shelf, [width - .3, .22, .68], [0, y - .15, -.02], wood);
            let cursor = -width / 2 + .34;
            let bookIndex = 0;
            while (cursor < width / 2 - .4) {
                const bookWidth = .19 + ((Math.floor((cursor + width) * 13 + row * 5) % 4) * .065);
                const bookHeight = .76 + ((Math.floor((cursor + width) * 7 + row * 11) % 5) * .1);
                const colorIndex = Math.abs(Math.floor((cursor + width) * 3 + row * 7 + bookIndex)) % spineColors.length;
                booksByColor[colorIndex].push({ x: cursor + bookWidth / 2, y: y + bookHeight / 2 - .03, width: bookWidth, height: bookHeight, rotation: ((Math.floor(cursor * 10) % 4) - 1.5) * .025 });
                cursor += bookWidth + .035;
                bookIndex++;
            }
            // Gilt shelf lips read as repeated craftsmanship without a separate draw call per book.
            this.addBox(shelf, [width - .48, .025, .025], [0, y + .19, .34], this.material(profile.trim, { metalness: .66, roughness: .3 }), [0, 0, 0], false);
        }
        const instanceTransform = new THREE.Object3D();
        booksByColor.forEach((books, colorIndex) => {
            if (!books.length) return;
            const instances = new THREE.InstancedMesh(
                new THREE.BoxGeometry(1, 1, 1),
                this.material(spineColors[colorIndex], { roughness: .68, metalness: .1 }),
                books.length
            );
            books.forEach((book, index) => {
                instanceTransform.position.set(book.x, book.y, -.18);
                instanceTransform.rotation.set(0, 0, book.rotation);
                instanceTransform.scale.set(book.width, book.height, .44);
                instanceTransform.updateMatrix();
                instances.setMatrixAt(index, instanceTransform.matrix);
            });
            instances.instanceMatrix.needsUpdate = true;
            instances.castShadow = true;
            instances.receiveShadow = true;
            shelf.add(instances);
        });
        return shelf;
    },

    buildLibrary(profile) {
        const root = this.environmentRoot;
        const wood = this.surface('wood', [profile.wood, 0x2a1d18, 0x765238], { roughness: .8 });
        const stone = this.surface('stone', [profile.stone, profile.floor, profile.background], { roughness: .85 });
        const gold = this.material(profile.trim, { metalness: .82, roughness: .24 });
        // Long shelf walls and upper galleries create depth and a true library aisle.
        this.addBox(root, [29, 11.5, .65], [0, 4.5, -15.3], stone);
        for (const side of [-1, 1]) {
            for (let bay = 0; bay < 3; bay++) this.addBookcase(root, side * 12.2, -11.7 + bay * 8.2, 7.2, profile);
            this.addBox(root, [.34, .22, 29], [side * 12.2, 5.85, -4.5], gold);
            this.addBox(root, [1.05, .18, 29], [side * 11.65, 5.55, -4.5], wood);
            for (let i = 0; i < 14; i++) {
                this.addBox(root, [.13, .72, .16], [side * (11.5 + (i % 2) * .3), 6.18, -15 + i * 1.62], gold);
            }
            this.addArch(root, side * 12, 6.05, -12.5, 2.6, stone, .28, true);
            for (const z of [-12, -3, 6]) {
                const ladder = new THREE.Group(); ladder.position.set(side * 8.25, -.9, z); ladder.rotation.y = side * .16; root.add(ladder);
                this.addBox(ladder, [.12, 5.4, .12], [-.58, 2.7, 0], wood);
                this.addBox(ladder, [.12, 5.4, .12], [.58, 2.7, 0], wood);
                for (let rung = 0; rung < 11; rung++) this.addBox(ladder, [1.18, .1, .1], [0, .45 + rung * .48, 0], gold, [0, 0, -.08], false);
            }
            for (let i = 0; i < 3; i++) this.addColumn(root, side * (9.2 + i * 2.7), -14.3, 10.4, .28, stone, gold, 8);
        }
        for (let i = -2; i <= 2; i++) this.addArch(root, i * 3.9, 7.1, -14.8, 2.08, gold, .18, true);
        this.addMosaicWindow(root, 0, 7.1, -14.88, 2.5, profile, 14);
        this.addBox(root, [23, .58, 1.5], [0, 10.2, -15.1], wood);
        // Suspended lanterns are aligned down the aisle, not scattered as floating decoration.
        for (let i = 0; i < 5; i++) {
            const z = 7 - i * 4.4;
            this.addBox(root, [.06, 1.05, .06], [0, 8.2, z], gold, [0, 0, .08], false);
            const lamp = this.addMesh(new THREE.OctahedronGeometry(.32, 1), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: .75 }), [0, 7.45, z], root, false);
            lamp.scale.y = 1.55;
            this.addPointLight(root, profile.keyLight, 8, 7, [0, 7.3, z]);
        }
    },

    buildUndersea(profile) {
        const root = this.environmentRoot;
        const coral = this.material(0x4f9f91, { roughness: .6, metalness: .18 });
        const coralLight = this.material(0xd37b8b, { roughness: .55, emissive: 0x46202c, emissiveIntensity: .22 });
        const pearl = this.material(0xc0eee5, { metalness: .42, roughness: .2, emissive: 0x4d9eaa, emissiveIntensity: .14 });
        // A vaulted abbey nave, faceted blue window and coral buttresses establish the underwater setting.
        this.addBox(root, [27, 10, .9], [0, 3.8, -15.1], this.surface('stone', [profile.stone, 0x173840, profile.background], { roughness: .64 }));
        for (let i = -2; i <= 2; i++) {
            const x = i * 4.9;
            this.addColumn(root, x, -12.8, 8.4, .56, this.surface('stone', [profile.stone, profile.floor, 0x24555c], { roughness: .6 }), pearl, 7);
            this.addArch(root, x, 5.3, -12.6, 2.3, pearl, .2, true);
        }
        this.addMosaicWindow(root, 0, 5.7, -14.58, 3.25, profile, 18);
        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const x = side * (11.5 + (i % 2) * 1.2), z = -8 + i * 7.5;
                const stem = this.addTube(root, [[x, -.6, z], [x - side * .55, 2.3, z], [x + side * .28, 5.2, z - .2], [x, 8.8, z]], .42, coral, 36, 9, false);
                for (let branch = 0; branch < 4; branch++) {
                    const a = branch * Math.PI / 2 + i * .5;
                    this.addTube(root, [[x, 3 + branch * .55, z], [x + Math.cos(a) * .85, 4.2 + branch * .4, z + Math.sin(a) * .5], [x + Math.cos(a) * 1.4, 6.1 + branch * .38, z + Math.sin(a) * .7]], .13, branch % 2 ? coralLight : coral, 18, 6, false);
                }
                for (let j = 0; j < 5; j++) {
                    const tip = this.addMesh(new THREE.SphereGeometry(.28 + (j % 2) * .1, 12, 9), j % 2 ? coralLight : pearl, [x + Math.sin(j * 2.2) * .8, 6.1 + j * .55, z + Math.cos(j * 2.2) * .5], root);
                    tip.scale.set(.75, 1.2, .75);
                }
            }
        }
        for (let i = 0; i < 14; i++) {
            const a = i * Math.PI * 2 / 14;
            const x = Math.cos(a) * (11.2 + (i % 3) * .35), z = Math.sin(a) * (11.2 + (i % 3) * .35);
            const frond = this.addTube(root, [[x, -.55, z], [x + Math.cos(a + .5), 2.1, z + Math.sin(a + .5)], [x + Math.cos(a + .85) * 1.4, 5.7, z + Math.sin(a + .85) * 1.2], [x + Math.cos(a + 1.1) * 1.8, 8.4, z + Math.sin(a + 1.1) * 1.7]], .075, this.material(i % 2 ? 0x62af8e : 0x438a79, { roughness: .68 }), 28, 6, false);
        }
        // Light beams are placed in front of the rose window and fade into water haze.
        for (let i = 0; i < 5; i++) {
            const beam = this.addMesh(new THREE.CylinderGeometry(.22, 1.6, 13, 16, 1, true), this.material(i % 2 ? 0x73d9d6 : 0x7aaee4, { transparent: true, opacity: .075, side: THREE.DoubleSide, emissive: 0x2b7c9b, emissiveIntensity: .35, depthWrite: false, roughness: .2 }), [-7 + i * 3.5, 4.7, -8.6], root, false);
            beam.rotation.z = (i - 2) * .1;
        }
        for (let i = 0; i < 15; i++) {
            const a = i * 2.4;
            const fish = new THREE.Group(); fish.position.set(Math.cos(a) * 10.8, 2.8 + (i % 5) * 1.05, Math.sin(a) * 10.8 - 3); fish.rotation.y = -a; root.add(fish);
            this.addMesh(new THREE.SphereGeometry(.22 + (i % 3) * .05, 12, 9), this.material(i % 2 ? 0x78cdd1 : 0xf2c97f, { metalness: .2, roughness: .35, emissive: 0x1d6870, emissiveIntensity: .15 }), [0, 0, 0], fish, false).scale.set(1.4, .72, .55);
            const tail = this.addMesh(new THREE.ConeGeometry(.16, .36, 4), pearl, [0, 0, -.32], fish, false); tail.rotation.x = Math.PI / 2;
            fish.userData.baseY = fish.position.y;
            this.animatedObjects.push({ object: fish, type: 'fish', offset: i * .7 });
        }
    },

    buildDesert(profile) {
        const root = this.environmentRoot;
        const sandstone = this.surface('stone', [profile.stone, 0x76503b, 0xb1875e], { roughness: .82 });
        const tile = this.material(0x315e68, { roughness: .36, metalness: .18, emissive: 0x0d2e3b, emissiveIntensity: .12 });
        const gold = this.material(profile.trim, { metalness: .82, roughness: .22 });
        this.addBox(root, [30, 9.5, .8], [0, 3.5, -15.4], sandstone);
        // Repeating horseshoe arcades frame a central sun disc; screened alcoves break up the masonry.
        const buildHorseshoe = (x, z, radius, baseY, material) => {
            const pts = [[-radius, 0, 0], [-radius, radius * .74, 0], [-radius * .88, radius * 1.22, 0], [-radius * .54, radius * 1.4, 0], [0, radius * 1.34, 0], [radius * .54, radius * 1.4, 0], [radius * .88, radius * 1.22, 0], [radius, radius * .74, 0]];
            this.addTube(root, pts.map(p => [p[0] + x, p[1] + baseY, p[2] + z]), .24, material, 56, 9, false);
            for (const side of [-1, 1]) {
                this.addColumn(root, x + side * radius, z, baseY + 5.5, .43, sandstone, gold, 8);
                this.addCylinder(root, .36, .52, .38, 8, [x + side * radius, baseY + .14, z], gold);
            }
        };
        for (let i = -2; i <= 2; i++) buildHorseshoe(i * 4.7, -13.8, 2.28, 3.1, i % 2 ? gold : sandstone);
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) buildHorseshoe(side * 12.3, -10 + i * 7.4, 2.3, 2.7, sandstone);
        this.addMosaicWindow(root, 0, 7.8, -14.92, 2.5, profile, 12);
        // A sunken reflecting basin occupies the rear axis beyond the play table.
        this.addBox(root, [8.4, .42, 3.5], [0, -.72, -10.5], sandstone);
        this.addBox(root, [7.3, .12, 2.5], [0, -.45, -10.5], this.material(0x142e38, { metalness: .48, roughness: .14, transparent: true, opacity: .88 }));
        for (const side of [-1, 1]) {
            this.addBox(root, [.34, .76, 3.5], [side * 4.05, -.29, -10.5], gold);
            for (let i = 0; i < 4; i++) {
                const jet = this.addMesh(new THREE.ConeGeometry(.15, .85 + (i % 2) * .2, 8), this.material(0x89d4d5, { transparent: true, opacity: .56, emissive: 0x276e76, emissiveIntensity: .3 }), [side * (1.2 + i * .55), -.02, -10.5], root, false);
                jet.scale.x = .55; jet.scale.z = .55;
            }
        }
        for (const side of [-1, 1]) {
            const screen = new THREE.Group(); screen.position.set(side * 11.25, 1.25, -2.5); root.add(screen);
            this.addBox(screen, [2.1, 4.6, .26], [0, 1.6, 0], sandstone);
            for (let i = -5; i <= 5; i++) {
                const lattice = this.addBox(screen, [.055, 4.3, .055], [i * .19, 1.6, .18], gold, [0, 0, .12], false);
                const cross = this.addBox(screen, [.055, 4.3, .055], [i * .19, 1.6, .2], gold, [0, 0, -.12], false);
            }
        }
        for (const side of [-1, 1]) {
            const palm = new THREE.Group(); palm.position.set(side * 14, -.85, 3); root.add(palm);
            this.addTube(palm, [[0, 0, 0], [side * .35, 2.5, 0], [side * .25, 5.8, .12], [0, 8.4, .2]], .3, this.surface('wood', [0x60432e, 0x382819, 0x94704b], { roughness: .9 }), 32, 8, false);
            for (let j = 0; j < 8; j++) {
                const a = j * Math.PI / 4;
                this.addTube(palm, [[0, 8.25, .2], [Math.cos(a) * 1.2, 8.85, .2 + Math.sin(a)], [Math.cos(a) * 2.7, 8.3, .4 + Math.sin(a) * 1.7]], .075, this.material(0x7e994b, { roughness: .9 }), 18, 5, false);
            }
        }
        for (let i = 0; i < 8; i++) {
            const obelisk = new THREE.Group(); obelisk.position.set(-9 + i * 2.55, -.65, -8.2); root.add(obelisk);
            this.addCylinder(obelisk, .5, .72, 3.3, 4, [0, 1.65, 0], sandstone);
            const point = this.addMesh(new THREE.ConeGeometry(.53, 1.05, 4), gold, [0, 3.78, 0], obelisk);
            point.rotation.y = Math.PI / 4;
            this.addBox(obelisk, [1.25, .22, 1.15], [0, .18, 0], gold);
        }
        for (let i = 0; i < 5; i++) {
            const rug = this.addMesh(new THREE.PlaneGeometry(1.5, 3.4), this.surface('cloth', [i % 2 ? 0x853d43 : 0x254e58, profile.trim, 0x351e29], { roughness: .9, side: THREE.DoubleSide }), [-6 + i * 3, -.66, 2.4], root, false);
            rug.rotation.x = -Math.PI / 2;
        }
    },

    buildMoon(profile) {
        const root = this.environmentRoot;
        const stone = this.surface('stone', [profile.stone, profile.floor, 0x303448], { roughness: .76 });
        const silver = this.material(profile.trim, { metalness: .76, roughness: .24 });
        const darkWood = this.surface('wood', [profile.wood, 0x24242d, 0x666050], { roughness: .75 });
        // A monumental ring-moon gate and its shadow are the unmistakable silhouette of this quiet courtyard.
        const gate = new THREE.Group(); gate.position.set(0, 4.1, -14.3); root.add(gate);
        this.addCylinder(gate, .48, .62, 7.7, 12, [-4.5, -.25, 0], stone);
        this.addCylinder(gate, .48, .62, 7.7, 12, [4.5, -.25, 0], stone);
        this.addBox(gate, [10.4, .5, 1.0], [0, 3.65, 0], darkWood);
        this.addBox(gate, [11.3, .36, 1.25], [0, 4.12, 0], silver);
        const ring = this.addMesh(new THREE.TorusGeometry(3.3, .22, 16, 96), silver, [0, 1.65, .15], gate);
        ring.scale.x = 1.05;
        const innerMoon = this.addMesh(new THREE.CircleGeometry(2.6, 48), this.material(0xa8c0ef, { emissive: 0x5b78ba, emissiveIntensity: .48, transparent: true, opacity: .32, side: THREE.DoubleSide }), [0, 1.65, -.05], gate, false);
        const crescent = this.addMesh(new THREE.TorusGeometry(2.18, .075, 8, 64, Math.PI * 1.48), this.material(0xf0e6bf, { emissive: 0x77724e, emissiveIntensity: .42, metalness: .32 }), [0, 1.65, .28], gate, false);
        crescent.rotation.z = -.55;
        // Torii gate pavilion and a restrained reflecting pool frame the back garden.
        for (const side of [-1, 1]) {
            this.addCylinder(root, .28, .42, 6.5, 12, [side * 10.7, 2.25, -10.3], darkWood);
            this.addBox(root, [1.25, .32, 1.0], [side * 10.7, 5.5, -10.3], silver);
        }
        this.addBox(root, [24, .4, 1.15], [0, 5.55, -10.3], darkWood);
        this.addBox(root, [25.2, .26, 1.4], [0, 5.85, -10.3], silver);
        this.addBox(root, [7.8, .38, 2.5], [0, -.73, -10.2], stone);
        this.addBox(root, [6.9, .09, 1.85], [0, -.48, -10.2], this.material(0x273d61, { metalness: .58, roughness: .12, transparent: true, opacity: .82 }));
        for (let i = -2; i <= 2; i++) {
            const stepping = this.addMesh(new THREE.DodecahedronGeometry(.9, 0), stone, [i * 2.15, -.63, -7.2 - (2 - Math.abs(i)) * .75], root);
            stepping.scale.set(1.35, .22, .9);
        }
        for (const side of [-1, 1]) {
            const lantern = new THREE.Group(); lantern.position.set(side * 11, -.55, 3); root.add(lantern);
            this.addBox(lantern, [.65, .18, .65], [0, .2, 0], silver);
            this.addBox(lantern, [.12, 1.65, .12], [0, 1.05, 0], darkWood);
            this.addBox(lantern, [.65, .14, .65], [0, 1.9, 0], silver);
            this.addBox(lantern, [.5, .52, .5], [0, 1.52, 0], this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: .48, transparent: true, opacity: .52 }));
            this.addPointLight(root, profile.keyLight, 8, 8, [side * 11, 1.6, 3]);
        }
        // Pruned moon pines keep the sky open and frame the gate symmetrically.
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
            const x = side * (12 + i * 1.6), z = -2 + i * 4;
            this.addTube(root, [[x, -.8, z], [x + side * .15, 2.7, z], [x - side * .18, 5.6, z - .1]], .16, darkWood, 24, 7, false);
            for (let level = 0; level < 3; level++) {
                const bough = this.addMesh(new THREE.DodecahedronGeometry(1.15, 0), this.material(0x4d665e, { roughness: .95 }), [x, 5 - level * 1.18, z], root);
                bough.scale.set(1.28, .22, .7);
            }
        }
        this.addPointLight(root, profile.accent, 18, 18, [0, 7, -13]);
    },

    buildForge(profile) {
        const root = this.environmentRoot;
        const basalt = this.surface('stone', [0x4b3934, 0x201a1b, 0x705046], { roughness: .95 });
        const iron = this.surface('metal', [0x524341, 0x251e20, profile.trim], { metalness: .86, roughness: .3 });
        const lava = this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: 1.4, roughness: .27 });
        // A real furnace mouth, flue and rib-vault anchor the forge; floor fissures lead toward the ritual table.
        this.addBox(root, [29, 12, .85], [0, 4.8, -15.5], basalt);
        const furnace = new THREE.Group(); furnace.position.set(0, 2.5, -14.65); root.add(furnace);
        this.addCylinder(furnace, 4.1, 4.65, 1.1, 16, [0, 0, 0], basalt);
        const mouth = this.addMesh(new THREE.CircleGeometry(3.45, 48), this.material(0x170d0b, { roughness: .2, emissive: 0x671e15, emissiveIntensity: .8 }), [0, .1, .61], furnace, false);
        const rim = this.addMesh(new THREE.TorusGeometry(3.7, .38, 16, 64), iron, [0, .1, .54], furnace);
        const innerGlow = this.addMesh(new THREE.TorusGeometry(2.65, .13, 10, 64), lava, [0, .1, .68], furnace, false);
        const fire = this.addMesh(new THREE.ConeGeometry(1.28, 3.2, 9), this.material(0xffa353, { emissive: 0xff4a1d, emissiveIntensity: 1.3, transparent: true, opacity: .86 }), [0, .7, .35], furnace, false);
        fire.scale.set(1.3, 1.25, .65);
        this.animatedObjects.push({ object: fire, type: 'flicker', offset: .8 });
        for (let i = 0; i < 3; i++) this.addCylinder(root, 1.2 - i * .13, 1.55 - i * .15, 2.2, 8, [0, 9.3 + i * 1.5, -16], basalt);
        for (const side of [-1, 1]) {
            for (let i = 0; i < 4; i++) {
                const x = side * (9.7 + (i % 2) * 3.1), z = -11 + Math.floor(i / 2) * 15;
                const pillar = this.addMesh(new THREE.DodecahedronGeometry(1.4, 1), basalt, [x, 3.5, z], root);
                pillar.scale.set(.8, 4.5 + (i % 2), .85);
                pillar.rotation.y = i * .42;
            }
            this.addTube(root, [[side * 14, 5.4, -13], [side * 10, 10.2, -13], [0, 12, -13]], .42, iron, 36, 10, false);
        }
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            this.addTube(root, [[Math.cos(a) * 14, -.55, Math.sin(a) * 14], [Math.cos(a) * 10.5, -.54, Math.sin(a) * 10.5], [Math.cos(a + .12) * 6.8, -.54, Math.sin(a + .12) * 6.8]], .1, lava, 24, 7, false);
        }
        // Forging stations are grouped on the side bays: anvils, quench troughs and suspended chain loops.
        for (const side of [-1, 1]) {
            const station = new THREE.Group(); station.position.set(side * 12.3, -.73, 1.4); root.add(station);
            this.addBox(station, [1.75, 1.3, 1.4], [0, .85, 0], basalt);
            this.addBox(station, [2.3, .42, 1.7], [0, 1.6, 0], iron);
            this.addBox(station, [1.3, .3, .85], [0, 1.95, 0], this.material(0x78716a, { metalness: .84, roughness: .22 }));
            this.addBox(station, [.85, .22, .52], [0, 2.19, 0], iron);
            this.addBox(station, [.34, 2.5, .34], [side * .8, 1.25, -.25], iron);
            const quench = this.addBox(station, [1.2, .48, 1.15], [side * -1.55, .45, .2], this.material(0x315258, { metalness: .55, roughness: .17 }));
            for (let link = 0; link < 9; link++) {
                const chain = this.addMesh(new THREE.TorusGeometry(.16, .045, 6, 12), iron, [side * 11.1, 9.2 - link * .63, -6.8], root, false);
                chain.rotation.x = link % 2 ? Math.PI / 2 : 0;
                chain.rotation.z = link * .12;
            }
            this.addPointLight(root, profile.accent, 15, 8, [side * 12, 3, 1.4]);
        }
        for (let i = 0; i < 5; i++) {
            const rib = this.addArch(root, -8 + i * 4, 5.4, -12 + i * 2.2, 6.5, iron, .3, false);
            rib.scale.y = .78;
        }
    },

    buildIce(profile) {
        const root = this.environmentRoot;
        const ice = this.surface('ice', [0x5b899f, 0x233b56, 0xa7d9e9], { roughness: .21, metalness: .2, transparent: true, opacity: .88 });
        const clear = this.material(0x9edbf0, { roughness: .12, metalness: .1, transparent: true, opacity: .38, emissive: 0x2a6eab, emissiveIntensity: .22, side: THREE.DoubleSide });
        const crystalMat = this.material(0x8ad4ee, { roughness: .18, metalness: .22, transparent: true, opacity: .78, emissive: 0x235c91, emissiveIntensity: .42 });
        // Faceted nave of blue ice, with cathedral ribs instead of conventional masonry.
        this.addBox(root, [28, 10.5, 1.15], [0, 4.1, -15.3], ice);
        for (let i = -2; i <= 2; i++) {
            const x = i * 4.9;
            // Faceted prism columns are assembled from r128-compatible octahedra.
            const column = this.addMesh(new THREE.OctahedronGeometry(1, 0), crystalMat, [x, 3.9, -13.2], root);
            column.scale.set(.9, 4.2, .9);
            const spike = this.addMesh(new THREE.ConeGeometry(.72, 3.2, 5), clear, [x, 7.3, -13.2], root);
            spike.rotation.y = i * .43;
            this.addArch(root, x, 5.1, -12.8, 2.35, clear, .3, true);
        }
        for (const side of [-1, 1]) {
            for (let i = 0; i < 6; i++) {
                const x = side * (10.8 + (i % 2) * 2.1), z = -13 + Math.floor(i / 2) * 8.3;
                const shard = this.addMesh(new THREE.OctahedronGeometry(1.3 + (i % 3) * .35, 0), crystalMat, [x, 2.5 + (i % 3) * .55, z], root);
                shard.scale.set(.75, 3.1 + (i % 3) * .7, .7);
                shard.rotation.set(.1 * i, .4 * i, (i % 2 ? .12 : -.14));
                const little = this.addMesh(new THREE.OctahedronGeometry(.65, 0), clear, [x + side * 1.2, 1.5, z + .2], root);
                little.scale.set(.55, 1.65, .5);
            }
        }
        for (let i = 0; i < 6; i++) {
            const stalactite = this.addMesh(new THREE.ConeGeometry(.62 + (i % 3) * .15, 3.1 + (i % 2) * 1.3, 5), crystalMat, [-10 + i * 4, 9.6, -14.2], root);
            stalactite.rotation.z = Math.PI;
            stalactite.rotation.x = (i - 2.5) * .04;
        }
        this.addMosaicWindow(root, 0, 6.2, -14.6, 2.8, profile, 16);
        // Fine luminous ribbons read as aurora in the icy roofline.
        for (let band = 0; band < 3; band++) {
            const points = [];
            for (let i = 0; i <= 16; i++) {
                const x = -15 + i * 1.9;
                points.push([x, 11.3 + Math.sin(i * .48 + band) * (1 + band * .36), -8 - band * 1.1]);
            }
            this.addTube(root, points, .09 - band * .015, this.material(band === 1 ? 0xc678d8 : profile.accent, { emissive: band === 1 ? 0x713c96 : profile.accent, emissiveIntensity: .8, transparent: true, opacity: .76 }), 56, 7, false);
        }
        this.addPointLight(root, profile.accent, 24, 17, [0, 8, -11]);
        this.addPointLight(root, 0x7db4ff, 15, 16, [-11, 6, -4]);
    },

    buildSky(profile) {
        const root = this.environmentRoot;
        const stone = this.surface('stone', [0x768987, 0x43585a, 0xb5aa80], { roughness: .72 });
        const wood = this.surface('wood', [profile.wood, 0x3b4638, 0x9a8152], { roughness: .78 });
        const gold = this.material(profile.trim, { metalness: .82, roughness: .22 });
        const grass = this.material(0x668454, { roughness: .96 });
        // Side isles, stepped causeways and hanging gardens establish a suspended landscape above the clouds.
        for (const side of [-1, 1]) {
            const island = new THREE.Group(); island.position.set(side * 16.7, 2.2, -8.5); island.rotation.y = side * .12; root.add(island);
            const rock = this.addMesh(new THREE.DodecahedronGeometry(5.2, 1), this.surface('stone', [0x586c6a, 0x334846, 0x81735d], { roughness: .95 }), [0, -.6, 0], island);
            rock.scale.set(1.5, .72, 1.18);
            const terrace = this.addCylinder(island, 4.1, 4.6, .45, 8, [0, 1.32, 0], grass);
            this.addCylinder(island, 3.75, 4.1, .3, 8, [0, 1.69, 0], stone);
            for (let i = 0; i < 5; i++) {
                const a = i * Math.PI * 2 / 5;
                const shrub = this.addMesh(new THREE.DodecahedronGeometry(.8 + (i % 2) * .2, 1), this.material(i % 2 ? 0x6c9a69 : 0x809b62, { roughness: .92 }), [Math.cos(a) * 3.3, 2.35, Math.sin(a) * 3.3], island);
                shrub.scale.set(1.2, .85, 1);
            }
            for (let i = 0; i < 5; i++) {
                const x = -2 + i;
                this.addTube(island, [[x, -.3, -1.8], [x + .2, -2.1, -1.9], [x - .15, -3.9, -2.4 - (i % 2)]], .055, this.material(0x7b9c70, { roughness: .9 }), 22, 5, false);
            }
            this.addPointLight(island, profile.accent, 8, 9, [0, 3.3, 0]);
        }
        // Suspended bridges connect the satellite isles to the central dais.
        for (const side of [-1, 1]) {
            for (let i = 0; i < 9; i++) {
                const x = side * (7.1 + i * 1.03);
                const y = .04 + Math.sin(i / 8 * Math.PI) * .55;
                this.addBox(root, [1.0, .24, 2.4], [x, y, -7.4], stone, [0, 0, side * .04]);
                this.addBox(root, [.08, .66, .08], [x, y + .42, -8.48], gold, [0, 0, .08], false);
                this.addBox(root, [.08, .66, .08], [x, y + .42, -6.32], gold, [0, 0, -.08], false);
            }
            this.addTube(root, [[side * 7, .75, -8.5], [side * 11, 1.15, -8.5], [side * 16, 2, -8.5]], .065, gold, 26, 5, false);
            this.addTube(root, [[side * 7, .75, -6.3], [side * 11, 1.15, -6.3], [side * 16, 2, -6.3]], .065, gold, 26, 5, false);
        }
        // Airy pergola: slender columns, carved capitals, beams and a slatted roof.
        for (const side of [-1, 1]) {
            for (const z of [-14.2, -10.2, -6.2]) this.addColumn(root, side * 8.7, z, 8.5, .28, stone, gold, 6);
        }
        for (let i = 0; i < 7; i++) this.addBox(root, [19, .24, .28], [0, 7.65, -15 + i * 1.65], wood, [0, .03, .02]);
        this.addBox(root, [19, .38, .46], [0, 7.3, -14.2], gold);
        this.addBox(root, [19, .38, .46], [0, 7.3, -6.2], gold);
        for (let i = 0; i < 3; i++) {
            const arch = this.addArch(root, 0, 5.4 + i * .55, -14.4 - i * .32, 5.1 - i * .35, i === 1 ? gold : stone, .13, false);
            arch.scale.y = .95;
        }
        const sun = this.addMesh(new THREE.SphereGeometry(2.45, 24, 18), this.material(0xf5d98d, { emissive: 0xe6a94c, emissiveIntensity: .45, roughness: .35 }), [0, 10.4, -16], root, false);
        for (const side of [-1, 1]) {
            for (let i = 0; i < 5; i++) {
                const a = i * .68 + .25;
                const vine = this.addTube(root, [[side * 8.7, 7.3, -14], [side * (8.1 + i * .3), 5.6, -11 + i], [side * (8 + i * .42), 3.2, -9 + i * 1.1], [side * (7.6 + i * .45), 1.2, -8 + i * 1.25]], .065, this.material(0x59835e, { roughness: .9 }), 28, 5, false);
                for (let leaf = 0; leaf < 3; leaf++) {
                    const flowerColor = leaf % 2 ? 0xd59ab3 : 0xe8d47e;
                    const flower = this.addMesh(new THREE.SphereGeometry(.19, 10, 8), this.material(flowerColor, { roughness: .42, emissive: flowerColor, emissiveIntensity: .12 }), [side * (8 + i * .36), 4.8 - leaf * 1.2, -11 + i + leaf * .5], root, false);
                    flower.scale.set(1.5, .58, .85);
                }
            }
        }
        // Downward rays mark the threshold between the airy pavilion and the cloud sea.
        for (let i = 0; i < 8; i++) {
            const cloud = this.addMesh(new THREE.SphereGeometry(2.2 + (i % 3) * .45, 14, 10), this.material(0xd5e3ec, { roughness: 1, transparent: true, opacity: .56 }), [-18 + i * 5.2, -1.5, -21 + (i % 2) * 4], root, false);
            cloud.scale.set(1.8, .48, .85);
        }
    },

    buildAtmosphere(profile) {
        const root = this.environmentRoot;
        const positions = [];
        const colors = [];
        const base = new THREE.Color(profile.particleTint);
        const count = this.lowPowerDevice ? 190 : 430;
        let state = profile.background >>> 0;
        const random = () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
        };
        for (let i = 0; i < count; i++) {
            let x = (random() - .5) * 54;
            let y = random() * 19 - 1;
            let z = (random() - .5) * 48;
            if (profile.particles === 'embers') y = random() * 13 - .5;
            if (profile.particles === 'bubbles') { y = random() * 17 - .5; x *= .74; }
            if (profile.particles === 'snow') { y = random() * 21 - 1; x *= .88; }
            positions.push(x, y, z);
            const tint = base.clone().lerp(new THREE.Color(profile.accent), random() * .34);
            colors.push(tint.r, tint.g, tint.b);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const size = profile.particles === 'embers' ? .095 : profile.particles === 'bubbles' ? .11 : .07;
        this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: profile.particles === 'dust' ? .62 : .78, depthWrite: false, sizeAttenuation: true }));
        root.add(this.particles);
        this.decorations.push(this.particles);
        this.animatedObjects.push({ object: this.particles, type: profile.particles, offset: 0 });
    },

    spawnHumanoidAvatars(num) {
        this.avatarMeshes.forEach(object => this.disposeObject(object));
        this.avatarMeshes = [];
        if (!this.environmentRoot) return;
        const profile = this.profile || this.environments[0];
        const robeColors = [0xb39256, 0x667fa4, 0x916b9b, 0x4f866f, 0xa86054, 0x638c94];
        const skinTones = [0xe8b890, 0x8b563d, 0xd59871, 0x6c4637, 0xf0c9a5, 0xb87857];
        const hairColors = [0x302026, 0x151724, 0x5a2f1d, 0x231713, 0xb68a42, 0x4c263d];
        for (let i = 0; i < num; i++) {
            const angle = (i / num) * Math.PI * 2 + Math.PI / 2;
            const x = Math.cos(angle) * 7.45;
            const z = Math.sin(angle) * 7.45;
            const player = typeof GameEngine !== 'undefined' && GameEngine.players && GameEngine.players[i];
            const isHuman = Boolean(player && !player.isBot);
            const robeColor = isHuman ? 0xc6a258 : robeColors[(i - 1 + robeColors.length) % robeColors.length];
            const accentColor = isHuman ? 0xffe194 : robeColors[(i + 2) % robeColors.length];
            const root = new THREE.Group();
            root.position.set(x, -.62, z);
            root.rotation.y = Math.atan2(-x, -z);
            root.userData.baseRotationY = root.rotation.y;
            root.userData.bobOffset = i * 1.7;
            root.userData.isHuman = isHuman;
            root.userData.playerIndex = i;
            this.environmentRoot.add(root);
            const body = new THREE.Group(); root.add(body);
            const robe = this.surface('cloth', [robeColor, profile.background, profile.stone], { roughness: .9 });
            const trim = this.material(accentColor, { metalness: .62, roughness: .29 });
            const skin = this.material(skinTones[i % skinTones.length], { roughness: .86 });
            const hair = this.surface('cloth', [hairColors[(i * 2 + 1) % hairColors.length], 0x1d1519, 0x4b332a], { roughness: .98 });
            const dark = this.material(0x1a151c, { roughness: .78 });
            const gold = this.material(profile.trim, { metalness: .82, roughness: .22 });
            // Layered robe, mantle, woven sash, sleeves and hands make a legible seated silhouette.
            this.addCylinder(body, .2, .72, 1.72, 20, [0, .86, 0], robe);
            const mantle = this.addMesh(new THREE.SphereGeometry(.83, 22, 15, 0, Math.PI * 2, .16, 1.32), robe, [0, 1.52, -.06], body);
            mantle.scale.set(1.12, .69, .68);
            const collar = this.addMesh(new THREE.TorusGeometry(.36, .09, 10, 28), trim, [0, 1.88, .04], body);
            collar.rotation.x = Math.PI / 2;
            this.addBox(body, [.15, 1.3, .97], [.18, .91, .2], gold, [0, 0, -.11], false);
            const belt = this.addMesh(new THREE.TorusGeometry(.48, .07, 8, 24), gold, [0, .63, 0], body, false);
            belt.rotation.x = Math.PI / 2;
            this.addMesh(new THREE.OctahedronGeometry(.16, 1), this.material(profile.accent, { emissive: profile.accent, emissiveIntensity: .52 }), [.18, .66, .47], body, false);
            for (const side of [-1, 1]) {
                const sleeve = this.addCylinder(body, .2, .24, .88, 14, [side * .65, 1.16, .05], robe);
                sleeve.rotation.z = side * .29;
                const cuff = this.addMesh(new THREE.TorusGeometry(.2, .05, 8, 20), gold, [side * .78, .79, .1], body, false);
                cuff.rotation.z = Math.PI / 2;
                this.addMesh(new THREE.SphereGeometry(.14, 14, 10), skin, [side * .8, .66, .15], body);
                const shoulder = this.addMesh(new THREE.SphereGeometry(.31, 16, 12), robe, [side * .58, 1.62, -.04], body);
                shoulder.scale.set(1.25, .72, .82);
            }
            this.addCylinder(body, .16, .19, .37, 16, [0, 1.99, .05], skin);
            const head = this.addMesh(new THREE.SphereGeometry(.39, 28, 22), skin, [0, 2.37, .05], body);
            head.scale.set(.84, 1.12, .92);
            for (const side of [-1, 1]) {
                this.addMesh(new THREE.SphereGeometry(.1, 12, 9), skin, [side * .32, 2.34, .04], body);
                this.addMesh(new THREE.SphereGeometry(.06, 12, 10), this.material(0xf4eade, { roughness: .45 }), [side * .135, 2.4, .377], body, false);
                this.addMesh(new THREE.SphereGeometry(.032, 10, 8), dark, [side * .135, 2.4, .43], body, false);
                const brow = this.addBox(body, [.14, .035, .045], [side * .14, 2.5, .37], hair, [0, 0, side * -.09], false);
                brow.rotation.z = side * -.08;
            }
            const nose = this.addMesh(new THREE.ConeGeometry(.07, .17, 8), skin, [0, 2.29, .42], body, false);
            nose.rotation.x = Math.PI / 2;
            this.addBox(body, [.12, .025, .025], [0, 2.17, .411], this.material(0x713f43, { roughness: .88 }), [0, 0, -.02], false);
            const hairCap = this.addMesh(new THREE.SphereGeometry(.4, 20, 14, 0, Math.PI * 2, 0, 1.08), hair, [0, 2.57, .01], body);
            hairCap.scale.set(.92, .92, .95);
            const backHair = this.addMesh(new THREE.SphereGeometry(.36, 16, 12), hair, [i % 2 ? .05 : -.08, 2.49, -.19], body);
            backHair.scale.set(.94, .65, .78);
            for (let braid = 0; braid < (i % 3 === 0 ? 2 : 1); braid++) {
                const side = braid === 0 ? (i % 2 ? -1 : 1) : -1;
                const braidMesh = this.addTube(body, [[side * .28, 2.45, -.12], [side * .37, 2.08, -.16], [side * .34, 1.77, -.12]], .075, hair, 16, 6, false);
                this.addMesh(new THREE.SphereGeometry(.095, 10, 8), gold, [side * .34, 1.79, -.1], body, false);
            }
            const circlet = this.addMesh(new THREE.TorusGeometry(.31, .035, 8, 24), gold, [0, 2.61, .02], body, false);
            circlet.rotation.x = .09;
            const jewel = this.addMesh(new THREE.OctahedronGeometry(.11, 1), this.material(profile.accent, { metalness: .4, emissive: profile.accent, emissiveIntensity: .85 }), [0, 2.7, .31], body, false);
            jewel.scale.set(.8, 1.4, .7);
            // A low, softly lit ring marks whose turn it is without obscuring the seat or table.
            const turnRing = this.addMesh(new THREE.TorusGeometry(1.04, .025, 7, 40), this.material(isHuman ? profile.trim : profile.accent, { emissive: isHuman ? profile.trim : profile.accent, emissiveIntensity: 0, transparent: true, opacity: .74 }), [0, -.53, 0], root, false);
            turnRing.rotation.x = Math.PI / 2;
            root.userData.turnRing = turnRing;
            root.userData.body = body;
            this.avatarMeshes.push(root);
        }
    },

    setActivePlayer(playerIdx) {
        this.avatarMeshes.forEach((avatar, index) => {
            const active = index === playerIdx;
            const ring = avatar.userData.turnRing;
            if (ring && ring.material) {
                ring.material.emissiveIntensity = active ? .92 : .04;
                ring.material.opacity = active ? .98 : .34;
            }
            avatar.userData.isActive = active;
        });
    },

    disposeObject(object) {
        if (!this.scene || !object) return;
        this.scene.remove(object);
        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();
        object.traverse(part => {
            if (part.geometry) geometries.add(part.geometry);
            if (part.material) (Array.isArray(part.material) ? part.material : [part.material]).forEach(material => {
                materials.add(material);
                ['map', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach(key => {
                    if (material[key]) textures.add(material[key]);
                });
            });
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        textures.forEach(texture => texture.dispose());
    },

    changeEnvironment(environment) {
        this.buildEnvironment(environment);
    },

    animate() {
        this.rafId = requestAnimationFrame(() => this.animate());
        if (!this.renderer || !this.scene || !this.camera) return;
        const time = this.clock ? this.clock.getElapsedTime() : 0;
        if (!this.reducedMotion) {
            if (this.particles) {
                const kind = this.profile && this.profile.particles;
                this.particles.rotation.y = time * (kind === 'embers' ? .012 : .004);
                if (kind === 'embers') this.particles.rotation.x = Math.sin(time * .12) * .025;
            }
            this.avatarMeshes.forEach(avatar => {
                avatar.position.y = -.62 + Math.sin(time * .72 + avatar.userData.bobOffset) * .025;
                avatar.rotation.y = avatar.userData.baseRotationY + Math.sin(time * .24 + avatar.userData.bobOffset) * .0015;
            });
            this.animatedObjects.forEach(({ object, type, offset }) => {
                if (!object) return;
                if (type === 'heart') {
                    object.rotation.y = time * .24;
                    object.position.y = .69 + Math.sin(time * 1.1) * .055;
                } else if (type === 'armillary') object.rotation.y = Math.sin(time * .12 + offset) * .2;
                else if (type === 'fish') object.position.y = object.userData.baseY + Math.sin(time * .65 + offset) * .12;
                else if (type === 'flicker') {
                    const baseY = object.userData.baseY || object.position.y;
                    object.scale.y = 1 + Math.sin(time * 11 + offset) * .08;
                    object.position.y = baseY + Math.sin(time * 9 + offset) * .025;
                }
            });
        }
        this.renderer.render(this.scene, this.camera);
    }
};
