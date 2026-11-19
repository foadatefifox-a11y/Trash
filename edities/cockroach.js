const cockroach = document.querySelector('.cockroach');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const minute = 60_000;
let sightings = 0;

function scurry() {
  if (document.hidden || reducedMotion.matches) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const margin = 80;
  const horizontal = Math.random() < 0.8;
  const reverse = Math.random() < 0.5;
  const distance = horizontal ? width : height;
  const span = horizontal ? height : width;
  const start = span * (0.15 + Math.random() * 0.7);
  const end = span * (0.15 + Math.random() * 0.7);
  const segments = 14;

  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const progress = index / segments;
    const along = -margin + (distance + margin * 2) * (reverse ? 1 - progress : progress);
    const drift = Math.sin(progress * Math.PI) * (Math.random() - 0.5) * 55;
    const across = start + (end - start) * progress + drift;
    return horizontal ? [along, across] : [across, along];
  });

  let previousHeading;
  const frames = points.map(([x, y], index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(segments, index + 1)];
    let heading = Math.atan2(next[1] - previous[1], next[0] - previous[0]) * 180 / Math.PI + 90;
    if (previousHeading !== undefined) {
      heading -= 360 * Math.round((heading - previousHeading) / 360);
    }
    previousHeading = heading;
    const stride = index % 2 ? 0.96 : 1.04;
    return {
      transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${heading}deg) scaleX(${stride})`
    };
  });

  const duration = Math.min(1900, Math.max(700, distance * 1.1)) * (0.85 + Math.random() * 0.3);
  cockroach.animate(frames, { duration, easing: 'linear' });
}

function nextSighting() {
  scurry();
  sightings += 1;
  window.setTimeout(nextSighting, sightings < 4 ? minute : 5 * minute);
}

window.setTimeout(nextSighting, minute);
