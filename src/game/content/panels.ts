import type { PanelData } from '@/game/entities/Panel';

export const ABOUT_PANELS: PanelData[] = [
  {
    id: 'panel-bio',
    headline: 'who',
    body:
      'tinkerer who grew up on systems before my time. every system ' +
      'is a black box waiting to be emptied — started with modifying ' +
      'game code and reverse-engineering electric skateboards. ' +
      "didn't realize i was learning to read systems.",
  },
  {
    id: 'panel-stack',
    headline: 'stack',
    body:
      'lead engineer on a c++/opengl game engine; ' +
      'lead fullstack on a serverless aws cdk + python + react ' +
      'legal-services app; ' +
      'aws sde intern shipping cdk migrations of legacy services.',
  },
  {
    id: 'panel-interests',
    headline: 'interests',
    body:
      'graphics programming, hardware optimization, reverse engineering. ' +
      'fascinated by systems with non-obvious black-box behavior. ' +
      'always more to peel back.',
  },
];
