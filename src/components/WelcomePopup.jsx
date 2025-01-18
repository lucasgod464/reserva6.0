import React from 'react';

const WelcomePopup = ({ title, description, onClose, show }) => {
  if (!show) return null;

  return (
    <div className="welcome-popup">
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="button" onClick={onClose}>
        Fechar
      </button>
    </div>
  );
};

export default WelcomePopup;
