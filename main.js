import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let currentQuestion = null;

const loader = new GLTFLoader();
// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xD3D3D3); // Set background color to white

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;


// Create renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(window.innerWidth, window.innerHeight);

let fruits = [];
const gravity = -9.8; // m/s^2
const initialSpeed = 12; // m/s (reduced by 40% from 20)
const projectionAngle = Math.PI / 2.5; // 60 degrees in radians
const spawnInterval = 4000; // ms (4 seconds)

function makeTextSprite( message, parameters )
    {
        if ( parameters === undefined ) parameters = {};
        var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Courier New";
        var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
        var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
        var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
        var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:0, g:0, b:255, a:1.0 };
        var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;
        var metrics = context.measureText( message );
        var textWidth = metrics.width;

        context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
        context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
        context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
        context.fillText( message, borderThickness, fontsize + borderThickness);

        var texture = new THREE.Texture(canvas) 
        texture.needsUpdate = true;
        var spriteMaterial = new THREE.SpriteMaterial( { map: texture} );
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
        return sprite;  
    }

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

function loadFruit(modelPath) {
    return new Promise((resolve, reject) => {
        loader.load(modelPath, (gltf) => {
            const fruit = {
                model: gltf.scene,
                velocity: new THREE.Vector3(
                    initialSpeed * Math.cos(projectionAngle),
                    initialSpeed * Math.sin(projectionAngle),
                    0
                ),
                position: new THREE.Vector3(-9, -9, 0)
            };
            fruit.model.position.copy(fruit.position);
            fruit.model.visible = false;
            scene.add(fruit.model);
            resolve(fruit);
        }, undefined, reject);
    });
}

// Load fruit models
Promise.all([
    loadFruit('./models/fruit1.glb'),
    loadFruit('./models/fruit2.glb'),
    loadFruit('./models/fruit3.glb'),
    loadFruit('./models/fruit4.glb')
]).then(loadedFruits => {
    fruits = loadedFruits;
    console.log("All fruits loaded");
    spawnFruit();
}).catch(error => {
    console.error('An error occurred while loading the models:', error);
});

let currentFruitIndex = 0;
let lastSpawnTime = 0;

function spawnFruit() {
    const currentTime = Date.now();
    if (currentTime - lastSpawnTime < spawnInterval) {
        setTimeout(spawnFruit, spawnInterval - (currentTime - lastSpawnTime));
        return;
    }

    if (fruits.length > 0 && currentQuestion) {
        const fruit = fruits[currentFruitIndex];
        fruit.position.set(-5, -4.5, 0);
        fruit.velocity.set(
            initialSpeed * Math.cos(projectionAngle),
            initialSpeed * Math.sin(projectionAngle),
            0
        );
        fruit.model.position.copy(fruit.position);
        fruit.model.visible = true;

        // Assign question option to the fruit's text sprite
        const optionIndex = currentFruitIndex % currentQuestion.options.length;
        const optionText = `${String.fromCharCode(65 + optionIndex)}: ${currentQuestion.options[optionIndex]}`;
        const textSprite = makeTextSprite(optionText, {
            fontsize: 14,
            borderColor: { r: 255, g: 0, b: 0, a: 1.0 },
            backgroundColor: { r: 255, g: 255, b: 255, a: 0.8 }
        });
        textSprite.position.set(1, -3, 0); // Position the sprite above the fruit
        
        // Remove any existing text sprites
        fruit.model.children = fruit.model.children.filter(child => !(child instanceof THREE.Sprite));
        fruit.model.add(textSprite);

        currentFruitIndex = (currentFruitIndex + 1) % fruits.length;
        lastSpawnTime = currentTime;
    }
    setTimeout(spawnFruit, spawnInterval);
}

function updateFruitPhysics(delta) {
    fruits.forEach(fruit => {
        if (fruit.model.visible) {
            fruit.velocity.y += gravity * delta;
            fruit.position.x += fruit.velocity.x * delta;
            fruit.position.y += fruit.velocity.y * delta;
            fruit.model.position.copy(fruit.position);

            if (fruit.position.y < -7 || fruit.position.x > 7) {
                fruit.model.visible = false;
            }
        }
    });
}

// Add these variables near the top of the file
let raycaster, mouse;
let raycasterLine;

// Add this function to create the raycaster line
function createRaycasterLine() {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 1000)
    ]);
    raycasterLine = new THREE.Line(geometry, material);
    scene.add(raycasterLine);
}

