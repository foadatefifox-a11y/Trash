(() => {
  const board = document.querySelector('.board');
  const rotate = document.querySelector('.rotate');
  const join = document.querySelector('.join');
  const types = {
    curved: { name: 'Curved pasta', file: 'pasta-piece-1.webp', ratio: 237 / 600, ends: [[-.14, -.475], [.14, .475]] },
    straight: { name: 'Straight pasta', file: 'pasta-piece-2.webp', ratio: 125 / 598, ends: [[-.008, -.47], [.025, .47]] }
  };
  const pieces = [];
  const bins = [...document.querySelectorAll('[data-bin]')];
  const stock = { curved: 0, straight: 0 };
  const hint = document.querySelector('.sort-hint');
  const instructions = hint.textContent;
  const snapDistance = 22;
  const turn = Math.PI / 12;
  let selected;
  let gesture;
  let boardSize = { width: board.clientWidth, height: board.clientHeight };

  function endpoint(piece, index) {
    const [x, y] = piece.type.ends[index].map(value => value * piece.length);
    const cos = Math.cos(piece.angle);
    const sin = Math.sin(piece.angle);
    return { x: piece.x + x * cos - y * sin, y: piece.y + x * sin + y * cos };
  }

  function nearestJoin(piece, maxDistance) {
    let best = null;
    for (const other of pieces) {
      if (other === piece) continue;
      for (let own = 0; own < 2; own++) {
        const from = endpoint(piece, own);
        for (let end = 0; end < 2; end++) {
          const target = endpoint(other, end);
          const distance = Math.hypot(target.x - from.x, target.y - from.y);
          if (distance < maxDistance) {
            maxDistance = distance;
            best = { own, target };
          }
        }
      }
    }
    return best;
  }

  function align(piece, connection) {
    if (!connection) return;
    const from = endpoint(piece, connection.own);
    piece.x += connection.target.x - from.x;
    piece.y += connection.target.y - from.y;
  }

  function paint(piece) {
    piece.button.style.transform = `translate(${piece.x}px, ${piece.y}px) translate(-50%, -50%) rotate(${piece.angle}rad)`;
    if (selected !== piece) return;
    const bounds = piece.button.getBoundingClientRect();
    const area = board.getBoundingClientRect();
    rotate.style.left = Math.max(22, Math.min(board.clientWidth - 22, piece.x)) + 'px';
    rotate.style.top = Math.max(0, Math.min(board.clientHeight - 44, bounds.bottom - area.top + 2)) + 'px';
  }

  function select(piece) {
    if (selected) {
      selected.button.setAttribute('aria-pressed', 'false');
      selected.button.style.zIndex = '';
    }
    selected = piece;
    rotate.hidden = !piece;
    join.hidden = true;
    if (piece) {
      piece.button.setAttribute('aria-pressed', 'true');
      piece.button.style.zIndex = '1';
      paint(piece);
    }
  }

  function createPiece(key, x, y, angle = 0) {
    const type = types[key];
    const length = Math.max(82, Math.min(142, board.clientWidth * .33, board.clientHeight * .36));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'piece';
    button.style.width = length * type.ratio + 'px';
    button.style.height = length + 'px';
    button.setAttribute('aria-label', type.name);
    button.setAttribute('aria-keyshortcuts', 'B');
    button.setAttribute('aria-pressed', 'false');
    const image = new Image();
    image.src = '../images/' + type.file;
    image.alt = '';
    image.draggable = false;
    button.append(image);
    const piece = { key, type, button, length, x, y, angle };
    pieces.push(piece);
    board.insertBefore(button, rotate);
    paint(piece);

    button.addEventListener('focus', () => select(piece));
    button.addEventListener('click', () => select(piece));
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || gesture) return;
      event.preventDefault();
      select(piece);
      button.focus({ preventScroll: true });
      button.setPointerCapture(event.pointerId);
      gesture = { pointer: event.pointerId, piece, x: event.clientX, y: event.clientY, originX: piece.x, originY: piece.y, moved: false };
    });
    button.addEventListener('pointermove', movePiece);
    button.addEventListener('pointerup', endMove);
    button.addEventListener('pointercancel', endMove);
    button.addEventListener('keydown', event => moveWithKeys(event, piece));
    return piece;
  }

  function constrain(piece) {
    piece.x = Math.max(12, Math.min(board.clientWidth - 12, piece.x));
    piece.y = Math.max(12, Math.min(board.clientHeight - 12, piece.y));
  }

  function movePiece(event) {
    if (gesture?.pointer !== event.pointerId) return;
    const { piece, x, y, originX, originY } = gesture;
    if (!gesture.moved && Math.hypot(event.clientX - x, event.clientY - y) < 3) return;
    gesture.moved = true;
    piece.x = originX + event.clientX - x;
    piece.y = originY + event.clientY - y;
    constrain(piece);
    paint(piece);
    const over = binAt(event);
    highlightBin(over, piece.key);
    const candidate = over ? null : nearestJoin(piece, snapDistance);
    join.hidden = !candidate;
    if (candidate) {
      join.style.left = candidate.target.x + 'px';
      join.style.top = candidate.target.y + 'px';
    }
  }

  function endMove(event) {
    if (gesture?.pointer !== event.pointerId) return;
    const { piece, moved, originX, originY } = gesture;
    gesture = null;
    join.hidden = true;
    highlightBin(null);
    if (moved && event.type === 'pointerup') {
      const bin = binAt(event);
      if (bin) {
        if (bin.dataset.bin === piece.key) {
          sortPiece(piece, bin);
          return;
        }
        piece.x = originX;
        piece.y = originY;
        hint.textContent = 'That goes in the ' + piece.key + ' bin.';
      } else {
        hint.textContent = instructions;
        align(piece, nearestJoin(piece, snapDistance));
      }
    }
    paint(piece);
  }

  function moveWithKeys(event, piece) {
    const offsets = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      pieces.splice(pieces.indexOf(piece), 1);
      piece.button.remove();
      select(null);
      bins[0].focus();
    } else if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      sortPiece(piece, bins.find(bin => bin.dataset.bin === piece.key));
    } else if (offsets[event.key]) {
      event.preventDefault();
      const [x, y] = offsets[event.key];
      piece.x += x;
      piece.y += y;
      constrain(piece);
      paint(piece);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      align(piece, nearestJoin(piece, snapDistance));
      select(piece);
      rotate.focus();
    }
  }

  function pointerAngle(event, pivot) {
    return Math.atan2(event.clientY - pivot.y, event.clientX - pivot.x);
  }

  rotate.addEventListener('pointerdown', event => {
    if (!selected || gesture || event.button !== 0) return;
    event.preventDefault();
    rotate.setPointerCapture(event.pointerId);
    const piece = selected;
    const connection = nearestJoin(piece, 1.5);
    const area = board.getBoundingClientRect();
    const center = connection?.target ?? piece;
    const pivot = { x: center.x + area.left, y: center.y + area.top };
    gesture = { pointer: event.pointerId, piece, connection, pivot, startAngle: pointerAngle(event, pivot), angle: piece.angle, x: event.clientX, y: event.clientY, moved: false };
  });

  rotate.addEventListener('pointermove', event => {
    if (gesture?.pointer !== event.pointerId) return;
    const { piece, connection, pivot, startAngle, angle, x, y } = gesture;
    if (!gesture.moved && Math.hypot(event.clientX - x, event.clientY - y) < 4) return;
    gesture.moved = true;
    piece.angle = angle + pointerAngle(event, pivot) - startAngle;
    align(piece, connection);
    paint(piece);
  });

  rotate.addEventListener('pointerup', event => {
    if (gesture?.pointer !== event.pointerId) return;
    const { piece, connection, moved } = gesture;
    gesture = null;
    if (!moved) {
      piece.angle += turn;
      align(piece, connection);
    }
    if (!connection) align(piece, nearestJoin(piece, snapDistance));
    paint(piece);
  });
  rotate.addEventListener('pointercancel', () => { gesture = null; });

  rotate.addEventListener('click', event => {
    if (!selected || event.detail !== 0) return;
    const connection = nearestJoin(selected, 1.5);
    selected.angle += turn;
    align(selected, connection ?? nearestJoin(selected, snapDistance));
    paint(selected);
  });

  board.addEventListener('pointerdown', event => {
    if (event.target === board && !gesture) select(null);
  });
  function binAt(event) {
    return bins.find(bin => {
      const rect = bin.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
  }

  function highlightBin(target, key) {
    for (const bin of bins) {
      if (bin === target) bin.dataset.target = bin.dataset.bin === key ? 'match' : 'wrong';
      else delete bin.dataset.target;
    }
  }

  function updateCount(bin) {
    const key = bin.dataset.bin;
    const count = stock[key];
    const label = count + (count === 1 ? ' piece' : ' pieces');
    bin.querySelector('.bin-count').textContent = label;
    bin.setAttribute('aria-label', types[key].name + ' bin, ' + label);
  }

  function sortPiece(piece, bin) {
    pieces.splice(pieces.indexOf(piece), 1);
    select(null);
    piece.button.remove();
    stock[piece.key] += 1;
    updateCount(bin);
    hint.textContent = instructions;
    bin.focus({ preventScroll: true });
  }

  for (const bin of bins) {
    bin.addEventListener('click', () => {
      const key = bin.dataset.bin;
      if (stock[key] === 0) {
        hint.textContent = 'The ' + key + ' bin is empty. Drag a matching piece into it first.';
        return;
      }
      stock[key] -= 1;
      updateCount(bin);
      hint.textContent = instructions;
      const piece = createPiece(key, board.clientWidth * .63, board.clientHeight * .7);
      piece.button.focus({ preventScroll: true });
    });
  }

  window.addEventListener('resize', () => {
    const width = board.clientWidth;
    const height = board.clientHeight;
    for (const piece of pieces) {
      piece.x += (width - boardSize.width) / 2;
      piece.y += (height - boardSize.height) / 2;
      paint(piece);
    }
    boardSize = { width, height };
  });

  const mix = ['curved', 'straight', 'curved', 'straight', 'curved', 'straight',
    'curved', 'straight', 'curved', 'straight', 'curved', 'straight'];
  for (let index = mix.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [mix[index], mix[other]] = [mix[other], mix[index]];
  }
  const compact = boardSize.width < 640;
  const spread = Math.min(77, boardSize.width * .16, boardSize.height * .17);
  const centerX = boardSize.width * (compact ? .5 : .26);
  const centerY = boardSize.height * (compact ? .33 : .44);
  mix.forEach((key, index) => {
    const x = centerX + (index % 4 - 1.5 + (Math.random() - .5) * .45) * spread;
    const y = centerY + (Math.floor(index / 4) - 1 + (Math.random() - .5) * .45) * spread;
    createPiece(key, x, y, Math.random() * Math.PI * 2);
  });
})();
