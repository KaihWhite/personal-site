import styles from './PortfolioContent.module.scss';

interface Project {
  description: string;
  imgPath: string;
  link: string;
}

const PROJECTS: Project[] = [
  {
    description:
      'Relevant skills: C++, Vulkan, Graphics Engineering, Hardware Optimization, Project Management',
    imgPath: '/Hephaestus_Engine_Logo.png',
    link: 'https://github.com/KaihWhite/HephaestusEngine',
  },
  {
    description:
      'Relevant skills: C++, OpenGL, Graphics Engineering, Game Engine Development, Software Architecture, Project Management',
    imgPath: '/Start_Your_Engine_Logo.jpeg',
    link: 'https://github.com/KaihWhite/Start-Your-Engine',
  },
  {
    description: 'Relevant skills: React, Three.js, Web Development, UI/UX Design',
    imgPath: '/THIS_IS_IT-long.png',
    link: 'https://github.com/KaihWhite/personal-site',
  },
];

export function PortfolioContent() {
  return (
    <section className={styles.section}>
      <h1 className={styles.heading}>Portfolio</h1>
      <p className={styles.lede}>Click on a project to see the source code on GitHub.</p>
      <div className={styles.cards}>
        {PROJECTS.map((project) => (
          <a
            key={project.link}
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
          >
            <img src={project.imgPath} alt="" />
            <div className={styles.cardBody}>
              <p className={styles.cardDescription}>{project.description}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
