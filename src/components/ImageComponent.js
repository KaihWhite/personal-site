import React, { useState, useEffect } from 'react';
import EXIF from 'exif-js';

const ImageComponent = ({ imageName }) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.src = `/${imageName}`;
    img.onload = () => {
      EXIF.getData(img, function () {
        const orientation = EXIF.getTag(this, 'Orientation');
        setRotation(orientation);
      });
    };
  }, [imageName]);

  return (
    <img
      style={{
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
        transform: `rotate(${rotation}deg)`,
      }}
      src={`/${imageName}`}
      alt={imageName}
    />
  );
};

export default ImageComponent;