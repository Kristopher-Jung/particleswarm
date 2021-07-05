import './style.css'
import * as THREE from 'three'
import * as dat from 'dat.gui'
// Canvas
const canvas = document.querySelector('canvas.webgl')
// Scene
const scene = new THREE.Scene()
// setting
let setting = {
    particleSpread: 100,
    particleSpeed: 0.005,
    nParticle: 25000,
    particleSize: 0.05
}
// Debug
const gui = new dat.GUI()
gui.add(setting, 'particleSpread').min(0).max(1000).step(100)
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(100, sizes.width / sizes.height, 0.001, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 50
scene.add(camera)
/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
/**
 * Mouse.
 */
const geometry = new THREE.SphereGeometry(0.1, 4, 4);
const material = new THREE.MeshBasicMaterial({color: 'red'});
material.transparent = true
material.opacity = 0;
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);
let mouse = {x: 0, y: 0, z: 0.5};
const onMouseMove = (event) => {
    // Update the mouse variable
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Make the sphere follow the mouse
    const vector = new THREE.Vector3(mouse.x, mouse.y, mouse.z);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    sphere.position.copy(pos);
};
document.addEventListener('mousemove', onMouseMove, false);

/**
 * Particles
 */
let particles, particleGeometry, particleMaterial;

function createParticles(count) {
    if (particles) {
        scene.remove(particles)
    }
    particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * setting.particleSpread
        colors[i] = Math.random()
    }
    particleGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
    )
    particleGeometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
    )

    particleMaterial = new THREE.PointsMaterial()
// particleMaterial.alphaMap = particleTexture
    particleMaterial.alphaTest = 0.001
    particleMaterial.depthTest = true
    particleMaterial.depthWrite = true
    // particleMaterial.blending = THREE.AdditiveBlending
    particleMaterial.transparent = true
    particleMaterial.size = setting.particleSize
    particleMaterial.sizeAttenuation = true
    particleMaterial.vertexColors = true
    particleMaterial.transparent = true
    particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)
}

gui.add(setting, 'particleSize').min(0.01).max(0.5)

/**
 * swarm
 * https://stackoverflow.com/questions/47733935/threejs-move-object-from-point-a-to-point-b
 */
// linear interpolation function
function lerp(a, b, t) {
    return a + (b - a) * t
}

function ease(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const rayCaster = new THREE.Raycaster();
/**
 * Animate
 */
let ts = [], dt = []
createParticles(setting.nParticle)
for (let i = 0; i < setting.nParticle; i++) {
    ts[i] = 0;
    dt[i] = setting.particleSpeed * Math.random()
}
gui.add(setting, 'nParticle').min(0).max(100000).step(1000).onChange(() => {
    for (let i = 0; i < setting.nParticle; i++) {
        ts[i] = 0;
        dt[i] = setting.particleSpeed * Math.random()
    }
    createParticles(setting.nParticle)
})
gui.add(setting, 'particleSpeed').min(0.001).max(0.1).step(0.001)
const tick = () => {
    for (let i = 0; i < setting.nParticle; i++) {
        ts[i] += dt[i]
        const i3 = i * 3
        const x = particleGeometry.attributes.position.array[i3]
        const y = particleGeometry.attributes.position.array[i3 + 1]
        const z = particleGeometry.attributes.position.array[i3 + 2]
        const newX = lerp(x, sphere.position.x, ease(ts[i]))
        const newY = lerp(y, sphere.position.y, ease(ts[i]))
        const newZ = lerp(z, sphere.position.z, ease(ts[i]))
        particleGeometry.attributes.position.array[i3] = newX
        particleGeometry.attributes.position.array[i3 + 1] = newY
        particleGeometry.attributes.position.array[i3 + 2] = newZ
    }
    particleMaterial.size = setting.particleSize
    // update the picking ray with the camera and mouse position
    rayCaster.setFromCamera(mouse, camera);
    // calculate objects intersecting the picking ray
    const intersects = rayCaster.intersectObjects(scene.children);
    for (let intersect of intersects) {
        const x = intersect.index;
        const y = intersect.index + 1;
        const z = intersect.index + 2;
        particleGeometry.attributes.position.array[x] = (Math.random() - 0.5) * setting.particleSpread;
        particleGeometry.attributes.position.array[y] = (Math.random() - 0.5) * setting.particleSpread;
        particleGeometry.attributes.position.array[z] = (Math.random() - 0.5) * setting.particleSpread;
        ts[intersect.index] = 0
    }
    particleGeometry.attributes.position.needsUpdate = true
    if(camera.position.x > 100) {
        camera.position.x = 0
    } else {
        camera.position.x += (sphere.position.x - camera.position.x) * 0.01;
    }
    if(camera.position.y > 100) {
        camera.position.y = 0
    } else {
        camera.position.y += (-sphere.position.y - camera.position.y) * 0.01;
    }
    camera.lookAt(scene.position);
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()