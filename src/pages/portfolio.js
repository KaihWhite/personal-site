import React from 'react';

function Project({ title, description, imgPath, link }) {
    const handleClick = () => {
        window.open(link, '_blank');
    }
    return (
        <div style={{paddingBottom: '5vw'}}>
            <h2>{title}</h2>
            <p>{description}</p>
            <img src={imgPath} alt="project" onClick={handleClick} style={{ maxWidth: '50vw', height: 'auto' }}/>
        </div>
    );
}

// portfolio page
export default function Portfolio() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
            <h1 style={{paddingTop: '10vh', paddingBottom: '10vh', justifyContent: 'center', alignItems: 'center', width: '100vw', textAlign: 'center'}}>Portfolio</h1>
            <div style={{position: 'relative', display:'flex', width:'100vw', height:'auto', justifyContent:'center', alignItems:'center', flexDirection: 'column'}}>
                <Project title="Start Your Engine" description="Created a game engine from scratch using C++ and OpenGL." imgPath="StartYourEngine_Screenshot.png" link=""  />
                <Project title="Speedy Legal" description="Developed an on-demand legal service allowing customers to contact lawyers from anywhere in the US." imgPath="" link=""  />
            </div>
        </div>
    );
  };