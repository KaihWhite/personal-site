import { describe, it, expect } from 'vitest';
import { parseCorridorSpawn } from '@/game/scenes/corridorSpawn';

describe('parseCorridorSpawn', () => {
  it('parses hub-to-portfolio: spawn left, walk right, content side -> PortfolioRoom', () => {
    const r = parseCorridorSpawn('hub-to-portfolio');
    expect(r.spawnSide).toBe('hub');
    expect(r.facing).toBe('right');
    expect(r.contentTargetKey).toBe('PortfolioRoom');
    expect(r.contentLabel).toBe('↑ enter portfolio');
    expect(r.hubLabel).toBe('↑ return to hub');
  });

  it('parses portfolio-to-hub: spawn right, walk left', () => {
    const r = parseCorridorSpawn('portfolio-to-hub');
    expect(r.spawnSide).toBe('content');
    expect(r.facing).toBe('left');
    expect(r.contentTargetKey).toBe('PortfolioRoom');
  });

  it('parses hub-to-about', () => {
    const r = parseCorridorSpawn('hub-to-about');
    expect(r.spawnSide).toBe('hub');
    expect(r.contentTargetKey).toBe('AboutRoom');
    expect(r.contentLabel).toBe('↑ enter about');
  });

  it('parses about-to-hub', () => {
    const r = parseCorridorSpawn('about-to-hub');
    expect(r.spawnSide).toBe('content');
    expect(r.contentTargetKey).toBe('AboutRoom');
  });

  it('parses hub-to-contact', () => {
    const r = parseCorridorSpawn('hub-to-contact');
    expect(r.spawnSide).toBe('hub');
    expect(r.contentTargetKey).toBe('ContactRoom');
    expect(r.contentLabel).toBe('↑ enter contact');
  });

  it('parses contact-to-hub', () => {
    const r = parseCorridorSpawn('contact-to-hub');
    expect(r.spawnSide).toBe('content');
    expect(r.contentTargetKey).toBe('ContactRoom');
  });

  it('throws on an unknown spawn name', () => {
    expect(() => parseCorridorSpawn('bogus-to-nowhere' as never)).toThrow(/unknown corridor spawn/i);
  });
});
