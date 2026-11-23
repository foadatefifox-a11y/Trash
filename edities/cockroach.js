const cockroach = document.querySelector('.cockroach');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const roaches = [];
const initialCount = 4;
const maximum = 10;
const increaseEvery = 4000;
let started;
let timer;
let stopped = false;

function scurry(cockroach, direction) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (reducedMotion.matches) {
    const x = width * (.2 + Math.random() * .6);
    const y = height * (.2 + Math.random() * .6);
    const transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    return cockroach.animate([{ transform }, { transform }], { duration: 1700 });
  }
  const margin = 110;
  const horizontal = Math.random() < 0.8;
  const reverse = Math.random() < 0.5;
  const distance = horizontal ? width : height;
  const span = horizontal ? height : width;
  const start = span * (0.15 + Math.random() * 0.7);
  const end = span * (0.15 + Math.random() * 0.7);
  const segments = 14;

  const opening = direction !== undefined;
  const rayX = opening ? Math.cos(direction) : 0;
  const rayY = opening ? Math.sin(direction) : 0;
  const exit = opening ? Math.min(
    (width / 2 + margin) / Math.abs(rayX),
    (height / 2 + margin) / Math.abs(rayY)
  ) : distance;

  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const progress = index / segments;
    const drift = Math.sin(progress * Math.PI) * (Math.random() - 0.5) * 55;
    if (opening) {
      const travel = 16 + (exit - 16) * progress;
      return [width / 2 + rayX * travel - rayY * drift, height / 2 + rayY * travel + rayX * drift];
    }
    const along = -margin + (distance + margin * 2) * (reverse ? 1 - progress : progress);
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

  const duration = Math.min(2050, Math.max(900, exit * 1.45)) * (0.82 + Math.random() * 0.36);
  return cockroach.animate(frames, { duration, easing: opening ? 'ease-out' : 'linear' });
}

function run(roach, direction) {
  if (stopped || document.hidden) return;
  const animation = scurry(roach.image, direction);
  roach.animation = animation;
  animation.onfinish = () => {
    if (direction !== undefined) {
      roach.image.remove();
      roaches.splice(roaches.indexOf(roach), 1);
      if (!roaches.length && !stopped) startSwarm();
      return;
    }
    roach.animation = null;
    roach.readyAt = performance.now() + 220 + Math.random() * 430;
  };
}

function updateSwarm() {
  if (stopped || document.hidden) return;
  const now = performance.now();
  const count = Math.min(maximum, initialCount + Math.floor((now - started) / increaseEvery));
  while (roaches.length < count) {
    const image = roaches.length === 0 ? cockroach : cockroach.cloneNode();
    if (!image.isConnected) document.querySelector('.materials').after(image);
    roaches.push({ image, animation: null, readyAt: now + (roaches.length < initialCount ? roaches.length * 160 : 0) });
  }
  for (const roach of roaches) {
    if (!roach.animation && roach.readyAt <= now) run(roach);
  }
}

function getBlocker() {
  // Use the rotated body rather than the full image rectangle (which includes antennae).
  const bodies = roaches.filter(roach => roach.animation).map(({image}) => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(image).transform).inverse();
    const halfWidth = image.offsetWidth / 2;
    const halfHeight = image.offsetHeight / 2;
    return { transform, halfWidth, halfHeight };
  });
  return (x, y) => bodies.some(({transform, halfWidth, halfHeight}) => {
    const local = new DOMPoint(x - halfWidth, y - halfHeight).matrixTransform(transform);
    return (local.x / (halfWidth * .57)) ** 2 + ((local.y - halfHeight * .12) / (halfHeight * .76)) ** 2 <= 1;
  });
}

window.trashyRoaches = {
  getBlocker,
  clear() {
    stopped = true;
    window.clearInterval(timer);
    for (const roach of roaches) {
      roach.animation?.cancel();
      roach.image.remove();
    }
    cockroach.remove();
    roaches.length = 0;
  }
};

function startSwarm() {
  if (stopped) return;
  started = performance.now();
  updateSwarm();
  timer = window.setInterval(updateSwarm, 150);
}

function openWithScatter() {
  if (stopped) return;
  if (document.hidden) {
    document.addEventListener('visibilitychange', openWithScatter, { once: true });
    return;
  }
  const offset = Math.random() * 2 * Math.PI;
  for (let index = 0; index < maximum; index++) {
    const image = index === 0 ? cockroach : cockroach.cloneNode();
    if (image !== cockroach) cockroach.after(image);
    const roach = { image, animation: null };
    roaches.push(roach);
    const direction = offset + (index + Math.random() * .28) * 2 * Math.PI / maximum;
    run(roach, direction);
  }
}

cockroach.decode().then(openWithScatter, openWithScatter);
