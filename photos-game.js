(() => {
  const can = document.querySelector('.trashcan');
  const choices = document.querySelectorAll('.metal-choice');
  const photos = {
    metal: {name:'Metal', image:'../images/redbull-can.png', position:'54% center', width:'min(14.8svh, 120px)'},
    cookies: {name:'Plastic and paper', image:'../images/mini-cookies-box.png', position:'71% center', width:'min(29svh, 240px)'}
  };
  let chosenButton = null;
  const control = document.querySelector('.throw-control');
  const piece = document.querySelector('.photo-piece');
  const guide = document.querySelector('.aim-path');
  const status = document.querySelector('.game-status');
  const instruction = document.querySelector('.aim-hint');
  can.style.setProperty('--can-width-limit', innerWidth * 0.7 + 'px');
  let canX = Math.max(0, (innerWidth - can.getBoundingClientRect().width)/2);
  let direction = -1, last = null;
  let state = 'hidden', timer = null, pointer = null;
  let start, pull = {x:0,y:0}, anchor, position, velocity, rotation = 0, catches = 0;
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
  function finish(caught,box) {
    state=caught?'caught':'missed'; piece.hidden=true; clearAim();
    if(caught){
      catches++;
      const stored=document.createElement('div');
      stored.className='stored-piece';
      stored.style.left=Math.max(20,Math.min(80,(position.x-box.left)/box.width*100))+'%';
      stored.style.bottom=(9+(catches-1)%5*7)+'%';
      stored.style.setProperty('--stored-spin',((catches*47)%80-40)+'deg');
      stored.style.setProperty('--piece-image', piece.style.getPropertyValue('--piece-image'));
      stored.style.backgroundPosition = piece.style.backgroundPosition;
      stored.setAttribute('aria-label','Caught ' + photos[chosenButton.dataset.photo].name + ' photo');
      can.append(stored);
      status.textContent='In the bin!';
    }else status.textContent='Missed. Choose a material to try again.';
    control.disabled=false;
    // Restore a fresh photo only when the user chooses metal again.
    state='hidden';
  }
  function update(dt){
    const width=can.getBoundingClientRect().width,limit=innerWidth-width;
    if(limit<=0)canX=limit/2;
    else{
      canX+=direction*Math.max(96,innerWidth*.3)*dt;
      if(canX<=0){canX=0;direction=1;}
      if(canX>=limit){canX=limit;direction=-1;}
    }
    can.style.transform='translate3d('+canX+'px,-50%,0)';
    if(state==='flying'){
      const old={...position},r=radius();
      velocity.y+=gravity()*dt;
      position.x+=velocity.x*dt;position.y+=velocity.y*dt;
      rotation+=velocity.x*dt*.2;paint();
      const box=can.getBoundingClientRect();
      const rim=box.top+box.height*24/260;
      if(velocity.y>0&&old.y<=rim&&position.y>=rim){
        const t=(rim-old.y)/Math.max(.001,position.y-old.y);
        const crossingX=old.x+(position.x-old.x)*t;
        const safeRadius=Math.min(r*.55,box.width*.12);
        if(crossingX>=box.left+safeRadius&&crossingX<=box.right-safeRadius){finish(true,box);return;}
      }
      if(velocity.y>0&&position.y-r>=box.bottom){finish(false,box);return;}
      if(position.y-r>innerHeight+100||position.x<-innerWidth||position.x>innerWidth*2)finish(false,box);
    }
  }
  function frame(time){
    const dt=last===null?0:Math.min((time-last)/1000,.05);last=time;
    // Substeps keep rim collisions reliable even on slower phones.
    const steps=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<steps;i++)update(dt/steps);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize',()=>{
    canX=Math.min(canX,Math.max(0,innerWidth-can.getBoundingClientRect().width));
    if(state==='ready'){
      pointer=null;anchor={x:innerWidth/2,y:innerHeight*.83};position={...anchor};pull={x:0,y:0};paint();clearAim();
    }
  });
})();
