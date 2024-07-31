import React, { useState } from 'react';

import styles from '../styles/Menu.module.css';

export default function Menu(){
    const [isOpen, setIsOpen] = useState(false);

    return (
    <div className={styles.menuContainer}>
      <img src="white_menu.png" alt="Menu Icon" className={styles.menuPhoto} onClick={() => setIsOpen(!isOpen)} />
      {isOpen ? (
        <ul className={styles.menuLinks}>
          <li><a href="page1.html">Home</a></li>
          <li><a href="page2.html">Page 2</a></li>
          <li><a href="page3.html">Page 3</a></li>
        </ul>
      ) : null}
    </div>
  );
};