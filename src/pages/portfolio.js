import React from 'react';
import Head from 'next/head';
import Menu from '../components/Menu';
import Footer from '../components/Footer';

function Project({ description, imgPath, link }) {
  
      return (
          <a href={link} target="_blank" rel="noopener noreferrer" style={{marginTop: '64px', border: '2px solid white', borderRadius: '5px', backgroundColor: '#ffffff'}}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <img src={imgPath} alt="project" style={{maxWidth: '300px', width: '100%', height: '100%', }}/>
                <div style={{maxWidth: '500px', height: 'auto', paddingTop: '1%', backgroundColor: '#ffffff'}}>
                  <p style={{fontSize: '20px', textAlign: 'center', color: '#000000', padding: '0 5px'}}>{description}</p>
                </div>
              </div>
          </a>
      );
  }

export default function Portfolio() {
    return (
        <div style={{background: 'solid black', minHeight: '100vh'}}>
            <Head>
                <title>Kaih's Portfolio</title>
                <meta name="description" content="Welcome to Kaih's portfolio." />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/THIS_IS_IT.png" />
            </Head>
            <Menu />
            <div style={{paddingTop: '64px', width: '100%', alignItems: 'center', position: 'relative'}}>
                <h1 style={{textAlign: 'center', position: 'relative'}}>Portfolio</h1>
                <p style={{fontSize: '20px', textAlign: 'center', position: 'relative', maxWidth: '1000px', margin: 'auto', padding: '16px 5% 0 5%'}}>
                    Click on a project to see the source code on GitHub.
                </p>
            </div>

            <div style={{ width: '100%', alignItems: 'center', position: 'relative', paddingLeft: '5%', paddingRight: '5%', display: 'flex', flexDirection: 'column'}}>
                <Project
                    description="Relevant skills: C++, Vulkan, Graphics Engineering, Hardware Optimization, Project Management"
                    imgPath="Hephaestus_Engine_Logo.png"
                    link="https://github.com/KaihWhite/HephaestusEngine" />
                <Project 
                    description="Relevant skills: C++, OpenGL, Graphics Engineering, Game Engine Development, Software Architecture, Project Management"
                    imgPath="Start_Your_Engine_Logo.jpeg"
                    link="https://github.com/KaihWhite/Start-Your-Engine" />
                <Project
                    description="Relevant skills: React, Three.js, Web Development, UI/UX Design"
                    imgPath="THIS_IS_IT-long.png"
                    link="https://github.com/KaihWhite/personal-site" />
            </div>
            
            <Footer />
        </div>
    );
}