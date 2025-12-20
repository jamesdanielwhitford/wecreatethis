#!/usr/bin/env python3
"""Generate contour flow pattern icon for PWA"""

from PIL import Image
import math
import random

# Settings from user
CONTOUR_COUNT = 10
LINE_THICKNESS = 10
FLOW_SCALE = 100
TURBULENCE = 1
SIZE = 512  # Will generate 512x512, can resize later

# Colors (e-reader theme)
BG_COLOR = (232, 230, 224)  # #e8e6e0
LINE_COLOR = (90, 74, 58)   # #5a4a3a

# Random offset for variation
offset_x = random.random() * 10000
offset_y = random.random() * 10000

def random_2d(x, y):
    n = math.sin(x * 12.9898 + y * 78.233 + offset_x) * 43758.5453
    return n - math.floor(n)

def noise(x, y):
    i = math.floor(x)
    j = math.floor(y)
    f = x - i
    g = y - j

    a = random_2d(i, j)
    b = random_2d(i + 1, j)
    c = random_2d(i, j + 1)
    d = random_2d(i + 1, j + 1)

    u = f * f * (3 - 2 * f)
    v = g * g * (3 - 2 * g)

    return (a * (1 - u) * (1 - v) +
            b * u * (1 - v) +
            c * (1 - u) * v +
            d * u * v)

def fbm(x, y, octaves):
    value = 0
    amplitude = 0.5
    frequency = 1

    for _ in range(octaves):
        value += amplitude * noise(x * frequency, y * frequency)
        frequency *= 2
        amplitude *= 0.5

    return value

def get_height(x, y):
    base_noise = fbm(x / FLOW_SCALE, y / FLOW_SCALE, TURBULENCE)

    # Add warping
    warp_x = fbm((x + 100) / (FLOW_SCALE * 0.5), y / (FLOW_SCALE * 0.5), 3) * 50
    warp_y = fbm(x / (FLOW_SCALE * 0.5), (y + 100) / (FLOW_SCALE * 0.5), 3) * 50

    warped_noise = fbm((x + warp_x) / FLOW_SCALE, (y + warp_y) / FLOW_SCALE, TURBULENCE)

    return (base_noise + warped_noise * 0.5) * 0.5

def generate_icon():
    # Create height map
    resolution = 2
    width = SIZE // resolution
    height = SIZE // resolution

    height_map = []
    min_h, max_h = float('inf'), float('-inf')

    for y in range(height):
        row = []
        for x in range(width):
            h = get_height(x * resolution, y * resolution)
            row.append(h)
            min_h = min(min_h, h)
            max_h = max(max_h, h)
        height_map.append(row)

    # Normalize
    for y in range(height):
        for x in range(width):
            height_map[y][x] = (height_map[y][x] - min_h) / (max_h - min_h)

    # Create image
    img = Image.new('RGB', (SIZE, SIZE), BG_COLOR)
    pixels = img.load()

    # Fill based on contour bands
    for py in range(SIZE):
        for px in range(SIZE):
            hx = px // resolution
            hy = py // resolution

            if hx < width and hy < height:
                height_value = height_map[hy][hx]
                band = int(height_value * CONTOUR_COUNT)

                if band % 2 == 1:
                    pixels[px, py] = LINE_COLOR

    # Save different sizes
    img.save('icon-512.png')
    img.resize((192, 192), Image.LANCZOS).save('icon-192.png')
    img.resize((180, 180), Image.LANCZOS).save('apple-touch-icon.png')

    print("Generated: icon-512.png, icon-192.png, apple-touch-icon.png")

if __name__ == '__main__':
    generate_icon()
