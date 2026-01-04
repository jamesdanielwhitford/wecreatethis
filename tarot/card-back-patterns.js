// Card back procedural pattern generators
// Each pattern creates a unique design per card using the card index as a seed

const CARD_BACK_STYLES = {
    diamond: {
        name: 'Diamond',
        description: 'Classic card back pattern'
    },
    water: {
        name: 'Water',
        description: 'Blue water ripple patterns'
    },
    spiral: {
        name: 'Spiral',
        description: 'Galactic spiral pattern'
    }
};

// Seeded random number generator for consistent patterns
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Generate classic diamond pattern (like traditional playing cards)
function generateDiamondPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Deep red background
    ctx.fillStyle = '#8B0000'; // Dark red
    ctx.fillRect(0, 0, 300, 450);

    // Diamond pattern created by intersecting diagonal lines
    const spacing = 30; // Distance between parallel lines
    const lineWidth = 2;

    ctx.strokeStyle = '#000000'; // Black lines
    ctx.lineWidth = lineWidth;

    // Draw diagonal lines going down-right (/)
    // Need enough lines to cover corners - start well before 0 and go past width
    const numDiagonals1 = Math.ceil((300 + 450) / spacing) + 2;
    for (let i = -20; i < numDiagonals1; i++) {
        const startX = i * spacing;
        const startY = 0;
        const endX = startX + 450;
        const endY = 450;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Draw diagonal lines going down-left (\)
    // Need to extend further in both directions to cover all corners
    for (let i = -20; i < numDiagonals1 + 10; i++) {
        const startX = i * spacing;
        const startY = 0;
        const endX = startX - 450;
        const endY = 450;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    return canvas.toDataURL();
}

// Generate cymatics pattern (Chladni plate / vibrational patterns)
function generateCymaticsPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 300, 450);

    const imageData = ctx.createImageData(300, 450);
    const data = imageData.data;

    const centerX = 150;
    const centerY = 225;

    // Frequency parameters - vary per card, using lower frequencies for larger shapes
    const seed = cardIndex * 47.3;
    const freqX = 3 + Math.floor(seededRandom(seed) * 4); // 3-6 Hz
    const freqY = 3 + Math.floor(seededRandom(seed + 1) * 4); // 3-6 Hz
    const phase = seededRandom(seed + 2) * Math.PI * 2;

    // Generate Chladni-like standing wave pattern with emphasis on geometric shapes
    for (let y = 0; y < 450; y++) {
        for (let x = 0; x < 300; x++) {
            // Normalize coordinates to [-1, 1]
            const normX = (x - centerX) / 150;
            const normY = (y - centerY) / 225;

            // Primary Chladni standing wave
            const waveX = Math.cos(freqX * Math.PI * normX + phase);
            const waveY = Math.cos(freqY * Math.PI * normY + phase * 0.7);
            const standingWave = waveX * waveY;

            // Radial component for circular/star patterns
            const dist = Math.sqrt(normX * normX + normY * normY);
            const angle = Math.atan2(normY, normX);

            // Combine radial and angular modes for more geometric shapes
            const radialFreq = Math.floor(seededRandom(seed + 3) * 3) + 3; // 3-5
            const angularFreq = Math.floor(seededRandom(seed + 4) * 3) + 3; // 3-5

            const radialWave = Math.cos(dist * radialFreq * Math.PI * 2);
            const angularWave = Math.cos(angle * angularFreq + phase);

            // Combine modes - emphasizing different components per card
            const modeSelect = cardIndex % 4;
            let value;

            if (modeSelect === 0) {
                // Grid-based patterns
                value = standingWave;
            } else if (modeSelect === 1) {
                // Radial patterns (circles)
                value = radialWave * 0.7 + standingWave * 0.3;
            } else if (modeSelect === 2) {
                // Star/flower patterns
                value = (radialWave * angularWave) * 0.7 + standingWave * 0.3;
            } else {
                // Complex combined
                value = standingWave * 0.4 + radialWave * 0.3 + (radialWave * angularWave) * 0.3;
            }

            // Sharp threshold to create distinct geometric regions
            // Values near zero create the nodal lines (where particles accumulate)
            const threshold = 0.05; // Very narrow band for sharp lines
            let color;

            if (Math.abs(value) < threshold) {
                // Nodal line - black
                color = 0;
            } else {
                // Anti-node - white
                color = 255;
            }

            const index = (y * 300 + x) * 4;
            data[index] = color;     // R
            data[index + 1] = color; // G
            data[index + 2] = color; // B
            data[index + 3] = 255;   // A
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add slight blur to smooth the lines
    ctx.filter = 'blur(1px)';
    ctx.drawImage(canvas, 0, 0);

    return canvas.toDataURL();
}

// Generate water element pattern using noise-based ripple displacement
function generateWaterPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(300, 450);
    const data = imageData.data;

    // Use card index as seed for unique pattern
    const seed = cardIndex * 73.5;
    const scale = 0.015 + (cardIndex % 3) * 0.005;

    // Generate ripple centers
    const rippleCount = 2 + (cardIndex % 3);
    const rippleCenters = [];
    for (let i = 0; i < rippleCount; i++) {
        const s = cardIndex * 37 + i * 123;
        rippleCenters.push({
            x: 100 + seededRandom(s) * 100,
            y: 150 + seededRandom(s + 1) * 150,
            strength: 0.3 + seededRandom(s + 2) * 0.3
        });
    }

    // Generate water ripple pattern pixel by pixel
    for (let y = 0; y < 450; y++) {
        for (let x = 0; x < 300; x++) {
            // Combine multiple noise octaves for natural water texture
            let displacement = 0;
            let amplitude = 1;
            let frequency = scale;

            // Base turbulent noise
            for (let i = 0; i < 3; i++) {
                displacement += smoothNoise(x * frequency, y * frequency, seed + i * 50) * amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }

            // Add ripple distortions from each center
            let rippleValue = 0;
            rippleCenters.forEach(center => {
                const dx = x - center.x;
                const dy = y - center.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Create concentric ripple waves
                const rippleFreq = 0.08 + seededRandom(seed + center.x) * 0.04;
                const ripple = Math.sin(dist * rippleFreq + displacement * 2) * center.strength;

                // Fade ripples with distance
                const falloff = Math.exp(-dist * 0.005);
                rippleValue += ripple * falloff;
            });

            // Combine base noise with ripple distortion
            let value = displacement * 0.3 + rippleValue * 0.7;

            // Normalize and map to grayscale
            value = (value + 1) / 2; // Map from [-1,1] to [0,1]

            // Enhance contrast for more visible ripples
            value = Math.pow(value, 0.8);

            // Convert to blue-tinted grayscale for water effect
            const brightness = Math.floor(value * 255);
            const index = (y * 300 + x) * 4;

            // Blue-cyan water tones
            data[index] = brightness * 0.6;      // R - less red
            data[index + 1] = brightness * 0.8;  // G - moderate green
            data[index + 2] = brightness;        // B - full blue
            data[index + 3] = 255;               // A
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Generate earth element pattern - planet surface terrain
function generateEarthPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(300, 450);
    const data = imageData.data;

    const seed = cardIndex * 91.3;
    const scale = 0.008 + (cardIndex % 3) * 0.003;

    // Generate planetary terrain with elevation-based coloring
    for (let y = 0; y < 450; y++) {
        for (let x = 0; x < 300; x++) {
            let elevation = 0;
            let amplitude = 1;
            let frequency = scale;

            // Multi-octave terrain generation
            for (let i = 0; i < 6; i++) {
                elevation += smoothNoise(x * frequency, y * frequency, seed + i * 50) * amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }

            // Normalize elevation to 0-1
            elevation = (elevation + 1) / 2;

            const index = (y * 300 + x) * 4;

            // Elevation-based coloring like Earth from space
            if (elevation < 0.5) {
                // Deep ocean - dark blue (70% of planet is water)
                const depth = elevation / 0.5;
                data[index] = Math.floor(5 + depth * 20);      // R: 5-25
                data[index + 1] = Math.floor(20 + depth * 50); // G: 20-70
                data[index + 2] = Math.floor(60 + depth * 80); // B: 60-140
            } else if (elevation < 0.52) {
                // Coastal waters - lighter blue
                const t = (elevation - 0.5) / 0.02;
                data[index] = Math.floor(25 + t * 30);
                data[index + 1] = Math.floor(70 + t * 60);
                data[index + 2] = Math.floor(140 + t * 40);
            } else if (elevation < 0.7) {
                // Lowlands - lush green vegetation
                const t = (elevation - 0.52) / 0.18;
                data[index] = Math.floor(20 + t * 40);   // R: 20-60
                data[index + 1] = Math.floor(80 + t * 60);  // G: 80-140
                data[index + 2] = Math.floor(20 + t * 40);   // B: 20-60
            } else if (elevation < 0.85) {
                // Highlands - darker green/brown
                const t = (elevation - 0.7) / 0.15;
                data[index] = Math.floor(60 + t * 40);
                data[index + 1] = Math.floor(90 + t * 40);
                data[index + 2] = Math.floor(40 + t * 20);
            } else {
                // High mountains - very dark blue/gray (like deep ocean trenches)
                const t = (elevation - 0.85) / 0.15;
                data[index] = Math.floor(10 + t * 30);
                data[index + 1] = Math.floor(25 + t * 40);
                data[index + 2] = Math.floor(70 + t * 50);
            }

            data[index + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Generate fire element pattern - lava/magma flow
function generateFirePattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(300, 450);
    const data = imageData.data;

    const seed = cardIndex * 83.7;
    const scale = 0.01;

    // Generate lava flow pattern
    for (let y = 0; y < 450; y++) {
        for (let x = 0; x < 300; x++) {
            // Base flowing noise pattern
            let flow = 0;
            let amplitude = 1;
            let frequency = scale;

            for (let i = 0; i < 5; i++) {
                flow += smoothNoise(x * frequency, y * frequency * 0.7, seed + i * 35) * amplitude;
                amplitude *= 0.5;
                frequency *= 2.3;
            }

            // Add directional flow (slight downward/sideways drift like lava)
            const flowX = smoothNoise(x * 0.005, y * 0.003, seed + 200);
            const flowY = smoothNoise(x * 0.003, y * 0.005, seed + 300);
            flow += (flowX + flowY) * 0.3;

            // Create veins/cracks pattern for cooled lava crust
            const crackNoise = Math.abs(smoothNoise(x * 0.03, y * 0.03, seed + 400));
            const isCrack = crackNoise < 0.15;

            // Normalize flow
            flow = (flow + 1) / 2;

            const index = (y * 300 + x) * 4;

            if (isCrack) {
                // Dark cooled crust/cracks
                data[index] = Math.floor(20 + flow * 40);
                data[index + 1] = Math.floor(10 + flow * 20);
                data[index + 2] = Math.floor(5 + flow * 10);
            } else {
                // Molten lava - temperature-based coloring
                if (flow > 0.75) {
                    // Hottest - bright yellow-white
                    const heat = (flow - 0.75) / 0.25;
                    data[index] = 255;
                    data[index + 1] = Math.floor(220 + heat * 35);
                    data[index + 2] = Math.floor(100 + heat * 100);
                } else if (flow > 0.5) {
                    // Hot - yellow-orange
                    const heat = (flow - 0.5) / 0.25;
                    data[index] = Math.floor(240 + heat * 15);
                    data[index + 1] = Math.floor(140 + heat * 80);
                    data[index + 2] = Math.floor(20 + heat * 80);
                } else if (flow > 0.3) {
                    // Medium - orange-red
                    const heat = (flow - 0.3) / 0.2;
                    data[index] = Math.floor(200 + heat * 40);
                    data[index + 1] = Math.floor(60 + heat * 80);
                    data[index + 2] = Math.floor(10 + heat * 10);
                } else {
                    // Cooling - dark red
                    const heat = flow / 0.3;
                    data[index] = Math.floor(100 + heat * 100);
                    data[index + 1] = Math.floor(20 + heat * 40);
                    data[index + 2] = Math.floor(10 + heat * 10);
                }
            }

            data[index + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Generate air element pattern - clouds against blue sky
function generateAirPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(300, 450);
    const data = imageData.data;

    const seed = cardIndex * 67.1;
    const scale = 0.006;

    // Generate cloud patterns
    for (let y = 0; y < 450; y++) {
        for (let x = 0; x < 300; x++) {
            // Multi-octave noise for cloud density
            let cloudDensity = 0;
            let amplitude = 1;
            let frequency = scale;

            for (let i = 0; i < 5; i++) {
                // Horizontal stretch for wind-swept clouds
                cloudDensity += Math.abs(smoothNoise(x * frequency * 2, y * frequency, seed + i * 45)) * amplitude;
                amplitude *= 0.5;
                frequency *= 2.1;
            }

            // Add wispy details at higher frequency
            const wisp = Math.abs(smoothNoise(x * 0.04, y * 0.03, seed + 300)) * 0.3;
            cloudDensity += wisp;

            // Normalize cloud density
            cloudDensity = Math.min(1, cloudDensity);

            // Create distinct cloud shapes with threshold - higher threshold = less clouds, more sky
            const cloudThreshold = 0.92 + seededRandom(seed + x * 0.01 + y * 0.01) * 0.05;
            const isCloud = cloudDensity > cloudThreshold;

            const index = (y * 300 + x) * 4;

            if (isCloud) {
                // White clouds with slight variation and depth
                const depth = (cloudDensity - cloudThreshold) / (1 - cloudThreshold);
                const brightness = 0.85 + depth * 0.15;

                data[index] = Math.floor(brightness * 255);
                data[index + 1] = Math.floor(brightness * 255);
                data[index + 2] = Math.floor(brightness * 255);
            } else {
                // Blue sky - gradient from lighter at horizon to deeper blue above
                const skyDepth = y / 450;

                // Vibrant sky blue gradient
                data[index] = Math.floor(70 - skyDepth * 40);       // R: 70 -> 30
                data[index + 1] = Math.floor(150 - skyDepth * 30);  // G: 150 -> 120
                data[index + 2] = Math.floor(255 - skyDepth * 40);  // B: 255 -> 215
            }

            data[index + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Generate spiral galaxy pattern (white spiral on black)
function generateSpiralPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 300, 450);

    const centerX = 150;
    const centerY = 225;

    // Spiral parameters vary per card
    const armCount = 2 + (cardIndex % 3); // 2-4 spiral arms
    const rotation = seededRandom(cardIndex) * Math.PI * 2; // Random starting rotation
    const tightness = 0.15 + seededRandom(cardIndex + 100) * 0.1; // Spiral tightness
    const spread = 0.3 + seededRandom(cardIndex + 200) * 0.2; // How wide the arms spread

    // Draw multiple spiral arms
    for (let arm = 0; arm < armCount; arm++) {
        const armAngle = (Math.PI * 2 / armCount) * arm + rotation;

        // Draw particles along the spiral arm
        const particleCount = 800 + cardIndex * 10;
        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount;
            const angle = armAngle + t * Math.PI * 6; // How many rotations
            const distance = t * 180 * (1 + spread); // Distance from center

            // Add some randomness to particle position for organic look
            const noise = seededRandom(cardIndex * 1000 + arm * 100 + i);
            const offsetAngle = (noise - 0.5) * 0.5;
            const offsetDist = (seededRandom(cardIndex * 1000 + arm * 100 + i + 1) - 0.5) * 20;

            const finalAngle = angle + offsetAngle;
            const finalDist = distance + offsetDist;

            const x = centerX + Math.cos(finalAngle) * finalDist;
            const y = centerY + Math.sin(finalAngle) * finalDist;

            // Skip if outside canvas
            if (x < 0 || x > 300 || y < 0 || y > 450) continue;

            // Particle size and opacity decrease with distance
            const size = (1 - t) * 2.5 + 0.5;
            const opacity = (1 - t * 0.7) * (0.6 + noise * 0.4);

            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Add bright core
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGradient;
    ctx.fillRect(centerX - 30, centerY - 30, 60, 60);

    // Add some scattered stars in background
    const starCount = 30 + (cardIndex % 15);
    for (let i = 0; i < starCount; i++) {
        const seed = cardIndex * 500 + i;
        const x = seededRandom(seed) * 300;
        const y = seededRandom(seed + 1) * 450;

        // Don't place stars too close to center
        const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distFromCenter < 80) continue;

        const size = seededRandom(seed + 2) * 1.5 + 0.3;
        const opacity = seededRandom(seed + 3) * 0.4 + 0.3;

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas.toDataURL();
}

// Perlin-like noise function for terrain generation
function noise2D(x, y, seed) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

// Smooth noise using interpolation
function smoothNoise(x, y, seed) {
    const intX = Math.floor(x);
    const intY = Math.floor(y);
    const fracX = x - intX;
    const fracY = y - intY;

    const v1 = noise2D(intX, intY, seed);
    const v2 = noise2D(intX + 1, intY, seed);
    const v3 = noise2D(intX, intY + 1, seed);
    const v4 = noise2D(intX + 1, intY + 1, seed);

    const i1 = v1 * (1 - fracX) + v2 * fracX;
    const i2 = v3 * (1 - fracX) + v4 * fracX;

    return i1 * (1 - fracY) + i2 * fracY;
}

// Generate terrain noise pattern (black and white)
function generateNoisePattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(300, 450);
    const data = imageData.data;

    // Use card index as seed for unique but consistent pattern
    const seed = cardIndex * 137.5;
    const scale = 0.02 + (cardIndex % 5) * 0.005; // Vary scale per card
    const octaves = 4;

    for (let y = 0; y < 450; y++) {
        for (let x = 0; x < 300; x++) {
            let value = 0;
            let amplitude = 1;
            let frequency = scale;
            let maxValue = 0;

            // Combine multiple octaves for more interesting terrain
            for (let i = 0; i < octaves; i++) {
                value += smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
                maxValue += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }

            // Normalize to 0-1 range
            value = value / maxValue;

            // Apply threshold for sharper black/white contrast
            const threshold = 0.5 + (seededRandom(cardIndex + 500) * 0.2 - 0.1);
            const color = value > threshold ? 255 : 0;

            const index = (y * 300 + x) * 4;
            data[index] = color;     // R
            data[index + 1] = color; // G
            data[index + 2] = color; // B
            data[index + 3] = 255;   // A
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Generate geometric pattern (sacred geometry)
function generateGeometricPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0d001a';
    ctx.fillRect(0, 0, 300, 450);

    // Center point
    const centerX = 150;
    const centerY = 225;

    // Draw concentric circles and lines
    const layers = 5 + (cardIndex % 4);
    for (let i = 0; i < layers; i++) {
        const seed = cardIndex * 100 + i;
        const radius = 30 + i * 25 + seededRandom(seed) * 20;
        const opacity = 0.3 - (i * 0.04);

        ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Add radial lines
        const lineCount = 6 + (cardIndex % 6);
        for (let j = 0; j < lineCount; j++) {
            const angle = (Math.PI * 2 / lineCount) * j + seededRandom(cardIndex) * 0.5;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.stroke();
        }
    }

    // Add small symbols in corners
    const cornerSize = 20 + seededRandom(cardIndex) * 10;
    const corners = [[30, 30], [270, 30], [30, 420], [270, 420]];
    corners.forEach((corner, idx) => {
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(corner[0], corner[1], cornerSize, 0, Math.PI * 2);
        ctx.stroke();
    });

    return canvas.toDataURL();
}

// Generate floral pattern
function generateFloralPattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#1a0033';
    ctx.fillRect(0, 0, 300, 450);

    // Draw flowers
    const flowerCount = 8 + (cardIndex % 5);
    for (let i = 0; i < flowerCount; i++) {
        const seed = cardIndex * 50 + i;
        const x = seededRandom(seed) * 300;
        const y = seededRandom(seed + 1) * 450;
        const petalCount = 5 + Math.floor(seededRandom(seed + 2) * 3);
        const petalSize = 15 + seededRandom(seed + 3) * 15;
        const opacity = seededRandom(seed + 4) * 0.2 + 0.15;

        // Draw petals
        for (let p = 0; p < petalCount; p++) {
            const angle = (Math.PI * 2 / petalCount) * p;
            const petalX = x + Math.cos(angle) * petalSize * 0.7;
            const petalY = y + Math.sin(angle) * petalSize * 0.7;

            ctx.fillStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.beginPath();
            ctx.ellipse(petalX, petalY, petalSize * 0.4, petalSize * 0.8, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center of flower
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, petalSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add vines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.lineWidth = 2;
    for (let v = 0; v < 3; v++) {
        const seed = cardIndex * 10 + v;
        ctx.beginPath();
        ctx.moveTo(seededRandom(seed) * 300, 0);
        for (let s = 0; s < 10; s++) {
            const x = seededRandom(seed + s * 2) * 300;
            const y = (450 / 10) * (s + 1);
            ctx.quadraticCurveTo(
                seededRandom(seed + s * 2 + 1) * 300,
                y - 22,
                x,
                y
            );
        }
        ctx.stroke();
    }

    return canvas.toDataURL();
}

// Generate wave pattern
function generateWavePattern(cardIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    gradient.addColorStop(0, '#0d001a');
    gradient.addColorStop(1, '#1a0033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 450);

    // Draw flowing waves
    const waveCount = 6 + (cardIndex % 4);
    for (let w = 0; w < waveCount; w++) {
        const seed = cardIndex * 20 + w;
        const yOffset = (450 / waveCount) * w;
        const amplitude = 20 + seededRandom(seed) * 30;
        const frequency = 0.01 + seededRandom(seed + 1) * 0.02;
        const opacity = 0.15 + seededRandom(seed + 2) * 0.1;

        ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
        ctx.lineWidth = 2 + seededRandom(seed + 3) * 2;
        ctx.beginPath();

        for (let x = 0; x <= 300; x += 2) {
            const y = yOffset + Math.sin(x * frequency + seededRandom(seed + 4) * 10) * amplitude;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    // Add dots along waves
    for (let d = 0; d < 30; d++) {
        const seed = cardIndex * 100 + d;
        const x = seededRandom(seed) * 300;
        const y = seededRandom(seed + 1) * 450;
        const size = seededRandom(seed + 2) * 3 + 1;
        const opacity = seededRandom(seed + 3) * 0.3 + 0.2;

        ctx.fillStyle = `rgba(139, 92, 246, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas.toDataURL();
}

// Generate classic solid pattern
function generateClassicPattern() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 300, 450);

    return canvas.toDataURL();
}

// Main function to generate card back pattern
function generateCardBackPattern(styleId, cardIndex) {
    switch(styleId) {
        case 'diamond':
            return generateDiamondPattern(cardIndex);
        case 'water':
            return generateWaterPattern(cardIndex);
        case 'spiral':
            return generateSpiralPattern(cardIndex);
        default:
            return generateDiamondPattern(cardIndex);
    }
}

// Get current card back style from localStorage
function getCurrentCardBackStyle() {
    return localStorage.getItem('tarot-card-back-style') || 'diamond';
}

// Set card back style in localStorage
function setCardBackStyle(styleId) {
    localStorage.setItem('tarot-card-back-style', styleId);
}
