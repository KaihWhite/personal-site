import styles from './AboutContent.module.scss';

interface Role {
  title: string;
  description: string;
  imgPath: string;
}

const ROLES: Role[] = [
  {
    title: 'Lead Engineer',
    description:
      'Created a game engine from the ground up using C++ and OpenGL while acting as the lead engineer for a team of 3. Greatly improved my understanding of graphics programming and optimizing for hardware.',
    imgPath: '/Start_Your_Engine_Logo.jpeg',
  },
  {
    title: 'Lead Fullstack Engineer',
    description:
      'Created an on-demand legal service web app to connect clients with lawyers anywhere in the US via video call. Acted as lead engineer for a team of 7 and used the AWS CDK to design a serverless architecture using Python and React.',
    imgPath: '/SpeedyLegalLogo.png',
  },
  {
    title: 'Software Development Engineer Intern',
    description:
      'Interned as a software development engineer on the AWS Customer Experience team and learned how to build cloud-native applications using AWS services. Specifically, I worked on migrating a legacy AWS feature to a serverless architecture using the AWS CDK and JavaScript.',
    imgPath: '/AWS_logo.png',
  },
];

export function AboutContent() {
  return (
    <section className={styles.section}>
      <h1 className={styles.heading}>About</h1>

      <div className={styles.bioBlock}>
        <img className={styles.bioImage} src="/me.PNG" alt="Kaih White" />
        <p className={styles.bioText}>
          I am a tinkerer who grew up on systems that were before my time and got to see the
          information revolution unfold before my eyes. Every system has always been a magical black
          box waiting to have its contents emptied. It all started with modifying game code to find
          exploits and disassembling electric skateboards to replace components for friends. I
          didn&apos;t realize it, but I was practicing my ability to understand systems and reverse
          engineer them. My fascination with systems and solutions only grows with every opportunity
          I have to work on complex topics and diverse problems.
        </p>
      </div>

      <h2 className={styles.heading}>Work Experience</h2>
      {ROLES.map((role) => (
        <div key={role.title} className={styles.roleBlock}>
          <h3 className={styles.roleTitle}>{role.title}</h3>
          <img className={styles.roleImage} src={role.imgPath} alt="" />
          <p className={styles.roleDescription}>{role.description}</p>
        </div>
      ))}
    </section>
  );
}
