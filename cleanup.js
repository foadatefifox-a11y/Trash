(() => {
  const ns = 'http://www.w3.org/2000/svg';
  let target, original, letters = [], pointer = null, previous;
  let recoveryDistance = 0;
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
  }

  function prepareCleanup() {
    if (target) return true;
    target = document.querySelector('.material[aria-pressed="true"]:not([hidden])');
    if (!target) return false;
    window.cleanupAudio?.prepare();
    original = target.querySelector('text');
    const svg = target.querySelector('svg');
    // Read positions before splitting so kerning, size and letter shapes stay intact.
    const positions = [...original.textContent].map((char, i) => ({char, p: original.getStartPositionOfChar(i)}));
    positions.forEach(({char, p}) => {
      if (!char.trim()) return;
      const group = document.createElementNS(ns, 'g');
      group.classList.add('loose-letter');
      const text = original.cloneNode(false);
      text.textContent = char;
      text.setAttribute('x', p.x);
      text.setAttribute('y', p.y);
      group.append(text);
      svg.append(group);
      letters.push({node: group, x: 0, y: 0, attached: false, gone: false, finished: false, frame: 0});
    });
    original.style.visibility = 'hidden';
    target.classList.add('cleaning');
    window.cleaningWord = target;
    return true;
  }

  // Selecting the other material restores this word and leaves the new one intact.
  document.querySelectorAll('.material').forEach(button => button.addEventListener('click', event => {
    if (!target || button === target) return;
    if (letters.every(letter => letter.gone)) {
      event.stopImmediatePropagation();
      return;
    }
    reset();
  }, true));

  function finishWord() {
    if (!letters.every(letter => letter.finished)) return;
    target.hidden = true;
    reset();
    const next = document.querySelector('.material:not([hidden])');
    if (next) next.click();
    else window.trashyRoaches?.clear();
  }
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
    for (const [a, delta, min, max] of [[x1,x2-x1,r.left-5,r.right+5],[y1,y2-y1,r.top-5,r.bottom+5]]) {
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

  function detachLetters() {
    letters.forEach(letter => { letter.attached = false; });
  }

  function sweepSpan(from, to) {
    const a = point(from.x, from.y);
    const b = point(to.x, to.y);
    let moved = false;
    for (const letter of letters) {
      if (letter.gone) continue;
      if (!letter.attached) {
        const rect = letter.node.getBoundingClientRect();
        letter.attached = touches(from.x, from.y, to.x, to.y, rect);
      }
      if (letter.attached && (a.x !== b.x || a.y !== b.y)) {
        letter.x += b.x - a.x;
        letter.y += b.y - a.y;
        paint(letter);
        moved = true;
      }
    }
    return moved;
  }

  function move(event) {
    if (!target || event.pointerId !== pointer) return;
    event.preventDefault();
    const next = { x: event.clientX, y: event.clientY };
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(length / 4));
    const blocked = window.trashyRoaches?.getBlocker() ?? (() => false);
    let start = null;
    let lastClear;
    let moved = false;

    // Each clear stretch can pick up letters independently. A covered stretch
    // breaks the grab even when the pointer jumps across it between events.
    for (let index = 0; index <= steps; index++) {
      const t = index / steps;
      const sample = { x: previous.x + dx * t, y: previous.y + dy * t };
      if (blocked(sample.x, sample.y)) {
        if (start) moved = sweepSpan(start, lastClear) || moved;
        start = null;
        detachLetters();
        recoveryDistance = 18;
      } else if (recoveryDistance > 0) {
        recoveryDistance = Math.max(0, recoveryDistance - length / steps);
      } else {
        start ??= sample;
        lastClear = sample;
      }
    }

    if (start) moved = sweepSpan(start, lastClear) || moved;
    if (moved) window.cleanupAudio?.move(target.dataset.material);
    else window.cleanupAudio?.stop();
    previous = next;
  }
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.material[aria-pressed="false"]')) return;
    if (pointer !== null || !prepareCleanup() || letters.every(letter => letter.gone)) return;
    pointer = event.pointerId;
    recoveryDistance = 0;
    previous = {x:event.clientX,y:event.clientY};
    event.preventDefault();
    target.setPointerCapture(pointer);
    move(event);
  }, {passive:false});
  document.addEventListener('pointermove', move, {passive:false});
  function release(event) {
    if (!target || event.pointerId !== pointer) return;
    if (previous.x !== event.clientX || previous.y !== event.clientY) move(event);
    window.cleanupAudio?.stop();
    const blocked = window.trashyRoaches?.getBlocker();
    if (blocked?.(event.clientX, event.clientY)) detachLetters();
    const svg = target.querySelector('svg');
    const matrix = svg.getScreenCTM();
    // Finish a stroke at the screen edge so letters can be swept fully out.
    const edge = event.clientX < 24 ? -1 : event.clientX > innerWidth-24 ? 1 : 0;
    letters.forEach(letter => {
      if (letter.gone) return;
      const rect = letter.node.getBoundingClientRect();
      const outside = rect.right < 0 ? -1 : rect.left > innerWidth ? 1 : 0;
      const exit = outside || (letter.attached ? edge : 0);
      if (exit) {
        letter.gone = true;
        const start = performance.now(), from = letter.x;
        const distance = exit * (innerWidth + rect.width + 20) / matrix.a;
        const animate = now => {
          const t = Math.min(1, (now-start)/250);
          letter.x = from + distance*t; paint(letter);
          if (t < 1) letter.frame = requestAnimationFrame(animate);
          else {
            letter.node.style.visibility = 'hidden';
            letter.finished = true;
            finishWord();
          }
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
