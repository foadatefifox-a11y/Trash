const cockroach = document.querySelector('.cockroach');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const interval = 10_000;
let nextSighting = Date.now() + interval;
let missedSighting = false;

function scurry() {


  const width = window.innerWidth;
  const height = window.innerHeight;
  if (reducedMotion.matches) {
    const x = width * (.2 + Math.random() * .6);
    const y = height * (.2 + Math.random() * .6);
    const transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    cockroach.animate([{ transform }, { transform }], { duration: 2400 });
    return;
  }
  const margin = 110;
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

  const duration = Math.min(3600, Math.max(2600, distance * 2.4)) * (0.9 + Math.random() * 0.2);
  cockroach.animate(frames, { duration, easing: 'linear' });
}

function checkSighting() {
  const now = Date.now();
  if (now >= nextSighting) {
    nextSighting += (Math.floor((now - nextSighting) / interval) + 1) * interval;
    missedSighting = true;
  }
  if (missedSighting && !document.hidden) {
    missedSighting = false;
    scurry();
  }
}

window.setInterval(checkSighting, interval);
document.addEventListener('visibilitychange', checkSighting);
