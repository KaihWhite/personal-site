import React from 'react';

function Project({ title, description, imgPath, link }) {

  function openLink() {
    window.open(link, '_blank');
  }

    return (
        <div style={{paddingBottom: '2%'}}>
            <h2 style={{justifyContent: 'center', alignItems: 'center'}}>{title}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
              <img src={imgPath} alt="project" onClick={openLink} style={{maxWidth: '50vh', height: 'auto'}}/>
              <div style={{paddingLeft: '1%', width: '300px', height: '200px', paddingTop: '15%'}}>
                <p style={{}}>{description}</p>
              </div>
            </div>
        </div>
    );
}

export default function Portfolio() {
    return (
        <div style={{position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', paddingTop: '10%'}}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', position: 'relative', top: '0px', paddingBottom: '5%'}}>Portfolio</h1>
            <Project 
                title="Lead Graphics Engineer"
                description="Created a game engine from the ground up using C++ and OpenGL"
                imgPath="Start_Your_Engine_Logo.jpeg"
                link="https://github.com/KaihWhite/Start-Your-Engine" />
                
            <Project
                title="Lead Fullstack Engineer"
                description="Created on-demand legal services app using React Native to connect clients with lawyers anywhere in the US."
                imgPath="SpeedyLegalLogo.png"
                link="https://www.google.com" />

            <Project
                title="Software Development Engineer Intern"
                description="Worked as a software development engineer intern on the AWS Customer Experience team."
                imgPath="AWS_logo.png"
                link="https://www.google.com" />
        </div>
    );

}
