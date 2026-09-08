window.ZpropBioDrag = ({container,onOrder,onFinish,announce}) => {
  let drag=null,frame=0;
  const ids=()=>[...container.children].filter(el=>el.dataset.blockId).map(el=>Number(el.dataset.blockId));
  function place(y) {
    const others=[...container.querySelectorAll('.bio-block')].filter(el=>el!==drag.card);
    const before=others.find(el=>{const box=el.getBoundingClientRect();return y<box.top+box.height/2;});
    const old=ids().join();
    container.insertBefore(drag.card,before||null);
    // Moving a captured element can reset capture in some browsers.
    try{drag.handle.setPointerCapture(drag.pointerId);}catch{}
    if(ids().join()!==old)onOrder(ids());
  }
  function tick() {
    if(!drag?.active)return;
    const speed=drag.y<70?-14:drag.y>innerHeight-70?14:0;
    if(speed){window.scrollBy(0,speed);place(drag.y);}
    frame=requestAnimationFrame(tick);
  }
  function finish(cancel=false) {
    if(!drag)return;
    const current=drag;drag=null;cancelAnimationFrame(frame);
    current.card.classList.remove('is-dragging');
    try{current.handle.releasePointerCapture(current.pointerId);}catch{}
    if(current.active){if(cancel)onOrder(current.original);onFinish();container.querySelector(`[data-block-id="${current.id}"] .bio-drag-handle`)?.focus({preventScroll:true});announce(ids().indexOf(current.id)+1);}
  }
  container.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.bio-drag-handle');
    if(!handle||event.button!==0||!event.isPrimary||handle.disabled||handle.closest('fieldset')?.disabled)return;
    const card=handle.closest('.bio-block');
    drag={handle,card,id:Number(card.dataset.blockId),pointerId:event.pointerId,y:event.clientY,start:event.clientY,original:ids(),active:false};
    handle.setPointerCapture(event.pointerId);
  });
  container.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    drag.y=event.clientY;
    if(!drag.active&&Math.abs(drag.y-drag.start)>5){drag.active=true;drag.card.classList.add('is-dragging');frame=requestAnimationFrame(tick);}
    if(drag.active){event.preventDefault();place(drag.y);}
  });
  container.addEventListener('pointerup',event=>{if(drag?.pointerId===event.pointerId)finish();});
  container.addEventListener('pointercancel',event=>{if(drag?.pointerId===event.pointerId)finish(true);});
  container.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&drag){event.preventDefault();finish(true);return;}
    const handle=event.target.closest('.bio-drag-handle');if(!handle||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const order=ids(),id=Number(handle.closest('.bio-block').dataset.blockId),from=order.indexOf(id),to=from+(event.key==='ArrowUp'?-1:1);
    if(to<0||to>=order.length)return;
    [order[from],order[to]]=[order[to],order[from]];onOrder(order);onFinish();container.querySelector(`[data-block-id="${id}"] .bio-drag-handle`).focus();announce(to+1);
  });
};
