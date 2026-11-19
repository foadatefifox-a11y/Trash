(() => {
  const paper = {
    closed: '../images/dirty-paper-closed.webp',
    open: '../images/dirty-paper-open.webp'
  };
  const pile = document.querySelector('.photo-pile');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const piece = document.querySelector('.photo-piece');
  const guide = document.querySelector('.aim-path');
  let last = null;
  const flights = [];
  let pointer = null;
  let start, pull, anchor, position;
  const radius = () => piece.getBoundingClientRect().width/2;
  const paint = () => {
    piece.style.left = position.x + 'px';
    piece.style.top = position.y + 'px';
  };
  function clearAim() { guide.setAttribute('d',''); }
  function resetPaper() {
    if (pointer !== null && piece.hasPointerCapture(pointer)) piece.releasePointerCapture(pointer);
    pointer = null;
    anchor = {x:innerWidth/2, y:innerHeight*.83};
    position = {...anchor};
    pull = {x:0, y:0};
    paint();
    clearAim();
  }
  resetPaper();
  function landingPoint() {
    return {x:Math.max(0,Math.min(innerWidth,anchor.x-pull.x*5)),
      y:Math.max(0,Math.min(innerHeight,anchor.y-pull.y*5))};
  }
  function drawAim() {
    const end = landingPoint();
    guide.setAttribute('d', `M ${position.x} ${position.y} L ${end.x} ${end.y}`);
  }
  piece.addEventListener('pointerdown', event => {
    if(pointer !== null || event.button !== 0)return;
    event.preventDefault(); pointer=event.pointerId;
    piece.setPointerCapture(pointer);
    start={x:event.clientX,y:event.clientY}; pull={x:0,y:0};
  });
  piece.addEventListener('pointermove', event => {
    if(event.pointerId !== pointer)return;
    event.preventDefault();
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    const limit=Math.max(innerWidth,innerHeight)*.35;
    const scale=Math.min(1,limit/Math.max(1,Math.hypot(dx,dy)));
    const r=radius();
    position={x:Math.max(r,Math.min(innerWidth-r,anchor.x+dx*scale)),y:Math.max(r,Math.min(innerHeight-r-8,anchor.y+dy*scale))};
    pull={x:dx*scale,y:dy*scale}; paint(); drawAim();
  });
  function launch() {
    if (Math.hypot(pull.x, pull.y) < 4) { resetPaper(); return; }
    const thrown = document.createElement('div');
    thrown.className = 'photo-piece';
    thrown.style.cssText = piece.style.cssText;
    thrown.style.pointerEvents = 'none';
    thrown.setAttribute('aria-hidden', 'true');
    pile.append(thrown);
    const size = Math.max(70, Math.min(238, innerWidth * .46, innerHeight * .42));
    flights.push({node:thrown, from:{...position}, end:landingPoint(), elapsed:0, size});
    resetPaper();
  }
  piece.addEventListener('pointerup', event => {
    if(event.pointerId!==pointer)return;
    if(piece.hasPointerCapture(pointer))piece.releasePointerCapture(pointer);
    pointer=null; launch();
  });
  piece.addEventListener('pointercancel', event => {
    if (event.pointerId === pointer) resetPaper();
  });
  piece.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();
      if(event.key==='ArrowLeft')pull.x-=8;
      if(event.key==='ArrowRight')pull.x+=8;
      if(event.key==='ArrowDown')pull.y+=8;
      if(event.key==='ArrowUp')pull.y-=8;
      position={x:anchor.x+pull.x,y:anchor.y+pull.y};paint();drawAim();
    } else if(event.key==='Enter'||event.key===' '){event.preventDefault();launch();}
  });
  function unfoldPaper(node, size) {
    node.className = 'landed-photo';
    node.style.setProperty('--land-size', size + 'px');
    const opened = new Image();
    opened.src = paper.open;
    opened.alt = '';
    node.append(opened);
    if (reducedMotion.matches) return;

    const closed = new Image();
    closed.className = 'closed-paper';
    closed.src = paper.closed;
    closed.alt = '';
    node.append(closed);
    const timing = { duration: 580, easing: 'cubic-bezier(.2,.7,.3,1)' };
    opened.animate([
      { opacity: 0, transform: 'perspective(480px) rotateY(-54deg) rotateX(26deg) scale(.28,.34)', clipPath: 'inset(20% 26% 19% 24%)' },
      { opacity: 1, transform: 'perspective(480px) rotateY(9deg) rotateX(-5deg) scale(1.025)', clipPath: 'inset(0%)', offset: .7 },
      { opacity: 1, transform: 'perspective(480px) rotateY(0deg) rotateX(0deg) scale(1)', clipPath: 'inset(0%)' }
    ], timing);
    const collapse = closed.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 1, transform: 'scale(1.08,.84)', offset: .2 },
      { opacity: 0, transform: 'scale(1.24,.62) rotate(-9deg)', offset: .58 },
      { opacity: 0, transform: 'scale(1.24,.62) rotate(-9deg)' }
    ], timing);
    collapse.onfinish = () => closed.remove();
  }
  function update(dt){
    for(let i=flights.length-1;i>=0;i--){
      const flight=flights[i];
      flight.elapsed+=dt;
      const t=Math.min(1,flight.elapsed/.65);
      const {node,from,end,size}=flight;
      node.style.left=(from.x+(end.x-from.x)*t)+'px';
      node.style.top=(from.y+(end.y-from.y)*t)+'px';
      node.style.setProperty('--spin',(t*360)+'deg');
      if(t===1){
        unfoldPaper(node, size);
        flights.splice(i,1);
      }
    }
  }
  function frame(time){
    const dt=last===null?0:Math.min((time-last)/1000,.05);last=time;
    const steps=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<steps;i++)update(dt/steps);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize', resetPaper);
})();
