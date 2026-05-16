#!/usr/bin/env python3
"""
Generates test images for Symbolic Ritual development.
Outputs to symbolicritual/test-assets/ and prints a seed snippet
you can paste into the browser DevTools console.
"""

import os
import json
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), 'test-assets')
os.makedirs(OUT_DIR, exist_ok=True)

ITEMS = [
    {
        'filename': '01-landscape.png',
        'width': 1920, 'height': 1080,
        'color': (180, 160, 130),  # warm sand
        'captured_at': '2026-05-16T11:09',
        'lat': -33.8688, 'lng': 151.2093,
        'alt': 'Wide landscape, warm sand tones',
        'caption': 'The light arrived before the sound did.',
        'lang': 'en',
    },
    {
        'filename': '02-portrait.png',
        'width': 1080, 'height': 1920,
        'color': (130, 150, 180),  # cool blue
        'captured_at': '2026-05-14T07:33',
        'lat': 51.5074, 'lng': -0.1278,
        'alt': 'Tall portrait, cool blue tones',
        'caption': None,
        'lang': 'en',
    },
    {
        'filename': '03-square.png',
        'width': 1080, 'height': 1080,
        'color': (160, 140, 180),  # soft violet
        'captured_at': '2026-05-10T18:02',
        'lat': 34.0522, 'lng': -118.2437,
        'alt': 'Square frame, soft violet tones',
        'caption': 'الضوء وصل قبل أن يصل الصوت.',
        'lang': 'ar',
    },
    {
        'filename': '04-ultrawide.png',
        'width': 2560, 'height': 800,
        'color': (140, 180, 150),  # muted green
        'captured_at': '2026-05-08T06:15',
        'lat': 48.8566, 'lng': 2.3522,
        'alt': 'Ultra-wide panoramic, muted green tones',
        'caption': 'Horizon as threshold.',
        'lang': 'en',
    },
    {
        'filename': '05-tall.png',
        'width': 600, 'height': 1800,
        'color': (200, 160, 140),  # terracotta
        'captured_at': '2026-05-05T14:45',
        'lat': 40.7128, 'lng': -74.0060,
        'alt': 'Very tall narrow frame, terracotta tones',
        'caption': None,
        'lang': 'en',
    },
]


def make_png(width, height, r, g, b):
    """Generate a minimal flat-color PNG without Pillow."""
    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    # Build raw scanlines: filter byte 0x00 + RGB pixels
    row = b'\x00' + bytes([r, g, b] * width)
    raw = row * height
    idat = chunk(b'IDAT', zlib.compress(raw, 6))
    iend = chunk(b'IEND', b'')

    return signature + ihdr + idat + iend


seed_items = []

for i, item in enumerate(ITEMS, start=1):
    path = os.path.join(OUT_DIR, item['filename'])
    png = make_png(item['width'], item['height'], *item['color'])
    with open(path, 'wb') as f:
        f.write(png)
    print(f"  {item['filename']}  {item['width']}x{item['height']}")

    seed_items.append({
        'id': i,
        'media_type': 'image',
        'media_url': f'http://localhost:8765/symbolicritual/test-assets/{item["filename"]}',
        'alt': item['alt'],
        'captured_at': item['captured_at'],
        'lat': item['lat'],
        'lng': item['lng'],
        'caption': item['caption'],
        'lang': item['lang'],
        'width': item['width'],
        'height': item['height'],
    })

print()
print('Paste this into the browser DevTools console on the symbolicritual page:')
print()
print('(async () => {')
print('  const ITEMS = ' + json.dumps(seed_items, indent=2) + ';')
print("""
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('symbolic-ritual-db', 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('items')) {
        const store = d.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        store.createIndex('captured_at', 'captured_at', { unique: false });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  for (const item of ITEMS) store.put(item);
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  console.log('Seeded. Reloading...');
  location.reload();
})();""")
