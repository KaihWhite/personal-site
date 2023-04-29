import { useState } from 'react';
import styles from '../styles/ProfileModal.module.css';

const ProfileModal = ({ onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <img
          src="/me.PNG"
          alt="Kaih White"
          className={`${styles.profileImage} ${imageLoaded ? styles.visible : ''}`}
          onLoad={handleImageLoad}
        />
        <p className={styles.description}>Hello There! My name is Kaih White, but you've probably gathered that by now.
              I am a Fullstack Software Engineer with experience managing and developing 
              websites, big data projects, and on-demand services. I am currently taking on
              projects. Please feel free to contact me with any questions regarding development,
               debugging, and project managment.</p>
      </div>
    </div>
  );
};

export default ProfileModal;