// Modify the existing window.addEventListener('click', ...) function
window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Update raycaster line
    const rayOrigin = raycaster.ray.origin;
    const rayDirection = raycaster.ray.direction;
    raycasterLine.geometry.setFromPoints([
        rayOrigin,
        rayOrigin.clone().add(rayDirection.multiplyScalar(1000))
    ]);
    raycasterLine.geometry.attributes.position.needsUpdate = true;
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    console.log('Click detected, intersects:', intersects);
    checkFruitClick(intersects);
});

// Modify the animate function
function animate(time) {
    animationId = requestAnimationFrame(animate);
    
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    
    updateFruitPhysics(delta);
    
    // Update raycaster line position
    if (raycasterLine) {
        raycaster.setFromCamera(mouse, camera);
        const rayOrigin = raycaster.ray.origin;
        const rayDirection = raycaster.ray.direction;
        raycasterLine.geometry.setFromPoints([
            rayOrigin,
            rayOrigin.clone().add(rayDirection.multiplyScalar(1000))
        ]);
        raycasterLine.geometry.attributes.position.needsUpdate = true;
    }
    
    renderer.render(scene, camera);
}

// Add this near the bottom of the file, before the animate() call
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();
createRaycasterLine();

// Add this event listener near the bottom of the file, before the animate function
window.addEventListener('questionUpdated', (event) => {
    console.log('questionUpdated event received');
    currentQuestion = event.detail;
    if (currentQuestion.question === '\r') {
        endGame();
        return;
    }
    console.log('Current question set:', currentQuestion.question);
    // Reset currentFruitIndex to ensure options start from the beginning
    currentFruitIndex = 0;
    // Respawn fruits with new question options
    fruits.forEach(fruit => {
        fruit.model.visible = false;
    });
    spawnFruit();
});

let score = 0;
console.log('questionUpdated event listener added');

let questionCount = 0;
const totalQuestions = 10; // Assuming there are 10 questions in total

function checkFruitClick(intersects) {
    console.log('Checking fruit click, currentQuestion:', currentQuestion);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log('Clicked object:', clickedObject);
        
        const fruitIndex = fruits.findIndex(fruit => fruit.model === clickedObject || fruit.model.getObjectById(clickedObject.id));
        console.log('Fruit index:', fruitIndex);
        
        if (fruitIndex !== -1) {
            if (currentQuestion) {
                const optionIndex = fruitIndex % currentQuestion.options.length;
                const clickedOption = String.fromCharCode(65 + optionIndex);
                console.log('Clicked option:', clickedOption, 'Correct answer:', currentQuestion.correctAnswer);
                
                const cleanCorrectAnswer = currentQuestion.correctAnswer.trim();

                if (clickedOption === cleanCorrectAnswer) {
                    score += 10;
                    console.log("Correct! Score:", score);
                } else {
                    score -= 5;
                    console.log("Incorrect. Score:", score);
                }
                
                updateScoreDisplay();
            }
            
            // Display next question
            if (!window.displayNextQuestion()) {
                endGame();
            }
        }
    }
}

function endGame() {
    cancelAnimationFrame(animationId);
    window.score = score; // Make sure the score is accessible to the popup
    window.showPlayAgainPopup();
}

// Remove the showPlayAgainPopup function from main.js as it's now in index.html

// ... rest of the existing code ...

let animationId;

// ... rest of the existing code ...

// Add this function near the top of the file, after the other function declarations
function createScoreOverlay() {
    const scoreOverlay = document.createElement('div');
    scoreOverlay.id = 'score-overlay';
    scoreOverlay.style.position = 'absolute';
    scoreOverlay.style.top = '10px';
    scoreOverlay.style.right = '20px';
    scoreOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    scoreOverlay.style.padding = '10px';
    scoreOverlay.style.borderRadius = '5px';
    scoreOverlay.style.fontFamily = 'Arial, sans-serif';
    scoreOverlay.style.fontSize = '18px';
    scoreOverlay.style.fontWeight = 'bold';
    document.body.appendChild(scoreOverlay);
}

function updateScoreDisplay() {
    const scoreOverlay = document.getElementById('score-overlay');
    if (scoreOverlay) {
        scoreOverlay.textContent = `Score: ${score}`;
    }
}

// Add this near the bottom of the file, before the animate() call
createScoreOverlay();
updateScoreDisplay();

// // Animation loop
 let lastTime = 0;
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});