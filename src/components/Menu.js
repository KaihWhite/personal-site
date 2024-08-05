import React, { useState } from 'react';

import styles from '../styles/Menu.module.css';

export default function Menu(){
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
      setIsOpen(!isOpen);
    };

    return (
    <div className={styles.menuContainer}>
      <img src="white_menu.png" alt="Menu" className={styles.menuPhoto} onClick={toggleMenu} />
      {isOpen && (
        <ul className={styles.menuLinks}>
          <li><a href="/">Home</a></li>
          <li><a href="/portfolio">Portfolio</a></li>
          {/* put a contact page here or at the bottom of the home page and create links from menu
          button that scroll to correct part of Home page (About section, Contact section, etc.*/}
        </ul>
      )}
    </div>
  );
};