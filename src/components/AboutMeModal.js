import { useState } from 'react';
import Modal from './ProfileModal';
import styles from '../styles/AboutMeModal.module.css';

const AboutMeModal = ({ onClose }) => {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.bubble} onClick={openModal}>
        <div className={styles.bubbleText}>
          About Me
        </div>
      </div>
      {showModal && <Modal onClose={closeModal} />}
    </div>
  );
};

export default AboutMeModal;
