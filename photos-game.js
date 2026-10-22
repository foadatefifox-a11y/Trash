(() => {
  const choices = document.querySelectorAll('.metal-choice');
  const photos = {
    plastic: {name:'Plastic', image:'../images/plastic.png', position:'center', width:'min(22svh, 178px)', height:'min(42svh, 340px)'},
    paper: {name:'Paper', image:'../images/paper-box.png', position:'center', width:'min(76vw, 440px)', height:'min(42.4vw, 246px)'},
    organic: {name:'Organic', image:'../images/leaf.png', position:'center', width:'min(20.5svh, 166px)', height:'min(42svh, 340px)'},
    metal: {name:'Metal', image:'../images/redbull-can.png', position:'center', width:'min(14.8svh, 120px)'},
  };
  let chosenButton = null;
  const piece = document.querySelector('.photo-piece');
  const guide = document.querySelector('.aim-path');
  const status = document.querySelector('.game-status');
  const instruction = document.querySelector('.aim-hint');
  let last = null;
  const flights = [];
  let photoSize;
  let state = 'hidden', timer = null, pointer = null;
  let start, pull = {x:0,y:0}, anchor, position, rotation = 0;
  const radius = () => piece.getBoundingClientRect().width/2;
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
    instruction.hidden = true;
    status.textContent = '';
  }
  function choose(button) {
    chosenButton = button;
    const photo = photos[button.dataset.photo];
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    piece.style.setProperty('--piece-image', 'url("' + photo.image + '")');
    piece.style.setProperty('--photo-w', photo.width);
    piece.style.setProperty('--photo-h', photo.height || 'min(42svh, 340px)');
    piece.style.backgroundPosition = photo.position;
    piece.setAttribute('aria-label', photo.name + ' photo. Drag back and release to throw after crumpling.');
    resetPhoto();
  }
  choices.forEach(button => button.addEventListener('click', () => choose(button)));
  function crumple() {
    if (state === 'hidden') {
      choose(chosenButton || choices[0]);
    }
    if (state !== 'photo') return;
    state = 'crumpling';
    photoSize = {width:piece.offsetWidth, height:piece.offsetHeight};
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
  }
  // A small downward pull selects and crumples a material without a button.
  [...choices, piece].forEach(element => {
    let gesture = null, suppressClick = false;
    element.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (element === piece && state !== 'photo')) return;
      gesture = {id:event.pointerId, y:event.clientY};
      suppressClick = false;
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id || event.clientY-gesture.y < 10) return;
      event.preventDefault();
      if (element !== piece) choose(element);
      crumple();
      suppressClick = true;
      gesture = null;
    });
    const endGesture = () => { gesture = null; };
    element.addEventListener('pointerup', endGesture);
    element.addEventListener('pointercancel', endGesture);
    element.addEventListener('click', event => {
      if (suppressClick) {
        event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
      }
    }, true);
    element.addEventListener('keydown', event => {
      if (element !== piece && event.key === 'ArrowDown') {
        event.preventDefault(); choose(element); crumple();
      }
    });
  });
  function landingPoint() {
    return {x:Math.max(0,Math.min(innerWidth,anchor.x-pull.x*5)),
      y:Math.max(0,Math.min(innerHeight,anchor.y-pull.y*5))};
  }
  function drawAim() {
    const end = landingPoint();
    guide.setAttribute('d', `M ${position.x} ${position.y} Q ${(position.x+end.x)/2} ${Math.min(position.y,end.y)-120} ${end.x} ${end.y}`);
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
    const thrown = document.createElement('div');
    thrown.className = 'photo-piece crumpled thrown-photo';
    thrown.style.cssText = piece.style.cssText;
    thrown.setAttribute('role','img');
    thrown.setAttribute('aria-label',photos[chosenButton.dataset.photo].name + ' photo');
    document.querySelector('.photo-pile').append(thrown);
    flights.push({node:thrown, from:{...position}, end:landingPoint(), elapsed:0, size:{...photoSize}});
    piece.hidden=true; pointer=null; clearAim(); instruction.hidden=true;
    state='hidden';
    status.textContent='Thrown! Choose a material or throw another.';
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
  function update(dt){
    for(let i=flights.length-1;i>=0;i--){
      const flight=flights[i];
      flight.elapsed+=dt;
      const t=Math.min(1,flight.elapsed/.65);
      const {node,from,end,size}=flight;
      node.style.left=(from.x+(end.x-from.x)*t)+'px';
      node.style.top=(from.y+(end.y-from.y)*t-120*4*t*(1-t))+'px';
      node.style.setProperty('--spin',(t*360)+'deg');
      if(t===1){
        node.style.setProperty('--land-width',size.width*1.4+'px');
        node.style.setProperty('--land-height',size.height*1.4+'px');
        node.className='landed-photo';
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
  window.addEventListener('resize',()=>{
    if(state==='ready'){
      pointer=null;anchor={x:innerWidth/2,y:innerHeight*.83};position={...anchor};pull={x:0,y:0};paint();clearAim();
    }
  });
})();
