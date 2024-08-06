import React from 'react';
import Menu from '../components/Menu';

function Project({ description, imgPath, link }) {
  
      return (
          <a href={link} style={{paddingTop: '64px', border: '2px solid white', borderRadius: '10px'}}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <img src={imgPath} alt="project" style={{width: '75vw', maxWidth: '500px', height: 'auto'}}/>
                <div style={{maxWidth: '1000px', height: 'auto', paddingTop: '1%'}}>
                  <p style={{fontSize: '16px', textAlign: 'center'}}>{description}</p>
                </div>
              </div>
          </a>
      );
  }

export default function Portfolio() {
    return (
        <div style={{background: 'solid black', minHeight: '100vh'}}>
            <Menu />
            <div style={{paddingTop: '64px', width: '100%', alignItems: 'center', position: 'relative'}}>
                <h1 style={{textAlign: 'center', position: 'relative'}}>Portfolio</h1>
                <p style={{fontSize: '20px', textAlign: 'center', position: 'relative', maxWidth: '1000px', margin: 'auto', padding: '16px 5% 0 5%'}}>Click on a project to see documentation of my development process</p>
            </div>

            <div style={{paddingTop: '64px', width: '100%', alignItems: 'center', position: 'relative', paddingLeft: '5%', paddingRight: '5%', display: 'flex', flexDirection: 'column'}}>
                <Project 
                    description="Relevant skills: C++, OpenGL, Graphics Engineering, Game Engine Development, Software Architecture, Hardware Optimization, Project Management"
                    imgPath="Start_Your_Engine_Logo.jpeg"
                    link="https://github.com/KaihWhite/Start-Your-Engine" />
            </div>
        </div>
    );
}