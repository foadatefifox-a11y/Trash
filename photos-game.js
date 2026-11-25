(() => {
  const openPaper = '../images/dirty-paper-open.webp';
  const closedPaper = '../images/dirty-paper-closed.webp';
  const wall = document.querySelector('.poster-wall');
  const piece = document.querySelector('.photo-piece');
  const guide = document.querySelector('.aim-path');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let state = 'wall';
  let pointer = null;
  let start;
  let anchor;
  let position;
  let pull;

  function image(src) {
    const node = new Image();
    node.src = src;
    node.alt = '';
    node.draggable = false;
    return node;
  }

  function paint() {
    piece.style.left = position.x + 'px';
    piece.style.top = position.y + 'px';
  }

  function resetAim() {
    if (pointer !== null && piece.hasPointerCapture(pointer)) piece.releasePointerCapture(pointer);
    pointer = null;
    anchor = { x: innerWidth / 2, y: innerHeight * .82 };
    position = { ...anchor };
    pull = { x: 0, y: 0 };
    guide.setAttribute('d', '');
    paint();
  }

  function readyToThrow(fromKeyboard) {
    state = 'ready';
    resetAim();
    piece.hidden = false;
    if (fromKeyboard) piece.focus({ preventScroll: true });
  }

  function peel(poster, fromKeyboard, releasePoint) {
    if (state !== 'wall' || poster.hidden) return;
    state = 'peeling';
    const rect = poster.querySelector('img').getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    poster.hidden = true;
    wall.inert = true;
    if (reducedMotion.matches) {
      readyToThrow(fromKeyboard);
      return;
    }

    resetAim();
    const startSize = Math.min(rect.width, rect.height);
    const ballSize = parseFloat(getComputedStyle(piece).width);
    const scale = ballSize / startSize;
    const overlay = document.createElement('div');
    overlay.className = 'peeling';
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      left: origin.x + 'px', top: origin.y + 'px',
      width: startSize + 'px', height: startSize + 'px'
    });
    const opened = image(openPaper);
    const closed = image(closedPaper);
    closed.style.opacity = '0';
    overlay.append(opened, closed);
    document.body.append(overlay);
    const dx = anchor.x - origin.x;
    const dy = anchor.y - origin.y;
    const peelX = releasePoint ? (releasePoint.x - origin.x) * .28 : dx * .14;
    const peelY = releasePoint ? (releasePoint.y - origin.y) * .28 : dy * .14;
    const angle = parseFloat(poster.style.getPropertyValue('--angle'));
    const timing = { duration: 520, easing: 'cubic-bezier(.22,.68,.34,1)', fill: 'both' };
    opened.animate([
      { opacity: 1, transform: 'perspective(380px) rotateY(0) scale(1)' },
      { opacity: 1, transform: 'perspective(380px) rotateY(-42deg) scale(.72,1.04)', offset: .28 },
      { opacity: 0, transform: 'perspective(380px) rotateY(55deg) scale(.42,.48)', offset: .69 },
      { opacity: 0, transform: 'perspective(380px) rotateY(55deg) scale(.42,.48)' }
    ], timing);
    closed.animate([{ opacity: 0 }, { opacity: 0, offset: .25 }, { opacity: 1, offset: .67 }, { opacity: 1 }], timing);
    const motion = overlay.animate([
      { transform: `translate(-50%, -50%) rotate(${angle}deg) scale(1)` },
      { transform: `translate(-50%, -50%) translate(${peelX}px, ${peelY}px) rotate(${angle - 15}deg) scale(1.05)`, offset: .23 },
      { transform: `translate(-50%, -50%) translate(${dx * .72}px, ${dy * .72}px) rotate(13deg) scale(${(1 + scale) / 2})`, offset: .67 },
      { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(0deg) scale(${scale})` }
    ], timing);
    motion.onfinish = () => {
      overlay.remove();
      readyToThrow(fromKeyboard);
    };
  }

  for (let index = 0; index < 24; index++) {
    const poster = document.createElement('button');
    poster.type = 'button';
    poster.className = 'wall-poster';
    poster.setAttribute('aria-label', 'Peel off poster ' + (index + 1));
    poster.style.setProperty('--angle', (Math.random() * 29 - 14.5) + 'deg');
    poster.style.setProperty('--offset-x', (Math.random() * 11 - 5.5) + '%');
    poster.style.setProperty('--offset-y', (Math.random() * 11 - 5.5) + '%');
    poster.style.setProperty('--size', (.75 + Math.random() * .29).toFixed(2));
    poster.append(image(openPaper));
    let grab;
    poster.addEventListener('click', event => peel(poster, event.detail === 0));
    poster.addEventListener('pointerdown', event => {
      if (event.button !== 0 || state !== 'wall') return;
      grab = { id: event.pointerId, x: event.clientX, y: event.clientY };
      poster.setPointerCapture(event.pointerId);
    });
    poster.addEventListener('pointerup', event => {
      if (grab?.id !== event.pointerId) return;
      const x = event.clientX;
      const y = event.clientY;
      if (Math.hypot(x - grab.x, y - grab.y) > 12) peel(poster, false, { x, y });
      grab = null;
    });
    poster.addEventListener('pointercancel', () => { grab = null; });
    wall.append(poster);
  }

  function dragTo(dx, dy) {
    const limit = Math.max(innerWidth, innerHeight) * .35;
    const scale = Math.min(1, limit / Math.max(1, Math.hypot(dx, dy)));
    const radius = piece.offsetWidth / 2;
    pull = { x: dx * scale, y: dy * scale };
    position = {
      x: Math.max(radius, Math.min(innerWidth - radius, anchor.x + pull.x)),
      y: Math.max(radius, Math.min(innerHeight - radius, anchor.y + pull.y))
    };
    paint();
    const end = flightEnd();
    guide.setAttribute('d', `M ${position.x} ${position.y} L ${end.x} ${end.y}`);
  }

  function flightEnd() {
    const x = -pull.x;
    const y = -pull.y;
    if (!x && !y) return position;
    const margin = 80;
    const toX = x > 0 ? innerWidth + margin - position.x : position.x + margin;
    const toY = y > 0 ? innerHeight + margin - position.y : position.y + margin;
    const distance = Math.min(toX / Math.abs(x), toY / Math.abs(y));
    return { x: position.x + x * distance, y: position.y + y * distance };
  }

  function launch(fromKeyboard = false) {
    if (state !== 'ready') return;
    if (Math.hypot(pull.x, pull.y) < 4) {
      if (!fromKeyboard) { resetAim(); return; }
      pull = { x: 0, y: 20 };
    }
    const end = flightEnd();
    if (!reducedMotion.matches) {
      const tossed = document.createElement('div');
      tossed.className = 'photo-piece';
      tossed.setAttribute('aria-hidden', 'true');
      tossed.style.cssText = piece.style.cssText;
      tossed.style.pointerEvents = 'none';
      document.body.append(tossed);
      const dx = end.x - position.x;
      const dy = end.y - position.y;
      const duration = Math.min(2050, Math.max(950, Math.hypot(dx, dy) / (0.62 + Math.hypot(pull.x, pull.y) / 190)));
      const flight = tossed.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)' },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${dx < 0 ? -420 : 420}deg) scale(.8)` }
      ], { duration, easing: 'cubic-bezier(.3,.12,.7,.88)', fill: 'forwards' });
      flight.onfinish = () => tossed.remove();
    }
    piece.hidden = true;
    wall.inert = false;
    guide.setAttribute('d', '');
    state = 'wall';
    if (fromKeyboard) wall.querySelector('.wall-poster:not([hidden])')?.focus({ preventScroll: true });
  }

  piece.addEventListener('pointerdown', event => {
    if (state !== 'ready' || pointer !== null || event.button !== 0) return;
    event.preventDefault();
    resetAim();
    pointer = event.pointerId;
    piece.setPointerCapture(pointer);
    start = { x: event.clientX, y: event.clientY };
  });
  piece.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    event.preventDefault();
    dragTo(event.clientX - start.x, event.clientY - start.y);
  });
  piece.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    if (piece.hasPointerCapture(pointer)) piece.releasePointerCapture(pointer);
    pointer = null;
    if (event.clientX !== start.x || event.clientY !== start.y) dragTo(event.clientX - start.x, event.clientY - start.y);
    launch();
  });
  piece.addEventListener('pointercancel', event => {
    if (event.pointerId === pointer) resetAim();
  });
  piece.addEventListener('keydown', event => {
    const arrows = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
    if (arrows[event.key]) {
      event.preventDefault();
      const [x, y] = arrows[event.key];
      dragTo(pull.x + x, pull.y + y);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      launch(true);
    }
  });
  window.addEventListener('resize', () => {
    if (state === 'ready') resetAim();
  });
})();
