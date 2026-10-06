import { describe, expect, it } from 'vitest';
import { PLACE_GLYPHS } from '@danbro96/lupira-domain-maps/placeGlyph';
import { glyphSvg } from './placeGlyphImages';

describe('glyphSvg', () => {
  it.each(PLACE_GLYPHS)('%s is a well-formed SVG with at least one self-closed path', (glyph) => {
    const svg = glyphSvg(glyph, '#0b0b0b');
    const tags = svg.match(/<path\b[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((t) => t.endsWith('/>'))).toBe(true);
    expect(svg).toMatch(/^<svg [^>]*>.*<\/svg>$/);
    expect(svg).not.toContain('<style');
  });
});
