import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_DIR = process.cwd();

describe('Milestone 1 (M1) Empirical Challenger Validation', () => {
  describe('Task 1: Splash Screen PNG File Integrity', () => {
    const splashSpecs = [
      { filename: 'apple-splash-1170-2532.png', width: 1170, height: 2532 },
      { filename: 'apple-splash-1179-2556.png', width: 1179, height: 2556 },
      { filename: 'apple-splash-1284-2778.png', width: 1284, height: 2778 },
      { filename: 'apple-splash-1290-2796.png', width: 1290, height: 2796 },
    ];

    for (const spec of splashSpecs) {
      it(`validates ${spec.filename} binary integrity, magic header, IHDR dimensions, and decompression`, () => {
        const filePath = path.join(ROOT_DIR, 'public/splash', spec.filename);
        expect(fs.existsSync(filePath), `File ${filePath} must exist`).toBe(true);

        const data = fs.readFileSync(filePath);
        expect(data.length).toBeGreaterThan(1000); // not empty or stub

        // PNG Magic header: 89 50 4e 47 0d 0a 1a 0a
        const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        expect(data.subarray(0, 8).equals(pngMagic), 'Must have valid PNG magic header').toBe(true);

        // Parse chunks
        let pos = 8;
        let foundIHDR = false;
        let foundIEND = false;
        const idatChunks: Buffer[] = [];

        while (pos < data.length) {
          const length = data.readUInt32BE(pos);
          const type = data.toString('ascii', pos + 4, pos + 8);
          const chunkData = data.subarray(pos + 8, pos + 8 + length);
          const crc = data.readUInt32BE(pos + 8 + length);

          // Verify CRC32
          const chunkTypeAndData = data.subarray(pos + 4, pos + 8 + length);
          const calcCrc = (zlib.crc32(chunkTypeAndData) >>> 0);
          expect(crc, `CRC mismatch for chunk ${type} in ${spec.filename}`).toBe(calcCrc);

          if (type === 'IHDR') {
            foundIHDR = true;
            const w = chunkData.readUInt32BE(0);
            const h = chunkData.readUInt32BE(4);
            const bitDepth = chunkData[8];
            const colorType = chunkData[9];
            expect(w, `Width must be ${spec.width}`).toBe(spec.width);
            expect(h, `Height must be ${spec.height}`).toBe(spec.height);
            expect(bitDepth).toBe(8);
            expect(colorType).toBe(2); // Truecolor RGB
          } else if (type === 'IDAT') {
            idatChunks.push(chunkData);
          } else if (type === 'IEND') {
            foundIEND = true;
          }

          pos += 12 + length;
        }

        expect(foundIHDR, 'Must contain valid IHDR chunk').toBe(true);
        expect(foundIEND, 'Must contain valid IEND chunk').toBe(true);
        expect(idatChunks.length).toBeGreaterThan(0);

        // Test decompression of raster data
        const compressed = Buffer.concat(idatChunks);
        const decompressed = zlib.inflateSync(compressed);
        const expectedBytes = (spec.width * 3 + 1) * spec.height; // RGB (3 bytes) + 1 filter byte per line
        expect(decompressed.length).toBe(expectedBytes);
      });
    }
  });

  describe('Task 2: Splash Screen Media Queries in index.html', () => {
    const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

    it('has all 4 apple-touch-startup-image links with exact iPhone 14 dimensions', () => {
      const expectedConfigs = [
        {
          file: 'apple-splash-1170-2532.png',
          width: 390,
          height: 844,
          dpr: 3,
        },
        {
          file: 'apple-splash-1179-2556.png',
          width: 393,
          height: 852,
          dpr: 3,
        },
        {
          file: 'apple-splash-1284-2778.png',
          width: 428,
          height: 926,
          dpr: 3,
        },
        {
          file: 'apple-splash-1290-2796.png',
          width: 430,
          height: 932,
          dpr: 3,
        },
      ];

      for (const config of expectedConfigs) {
        const escapedFile = config.file.replace(/\./g, '\\.');
        const linkRegex = new RegExp(
          `<link[^>]*rel="apple-touch-startup-image"[^>]*href="/splash/${escapedFile}"[^>]*>`,
          'i'
        );
        const match = htmlContent.match(linkRegex);
        expect(match, `Link tag for ${config.file} must be present`).not.toBeNull();

        const tag = match![0];
        expect(tag).toContain(`(device-width: ${config.width}px)`);
        expect(tag).toContain(`(device-height: ${config.height}px)`);
        expect(tag).toContain(`(-webkit-device-pixel-ratio: ${config.dpr})`);
        expect(tag).toContain('(orientation: portrait)');
      }
    });

    it('has correct viewport-fit=cover and iOS web app meta tags', () => {
      expect(htmlContent).toContain('viewport-fit=cover');
      expect(htmlContent).toContain('name="apple-mobile-web-app-capable" content="yes"');
      expect(htmlContent).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    });
  });

  describe('Task 3: Viewport, Overscroll, and Safe Area Rules in src/index.css', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');

    it('enforces 100dvh on html, body, and #root', () => {
      expect(cssContent).toMatch(/html\s*\{[^}]*min-height:\s*100dvh;/);
      expect(cssContent).toMatch(/body\s*\{[^}]*min-height:\s*100dvh;/);
      expect(cssContent).toMatch(/#root\s*\{[^}]*min-height:\s*100dvh;/);
    });

    it('enforces overscroll and overflow locking to prevent rubber-band bounce and horizontal shift', () => {
      expect(cssContent).toMatch(/html\s*\{[^}]*overscroll-behavior-y:\s*none;/);
      expect(cssContent).toMatch(/html\s*\{[^}]*overscroll-behavior-x:\s*none;/);
      expect(cssContent).toMatch(/html\s*\{[^}]*overflow-x:\s*hidden;/);
      expect(cssContent).toMatch(/html\s*\{[^}]*touch-action:\s*pan-y;/);

      expect(cssContent).toMatch(/body\s*\{[^}]*overscroll-behavior-y:\s*none;/);
      expect(cssContent).toMatch(/body\s*\{[^}]*overscroll-behavior-x:\s*none;/);
      expect(cssContent).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden;/);

      expect(cssContent).toMatch(/#root\s*\{[^}]*overflow-x:\s*hidden;/);
    });

    it('defines safe area insets and utility classes', () => {
      expect(cssContent).toContain('--sat: env(safe-area-inset-top, 0px);');
      expect(cssContent).toContain('--sab: env(safe-area-inset-bottom, 0px);');
      expect(cssContent).toContain('--sal: env(safe-area-inset-left, 0px);');
      expect(cssContent).toContain('--sar: env(safe-area-inset-right, 0px);');

      expect(cssContent).toContain('.pt-safe');
      expect(cssContent).toContain('.pb-safe');
      expect(cssContent).toContain('.pl-safe');
      expect(cssContent).toContain('.pr-safe');
    });

    it('ensures iOS bottom sheet uses dvh and accounts for safe-area-inset-top', () => {
      expect(cssContent).toMatch(/max-height:\s*calc\(82dvh\s*-\s*env\(safe-area-inset-top,\s*0px\)\)\s*!important/);
    });
  });

  describe('Task 4: Form Input 16px Font Size Rule', () => {
    const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');

    it('has font-size: 16px !important on input, textarea, select', () => {
      const match = cssContent.match(
        /input,\s*\n\s*textarea,\s*\n\s*select\s*\{([^}]*)\}/
      );
      expect(match, 'Selector input, textarea, select must exist').not.toBeNull();
      const rules = match![1];
      expect(rules).toContain('font-size: 16px !important;');
      expect(rules).toContain('user-select: auto;');
    });

    it('ensures no other stylesheet rule overrides font-size with !important below 16px', () => {
      // Find all !important font-size declarations across css files
      const fontSizeMatches = cssContent.match(/font-size:[^;]*!important/g) || [];
      for (const decl of fontSizeMatches) {
        expect(decl).toBe('font-size: 16px !important');
      }
    });

    it('verifies search inputs in codebase explicitly use text-base or larger font styling', () => {
      const homeSearch = fs.readFileSync(
        path.join(ROOT_DIR, 'src/components/HomeSearchLanding.tsx'),
        'utf-8'
      );
      expect(homeSearch).toContain('text-base sm:text-lg');

      const modalSearch = fs.readFileSync(
        path.join(ROOT_DIR, 'src/components/SearchModal.tsx'),
        'utf-8'
      );
      expect(modalSearch).toContain('text-base');
    });
  });
});
