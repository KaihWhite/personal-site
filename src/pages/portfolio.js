import React from 'react';

function Project({ title, description, imgPath, link }) {

  function openLink() {
    window.open(link, '_blank');
  }

    return (
        <div>
            <h2>{title}</h2>
            <p>{description}</p>
            <img src={imgPath} alt="project" onClick={openLink}/>
        </div>
    );
}

export default function Portfolio() {
    return (
        <div style={{position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
            <h1>Portfolio</h1>
            <Project 
                title="Start Your Engine"
                description="Created a game engine from the ground up using C++ and OpenGL"
                imgPath="https://via.placeholder.com/150"
                link="https://github.com/KaihWhite/Start-Your-Engine" />
                
            <Project
                title="Speedy Legal"
                description="Created on-demand legal services app using React Native to connect clients with lawyers anywhere in the US."
                imgPath="https://via.placeholder.com/150"
                link="https://www.google.com" />

            <Project
                title="Amazon Web Services internship"
                description="Worked as a software development engineer intern on the AWS Customer Experience team."
                imgPath="https://via.placeholder.com/150"
                link="https://www.google.com" />
        </div>
    );

}
