

{/* TODO: have this on the bottom of every page and also have these links accessible from the menu */}

// Component to create a link with an icon
function IconLink({ href, iconPath, margin}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', margin: margin || '20px'}}>
      <img src={iconPath} alt="icon" style={{ width: '30px', height: '30px' }} />
    </a>
  );
}

const Footer = () => {
  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '2', flexDirection: 'row', paddingBottom: '10px', paddingTop: '10px'}}>
        <IconLink href="https://github.com/KaihWhite" iconPath="/github.png" />
        <IconLink href="https://www.linkedin.com/in/kaihwhite/" iconPath="/linkedin.png" />
    </div>
  );
};

export default Footer;
