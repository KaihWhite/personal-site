export type CorridorSpawn =
  | 'hub-to-portfolio' | 'portfolio-to-hub'
  | 'hub-to-about'     | 'about-to-hub'
  | 'hub-to-contact'   | 'contact-to-hub';

export type SceneKey = 'HubRoom' | 'PortfolioRoom' | 'AboutRoom' | 'ContactRoom' | 'CorridorRoom';
export type ContentSceneKey = 'PortfolioRoom' | 'AboutRoom' | 'ContactRoom';

export const SCENE_TRANSITION_MS = 250;

export interface CorridorInitData {
  spawn: CorridorSpawn;
}

export interface CorridorSpawnInfo {
  spawnSide:        'hub' | 'content';     // which doorway the player spawns next to
  facing:           'left' | 'right';      // which way the player faces on spawn
  contentTargetKey: ContentSceneKey;       // which content room the content-side doorway leads to
  contentLabel:     string;                // text on the content-side doorway
  hubLabel:         string;                // text on the hub-side doorway (always 'return to hub')
}

const TARGET_BY_CONTENT: Record<string, ContentSceneKey> = {
  portfolio: 'PortfolioRoom',
  about:     'AboutRoom',
  contact:   'ContactRoom',
};

export function parseCorridorSpawn(spawn: CorridorSpawn): CorridorSpawnInfo {
  // Spawn names are always `<origin>-to-<destination>`. Either origin or destination is 'hub';
  // the other is one of 'portfolio' | 'about' | 'contact'.
  const [origin, , destination] = spawn.split('-');
  const content = origin === 'hub' ? destination : origin;
  const target = TARGET_BY_CONTENT[content!];
  if (!target) throw new Error(`unknown corridor spawn: ${spawn}`);

  const spawnSide: 'hub' | 'content' = origin === 'hub' ? 'hub' : 'content';
  const facing: 'left' | 'right' = origin === 'hub' ? 'right' : 'left';

  return {
    spawnSide,
    facing,
    contentTargetKey: target,
    contentLabel: `↑ enter ${content}`,
    hubLabel: '↑ return to hub',
  };
}
