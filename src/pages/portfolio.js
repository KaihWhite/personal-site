import React from 'react';

function Project({ title, description, imgPath, link }) {
    return (
        <div>
            <h2>{title}</h2>
            <p>{description}</p>
            <img src={imgPath} alt="project" onClick={window.open(link, '_blank')}/>
        </div>
    );
}

function Portfolio() {
    return (
        <div>
            <h1>Portfolio</h1>
            <p>My portfolio will go here.</p>
        </div>
    );

}

// portfolio page
export default function Portfolio() {
    return (
      <div className={styles.home}>
        <Head>
          <title>Kaih White's Portfolio</title>
          <meta name="description" content="Where I showcase my previous works." />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="icon" href="/THIS_IS_IT.png" />
        </Head>
  
        
        {/* If I turn the rotating wireframe cube into a component, I can use it here. */}
        {/* <div className={styles.cubeContainer}>
          <Canvas >
            <ambientLight />
            <Box />
          </Canvas>
        </div> */}
  
        <div style={{position: 'relative', display:'flex', width:'100vw', height:'100vh', justifyContent:'center', alignItems:'center'}}>
          <Portfolio />
        </div>
  
        <About />
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '2', flexDirection: 'row', padding: '10px'}}>
          <IconLink href="https://github.com/KaihWhite" iconPath="/github.png" />
          <IconLink href="https://www.linkedin.com/in/kaihwhite/" iconPath="/linkedin.png" />
        </div>
      </div>
    );
  }