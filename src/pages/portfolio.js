import React from 'react';

function Project({ title, description, imgPath, link }) {

  function openLink() {
    window.open(link, '_blank');
  }

    return (
        <div style={{paddingBottom: '2%'}}>
            <h2 style={{justifyContent: 'center', alignItems: 'center'}}>{title}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
              <img src={imgPath} alt="project" style={{maxWidth: '50vh', height: 'auto'}}/>
              <div style={{paddingLeft: '2%', width: '300px', height: '200px', paddingTop: '5%'}}>
                <p style={{}}>{description}</p>
              </div>
            </div>
        </div>
    );
}

export default function Portfolio() {
    return (
        <div style={{position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', paddingTop: '10%'}}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', position: 'relative', top: '0px', paddingBottom: '5%'}}>Work Experience</h1>
            <Project 
                title="Lead Graphics Engineer"
                description="Created a game engine from the ground up using C++ and OpenGL while acting as the lead engineer for a team of 3.
                Greatly improved my understanding of graphics programming and optimizing for hardware."
                imgPath="Start_Your_Engine_Logo.jpeg"
                link="https://github.com/KaihWhite/Start-Your-Engine" />
                
            <Project
                title="Lead Fullstack Engineer"
                description="Created an on-demand legal service web app to connect clients with lawyers anywhere in the US via video call.
                Acted as lead engineer for a team of 7 and used the AWS CDK to design a serverless architecture using Python and React."
                imgPath="SpeedyLegalLogo.png"
                link="https://www.google.com" />

            <Project
                title="Software Development Engineer Intern"
                description="Interned as a software development engineer on the AWS Customer Experience team and learned how to build cloud-native applications using AWS services.
                Specifcally, I worked on migrating a legacy AWS feature to a serverless architecture using the AWS CDK and Javascript."
                imgPath="AWS_logo.png"
                link="https://www.google.com" />
        </div>
    );

}
