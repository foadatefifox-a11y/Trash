(() => {
  for (const link of document.querySelectorAll('.letter-link')) {
    const label = link.querySelector('.letter-label');
    function followPointer(event) {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const bounds = link.getBoundingClientRect();
      const half = label.offsetWidth / 2;
      const x = Math.max(half + 4, Math.min(innerWidth - half - 4, event.clientX + 8));
      const y = event.clientY + 15;
      label.style.setProperty('--label-x', (x - bounds.left) + 'px');
      label.style.setProperty('--label-y', (y - bounds.top) + 'px');
    }
    link.addEventListener('pointerenter', followPointer);
    link.addEventListener('pointermove', followPointer);
    link.addEventListener('pointerleave', () => {
      label.style.removeProperty('--label-x');
      label.style.removeProperty('--label-y');
    });
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const currentA = document.querySelector('.yellow-a');
  const nextA = document.querySelector('.yellow-a-next');
  const sequence = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
  const framePosition = index => '0 ' + index * 12.5 + '%';
  let frame = 0;
  currentA.style.backgroundPosition = framePosition(sequence[0]);

  function advanceA() {
    frame = (frame + 1) % sequence.length;
    nextA.style.backgroundPosition = framePosition(sequence[frame]);
    const wipe = nextA.animate(
      [{ clipPath: 'inset(0 0 100%)' }, { clipPath: 'inset(0)' }],
      { duration: 420, easing: 'ease-in-out' }
    );
    wipe.onfinish = () => {
      currentA.style.backgroundPosition = nextA.style.backgroundPosition;
      setTimeout(advanceA, 110);
    };
  }
  setTimeout(advanceA, 240);

  const track = document.querySelector('.t-track');
  const entries = [[-14, 5.5], [114, 5.5], [50, 111], [50, -12]];
  const junction = [50, 5.5];
  for (let index = 0; index < 4; index++) {
    const bug = new Image();
    bug.className = 't-roach';
    bug.src = 'edities/cockroach.webp';
    bug.alt = '';
    track.append(bug);
    let entry = index;

    function run() {
      const exit = (entry + 1 + Math.floor(Math.random() * 3)) % entries.length;
      const points = [entries[entry], junction, entries[exit]];
      const widths = points.slice(1).map(([x, y], i) =>
        Math.hypot((x - points[i][0]) * .7404, y - points[i][1])
      );
      const length = widths[0] + widths[1];
      const offset = widths[0] / length;
      const angle = (from, to) => Math.atan2(to[1] - from[1], (to[0] - from[0]) * .7404) * 180 / Math.PI + 90;
      const inAngle = angle(points[0], junction);
      const rawOut = angle(junction, points[2]);
      const outAngle = rawOut - 360 * Math.round((rawOut - inAngle) / 360);
      const key = ([x, y], heading, time) => ({
        left: x + '%', top: y + '%', opacity: 1, offset: time,
        transform: `translate(-50%, -50%) rotate(${heading}deg)`
      });
      const crossing = bug.animate([
        key(points[0], inAngle, 0), key(junction, inAngle, offset - .018),
        key(junction, outAngle, offset + .018), key(points[2], outAngle, 1)
      ], { duration: length * (13 + Math.random() * 8), easing: 'linear' });
      crossing.onfinish = () => {
        const choices = [0, 1, 2, 3].filter(side => side !== exit && side !== entry);
        entry = choices[Math.floor(Math.random() * choices.length)];
        setTimeout(run, 130 + Math.random() * 340);
      };
    }
    bug.decode().then(() => setTimeout(run, index * 290), () => {});
  }
})();
