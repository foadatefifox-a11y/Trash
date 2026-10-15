(() => {
  const control = document.querySelector('.cleanup-control');
  const ns = 'http://www.w3.org/2000/svg';
  let target, original, letters = [], pointer = null, previous;
  const point = (x, y) => new DOMPoint(x, y).matrixTransform(target.querySelector('svg').getScreenCTM().inverse());

  function reset() {
    window.cleanupAudio?.stop();
    pointer = null;
    letters.forEach(letter => { cancelAnimationFrame(letter.frame); letter.node.remove(); });
    if (original) original.style.removeProperty('visibility');
    if (target) target.classList.remove('cleaning');
    letters = [];
    target = original = null;
    window.cleaningWord = null;
    control.textContent = 'clean it up';
    control.setAttribute('aria-pressed', 'false');
  }

  control.addEventListener('click', () => {
    if (target) { reset(); return; }
    window.cleanupAudio?.prepare();
    target = document.querySelector('.material[aria-pressed="true"]');
    original = target.querySelector('text');
    const svg = target.querySelector('svg');
    // Read positions before splitting so kerning, size and letter shapes stay intact.
    const positions = [...original.textContent].map((char, i) => ({char, p: original.getStartPositionOfChar(i)}));
    positions.forEach(({char, p}) => {
      const group = document.createElementNS(ns, 'g');
      group.classList.add('loose-letter');
      const text = original.cloneNode(false);
      text.textContent = char;
      text.setAttribute('x', p.x);
      text.setAttribute('y', p.y);
      group.append(text);
      svg.append(group);
      letters.push({node: group, x: 0, y: 0, attached: false, gone: false, frame: 0});
    });
    original.style.visibility = 'hidden';
    target.classList.add('cleaning');
    window.cleaningWord = target;
    control.textContent = 'start again';
    control.setAttribute('aria-pressed', 'true');
  });

  // Selecting the other material restores this word and leaves the new one intact.
  document.querySelectorAll('.material').forEach(button => button.addEventListener('click', () => {
    if (target && button !== target) reset();
  }, true));
  window.addEventListener('resize', () => {
    if (!target) return;
    // Letter offsets are in SVG coordinates, so they scale with the word.
    // End only an active pointer gesture; preserve every letter and its progress.
    window.cleanupAudio?.stop();
    if (pointer !== null && target.hasPointerCapture(pointer)) target.releasePointerCapture(pointer);
    pointer = null;
    letters.forEach(letter => { letter.attached = false; });
  });

  function paint(letter) {
    letter.node.setAttribute('transform', `translate(${letter.x} ${letter.y})`);
  }
  function touches(x1, y1, x2, y2, r) {
    // Segment/expanded-rectangle intersection catches fast sweeping strokes.
    let low = 0, high = 1;
    for (const [a, delta, min, max] of [[x1,x2-x1,r.left-10,r.right+10],[y1,y2-y1,r.top-10,r.bottom+10]]) {
      if (!delta) { if (a < min || a > max) return false; }
      else {
        let from = (min-a)/delta, to = (max-a)/delta;
        if (from > to) [from,to] = [to,from];
        low = Math.max(low, from); high = Math.min(high, to);
        if (low > high) return false;
      }
    }
    return true;
  }
  function move(event) {
    if (!target || event.pointerId !== pointer) return;
    event.preventDefault();
    const a = point(previous.x, previous.y), b = point(event.clientX, event.clientY);
    let moved = false;
    letters.forEach(letter => {
      if (letter.gone) return;
      const rect = letter.node.getBoundingClientRect();
      if (!letter.attached && touches(previous.x, previous.y, event.clientX, event.clientY, rect)) letter.attached = true;
      if (letter.attached) {
        letter.x += b.x-a.x; letter.y += b.y-a.y; paint(letter);
        if (b.x !== a.x || b.y !== a.y) moved = true;
      }
    });
    if (moved) window.cleanupAudio?.move(target.dataset.material);
    else window.cleanupAudio?.stop();
    previous = {x: event.clientX, y: event.clientY};
  }
  document.addEventListener('pointerdown', event => {
    if (!target || event.button !== 0 || event.target.closest('.cleanup-control') || event.target.closest('.material[aria-pressed="false"]')) return;
    pointer = event.pointerId;
    previous = {x:event.clientX,y:event.clientY};
    event.preventDefault();
    target.setPointerCapture(pointer);
    move(event);
  }, {passive:false});
  document.addEventListener('pointermove', move, {passive:false});
  function release(event) {
    window.cleanupAudio?.stop();
    if (!target || event.pointerId !== pointer) return;
    const svg = target.querySelector('svg');
    const matrix = svg.getScreenCTM();
    // Finish a stroke at the screen edge so letters can be swept fully out.
    const edge = event.clientX < 24 ? -1 : event.clientX > innerWidth-24 ? 1 : 0;
    letters.forEach(letter => {
      if (letter.attached && edge) {
        letter.gone = true;
        const start = performance.now(), from = letter.x;
        const distance = edge * (innerWidth + letter.node.getBoundingClientRect().width + 20) / matrix.a;
        const animate = now => {
          const t = Math.min(1, (now-start)/250);
          letter.x = from + distance*t; paint(letter);
          if (t < 1) letter.frame = requestAnimationFrame(animate);
          else letter.node.style.visibility = 'hidden';
        };
        letter.frame = requestAnimationFrame(animate);
      }
      letter.attached = false;
    });
    if (target.hasPointerCapture(pointer)) target.releasePointerCapture(pointer);
    pointer = null;
  }
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', event => {
    window.cleanupAudio?.stop();
    if (event.pointerId === pointer) { letters.forEach(l=>l.attached=false); pointer=null; }
  });
})();
