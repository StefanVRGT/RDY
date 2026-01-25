import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('PWA Manifest', () => {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  let manifest: Record<string, unknown>;

  beforeAll(() => {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  });

  it('exists in public directory', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('has required name field', () => {
    expect(manifest.name).toBeDefined();
    expect(typeof manifest.name).toBe('string');
    expect((manifest.name as string).length).toBeGreaterThan(0);
  });

  it('has required short_name field', () => {
    expect(manifest.short_name).toBeDefined();
    expect(typeof manifest.short_name).toBe('string');
    expect((manifest.short_name as string).length).toBeGreaterThan(0);
    expect((manifest.short_name as string).length).toBeLessThanOrEqual(12);
  });

  it('has start_url set to root', () => {
    expect(manifest.start_url).toBe('/');
  });

  it('has display mode set to standalone', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('has background_color defined', () => {
    expect(manifest.background_color).toBeDefined();
    expect(typeof manifest.background_color).toBe('string');
  });

  it('has theme_color defined', () => {
    expect(manifest.theme_color).toBeDefined();
    expect(typeof manifest.theme_color).toBe('string');
  });

  it('has icons array with required sizes', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    const icons = manifest.icons as Array<{ sizes: string }>;
    expect(icons.length).toBeGreaterThan(0);

    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('has scope defined', () => {
    expect(manifest.scope).toBe('/');
  });

  it('has orientation set to portrait', () => {
    expect(manifest.orientation).toBe('portrait-primary');
  });

  it('icons have maskable purpose', () => {
    const icons = manifest.icons as Array<{ purpose: string }>;
    const hasMaskable = icons.some((icon) =>
      icon.purpose?.includes('maskable')
    );
    expect(hasMaskable).toBe(true);
  });
});

describe('Service Worker', () => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');

  it('exists in public directory', () => {
    expect(fs.existsSync(swPath)).toBe(true);
  });

  it('has install event handler', () => {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain("addEventListener('install'");
  });

  it('has activate event handler', () => {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain("addEventListener('activate'");
  });

  it('has fetch event handler', () => {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain("addEventListener('fetch'");
  });

  it('defines cache name', () => {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('CACHE_NAME');
  });
});
