// Biodentic — 3D hero: a stylised molar that spins on its own and tilts with the pointer.
(function () {
  var container = document.querySelector('.hero-visual');
  if (!container || typeof THREE === 'undefined') return;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-3d-canvas';
  container.insertBefore(canvas, container.firstChild);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.1, 6.2);

  function size() {
    var w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Lighting — soft studio setup
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 15;
  key.shadow.radius = 6;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x5eead4, 1.1);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  var fill = new THREE.PointLight(0x14b8a6, 0.6, 12);
  fill.position.set(-2, -1, 3);
  scene.add(fill);

  // Tooth group — crown (rounded lathe) + three tapered roots
  var tooth = new THREE.Group();

  var pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  });

  // Crown: lathe profile revolved around Y for a smooth molar-like bulge
  var profile = [
    new THREE.Vector2(0.0, 1.35),
    new THREE.Vector2(0.62, 1.28),
    new THREE.Vector2(0.92, 1.0),
    new THREE.Vector2(1.0, 0.55),
    new THREE.Vector2(0.88, 0.08),
    new THREE.Vector2(0.55, -0.1),
    new THREE.Vector2(0.0, -0.16),
  ];
  var crownGeo = new THREE.LatheGeometry(profile, 48);
  var crown = new THREE.Mesh(crownGeo, pearlMat);
  crown.castShadow = true;
  crown.receiveShadow = true;
  tooth.add(crown);

  // Occlusal groove ring for a bit of dental detail
  var grooveGeo = new THREE.TorusGeometry(0.5, 0.035, 10, 32);
  var grooveMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe9e7, roughness: 0.5 });
  var groove = new THREE.Mesh(grooveGeo, grooveMat);
  groove.rotation.x = Math.PI / 2;
  groove.position.y = 1.3;
  tooth.add(groove);

  // Roots — tapered cones fanned out from the base
  var rootMat = new THREE.MeshPhysicalMaterial({ color: 0xf3f0e8, roughness: 0.45 });
  var rootAngles = [-0.42, 0, 0.42];
  rootAngles.forEach(function (a) {
    var rootGeo = new THREE.ConeGeometry(0.24, 1.7, 16);
    var root = new THREE.Mesh(rootGeo, rootMat);
    root.position.set(Math.sin(a) * 0.42, -1.0, Math.cos(a) * 0.15);
    root.rotation.z = a * 0.55;
    root.castShadow = true;
    tooth.add(root);
  });

  tooth.scale.setScalar(0.95);
  scene.add(tooth);

  // Soft contact shadow (fake AO) beneath the tooth
  var shadowTex = (function () {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(10,31,46,0.35)');
    g.addColorStop(1, 'rgba(10,31,46,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  var shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.85;
  scene.add(shadowPlane);

  // Pointer interaction — subtle tilt on top of continuous auto-rotation
  var pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  container.addEventListener('pointermove', function (e) {
    var r = container.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointerY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  container.addEventListener('pointerleave', function () { pointerX = 0; pointerY = 0; });

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);

    if (!reduceMotion) tooth.rotation.y += dt * 0.5;

    targetX += (pointerY * 0.28 - targetX) * 0.06;
    targetY += (pointerX * 0.4 - targetY) * 0.06;
    tooth.rotation.x = targetX;
    camera.position.x += (pointerX * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (1.1 - pointerY * 0.3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.1, 0);

    renderer.render(scene, camera);
  }

  var ro = new ResizeObserver(size);
  ro.observe(container);
  size();
  animate();
})();
