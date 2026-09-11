window.ZpropBioDrag = ({container,onOrder,onFinish,announce}) => {
  let drag=null,frame=0;
  const animations=new Map();
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards=()=>[...container.children].filter(el=>el.dataset.blockId && el!==drag?.card);
  const ids=()=>[...container.children].filter(el=>el!==drag?.card && (el.dataset.blockId || el.dataset.dropId)).map(el=>Number(el.dataset.blockId || el.dataset.dropId));
  function stopAnimations() {for(const animation of animations.values())animation.cancel();animations.clear();}
  function animate(card,from,to,duration=180) {
    if(reduced())return;
    const animation=card.animate([from,to],{duration,easing:'cubic-bezier(.2,.8,.2,1)'});
    animations.set(card,animation);
    animation.onfinish=()=>{if(animations.get(card)===animation)animations.delete(card);};
  }
  function place() {
    const others=cards();
    // Hit testing uses the resting layout, independent of the swap animation.
    const before=others.find(el=>{
      const box=el.getBoundingClientRect();
      const transform=getComputedStyle(el).transform;
      const shift=transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
      return drag.y < box.top-shift+box.height/2;
    });
    const old=ids().join();
    const positions=new Map(others.map(el=>[el,el.getBoundingClientRect().top]));
    container.insertBefore(drag.slot,before||null);
    if(ids().join()===old)return;
    stopAnimations();
    for(const el of others) {
      const delta=positions.get(el)-el.getBoundingClientRect().top;
      if(Math.abs(delta)>1)animate(el,{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'});
    }
    onOrder(ids());
  }
  function follow() {
    drag.card.style.transform='translate3d('+(drag.x-drag.startX)+'px,'+(drag.y-drag.startY)+'px,0)'+(reduced()?'':' scale(1.015)');
  }
  function tick() {
    if(!drag)return;
    const speed=drag.moved?(drag.y<70?-14:drag.y>innerHeight-70?14:0):0;
    if(speed){const previous=scrollY;window.scrollBy(0,speed);if(scrollY!==previous)place();}
    frame=requestAnimationFrame(tick);
  }
  function finish(cancel=false) {
    if(!drag)return;
    const current=drag;
    const floating=current.card.getBoundingClientRect();
    const order=ids();
    drag=null;cancelAnimationFrame(frame);stopAnimations();
    try{current.handle.releasePointerCapture(current.pointerId);}catch{}
    current.card.classList.remove('is-dragging');
    if(current.style===null)current.card.removeAttribute('style');else current.card.setAttribute('style',current.style);
    container.insertBefore(current.card,current.slot);current.slot.remove();
    document.documentElement.classList.remove('bio-dragging');
    if(cancel && order.join()!==current.original.join())onOrder(current.original);
    onFinish();
    const card=container.querySelector('[data-block-id="'+current.id+'"]');
    if(card) {
      const target=card.getBoundingClientRect();
      animate(card,{transform:'translate('+(floating.left-target.left)+'px,'+(floating.top-target.top)+'px) scale('+(floating.width/target.width)+')',transformOrigin:'top left'},{transform:'translate(0,0) scale(1)',transformOrigin:'top left'},200);
      card.querySelector('.bio-drag-handle')?.focus({preventScroll:true});
    }
    announce(ids().indexOf(current.id)+1);
  }
  container.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.bio-drag-handle');
    if(drag||!handle||event.button!==0||!event.isPrimary||handle.disabled||handle.closest('fieldset')?.disabled)return;
    stopAnimations();
    const card=handle.closest('.bio-block'),box=card.getBoundingClientRect(),original=ids();
    const slot=document.createElement('div');slot.className='bio-drop-slot';slot.dataset.dropId=card.dataset.blockId;slot.setAttribute('aria-hidden','true');
    slot.style.height=box.height+'px';slot.style.marginBottom=getComputedStyle(card).marginBottom;
    const style=card.getAttribute('style');
    container.insertBefore(slot,card);
    drag={handle,card,slot,style,id:Number(card.dataset.blockId),pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,original,moved:false};
    Object.assign(card.style,{position:'fixed',top:box.top+'px',left:box.left+'px',width:box.width+'px',height:box.height+'px',margin:'0',zIndex:'1000',transformOrigin:(event.clientX-box.left)+'px '+(event.clientY-box.top)+'px'});
    card.classList.add('is-dragging');document.documentElement.classList.add('bio-dragging');
    handle.focus({preventScroll:true});handle.setPointerCapture(event.pointerId);follow();
    frame=requestAnimationFrame(tick);
    event.preventDefault();
  });
  container.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    drag.x=event.clientX;drag.y=event.clientY;
    if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>4)drag.moved=true;
    event.preventDefault();follow();if(drag.moved)place();
  });
  container.addEventListener('pointerup',event=>{if(drag?.pointerId===event.pointerId)finish();});
  container.addEventListener('pointercancel',event=>{if(drag?.pointerId===event.pointerId)finish(true);});
  container.addEventListener('lostpointercapture',event=>{if(drag?.pointerId===event.pointerId)finish(true);});
  window.addEventListener('blur',()=>finish(true));
  window.addEventListener('resize',()=>finish(true));
  document.addEventListener('keydown',event=>{
    if(drag&&['Escape','Tab'].includes(event.key)){if(event.key==='Escape')event.preventDefault();finish(true);}
  });
  container.addEventListener('keydown',event=>{
    const handle=event.target.closest('.bio-drag-handle');if(drag||!handle||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const order=ids(),id=Number(handle.closest('.bio-block').dataset.blockId),from=order.indexOf(id),to=from+(event.key==='ArrowUp'?-1:1);
    if(to<0||to>=order.length)return;
    [order[from],order[to]]=[order[to],order[from]];onOrder(order);onFinish();container.querySelector('[data-block-id="'+id+'"] .bio-drag-handle').focus();announce(to+1);
  });
};

