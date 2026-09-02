import React from 'react';

export default function StatCard({ title, value, delay = '0s' }) {
  const card = {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '160px',
    borderLeft: '6px solid #0078D4',
    paddingLeft: '18px',
    animation: 'fadeScale 0.6s ease-out',
    animationDelay: delay,
    animationFillMode: 'both',
    transition: 'transform 0.3s ease',
    cursor: 'pointer',
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#222',
  };

  const statStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
  };

  const handleMouseEnter = e => {
    e.currentTarget.style.transform = 'scale(1.03)';
  };

  const handleMouseLeave = e => {
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <div
      style={card}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <p style={titleStyle}>{title}</p>
      <p style={statStyle}>{value}</p>
    </div>
  );
}
