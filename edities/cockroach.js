const cockroach = document.querySelector('.cockroach');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const minute = 60_000;
let sightings = 0;
let remaining = minute;
let deadline;
let timer;

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

  const duration = Math.min(2500, Math.max(1600, distance * 1.6)) * (0.9 + Math.random() * 0.2);
  cockroach.animate(frames, { duration, easing: 'linear' });
}

function scheduleSighting() {
  if (document.hidden || timer !== undefined) return;
  deadline = performance.now() + remaining;
  timer = window.setTimeout(() => {
    timer = undefined;
    if (document.hidden) {
      remaining = 0;
      return;
    }
    scurry();
    sightings += 1;
    remaining = sightings < 4 ? minute : 5 * minute;
    scheduleSighting();
  }, remaining);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    scheduleSighting();
  } else if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, deadline - performance.now());
  }
});

scheduleSighting();
