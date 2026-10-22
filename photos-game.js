(() => {
  const choices = document.querySelectorAll('.metal-choice');
  const photos = {
    metal: {name:'Metal', image:'../images/redbull-can.png', position:'center', width:'min(14.8svh, 120px)'},
  };
  let chosenButton = null;
  const control = document.querySelector('.throw-control');
  const piece = document.querySelector('.photo-piece');
  const guide = document.querySelector('.aim-path');
  const status = document.querySelector('.game-status');
  const instruction = document.querySelector('.aim-hint');
  let last = null;
  let state = 'hidden', timer = null, pointer = null;
  let start, pull = {x:0,y:0}, anchor, position, velocity, rotation = 0;
  const radius = () => piece.getBoundingClientRect().width/2;
  const gravity = () => innerHeight * 1.5;
  const paint = () => {
    piece.style.left = position.x + 'px';
    piece.style.top = position.y + 'px';
    piece.style.setProperty('--spin', rotation + 'deg');
  };
  function clearAim() { guide.setAttribute('d',''); }
  function resetPhoto() {
    clearTimeout(timer); pointer = null; clearAim();
    state = 'photo';
    piece.hidden = false;
    piece.className = 'photo-piece';
    piece.style.removeProperty('left'); piece.style.removeProperty('top');
    piece.style.removeProperty('--spin');
    control.disabled = false;
    instruction.hidden = true;
    status.textContent = '';
  }
  function choose(button) {
    chosenButton = button;
    const photo = photos[button.dataset.photo];
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    piece.style.setProperty('--piece-image', 'url("' + photo.image + '")');
    piece.style.setProperty('--photo-w', photo.width);
    piece.style.backgroundPosition = photo.position;
    piece.setAttribute('aria-label', photo.name + ' photo. Drag back and release to throw after crumpling.');
    resetPhoto();
  }
  choices.forEach(button => button.addEventListener('click', () => choose(button)));
  control.addEventListener('click', () => {
    if (state === 'hidden') {
      choose(chosenButton || choices[0]);
    }
    if (state !== 'photo') return;
    state = 'crumpling'; control.disabled = true;
    piece.classList.add('crumpling');
    timer = setTimeout(() => {
      state = 'ready';
      piece.className = 'photo-piece crumpled';
      anchor = {x:innerWidth/2,y:innerHeight*0.83};
      position = {...anchor}; rotation = 0; paint();
      instruction.hidden = false;
      status.textContent = 'Drag the ball back, aim, and release.';
      piece.focus({preventScroll:true});
    }, 600);
  });
  function drawAim() {
    const vx = -pull.x*14, vy = -pull.y*14;
    let d = 'M '+position.x+' '+position.y;
    for(let t=.05;t<=1.5;t+=.05){
      const x=position.x+vx*t,y=position.y+vy*t+.5*gravity()*t*t;
      d += ' L '+x+' '+y;
      if(y>innerHeight)break;
    }
    guide.setAttribute('d',d);
  }
  piece.addEventListener('pointerdown', event => {
    if(state!=='ready'||event.button!==0)return;
    event.preventDefault(); pointer=event.pointerId;
    piece.setPointerCapture(pointer);
    start={x:event.clientX,y:event.clientY}; pull={x:0,y:0};
  });
  piece.addEventListener('pointermove', event => {
    if(event.pointerId!==pointer||state!=='ready')return;
    event.preventDefault();
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    const limit=Math.min(innerWidth*.3,innerHeight*.2);
    const scale=Math.min(1,limit/Math.max(1,Math.hypot(dx,dy)));
    const r=radius();
    position={x:Math.max(r,Math.min(innerWidth-r,anchor.x+dx*scale)),y:Math.max(r,Math.min(innerHeight-r-8,anchor.y+dy*scale))};
    pull={x:position.x-anchor.x,y:position.y-anchor.y}; paint(); drawAim();
  });
  function launch() {
    if(state!=='ready')return;
    if(Math.hypot(pull.x,pull.y)<4){position={...anchor};paint();clearAim();return;}
    velocity={x:-pull.x*14,y:-pull.y*14};
    state='flying'; pointer=null; clearAim(); instruction.hidden=true;
    status.textContent='';
  }
  piece.addEventListener('pointerup', event => {
    if(event.pointerId!==pointer)return;
    if(piece.hasPointerCapture(pointer))piece.releasePointerCapture(pointer);
    pointer=null; launch();
  });
  piece.addEventListener('pointercancel',()=>{
    pointer=null; if(state==='ready'){position={...anchor};paint();clearAim();}
  });
  piece.addEventListener('keydown',event=>{
    if(state!=='ready')return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();
      if(event.key==='ArrowLeft')pull.x-=8;
      if(event.key==='ArrowRight')pull.x+=8;
      if(event.key==='ArrowDown')pull.y+=8;
      if(event.key==='ArrowUp')pull.y-=8;
      position={x:anchor.x+pull.x,y:anchor.y+pull.y};paint();drawAim();
    } else if(event.key==='Enter'||event.key===' '){event.preventDefault();launch();}
  });
  function finish() {
    piece.hidden=true; clearAim();
    status.textContent='Thrown! Choose a material to throw again.';
    control.disabled=false;
    state='hidden';
  }
  function update(dt){
    if(state==='flying'){
      const r=radius();
      velocity.y+=gravity()*dt;
      position.x+=velocity.x*dt;position.y+=velocity.y*dt;
      rotation+=velocity.x*dt*.2;paint();
      if(position.y-r>innerHeight+100||position.x<-innerWidth||position.x>innerWidth*2)finish();
    }
  }
  function frame(time){
    const dt=last===null?0:Math.min((time-last)/1000,.05);last=time;
    const steps=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<steps;i++)update(dt/steps);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize',()=>{
    if(state==='ready'){
      pointer=null;anchor={x:innerWidth/2,y:innerHeight*.83};position={...anchor};pull={x:0,y:0};paint();clearAim();
    }
  });
})();
