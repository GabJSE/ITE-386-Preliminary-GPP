import React from 'react';
import './Slideshow.css';

// Slideshow: supports string slides or object slides { image, caption, alt }
function Slideshow({ slides = [], duration = 8000, showCaptions = true }) {
  if (!slides || slides.length === 0) return null;

  // duplicate slides to create a seamless loop
  const doubled = [...slides, ...slides];

  return (
    <div className="slideshow-wrapper" aria-roledescription="carousel">
      <div className="slideshow-track" style={{ animationDuration: `${duration}ms` }}>
        {doubled.map((s, i) => {
          const isObj = s && typeof s === 'object' && (s.image || s.caption);
          return (
            <div className="slide" key={i} aria-hidden={i >= slides.length}>
              {isObj ? (
                <div className="slide-content slide-image">
                  {s.image ? (
                    <img src={s.image} alt={s.alt || s.caption || `slide-${i}`} />
                  ) : null}
                  {showCaptions && s.caption ? <div className="slide-caption">{s.caption}</div> : null}
                </div>
              ) : (
                <div className="slide-content">{s}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Slideshow;
