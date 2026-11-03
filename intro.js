// New intro: ring draws itself, 60 ticks pop in, hands spin to 10:10, ALBERTO reveals letter by letter, curtains part.
(function(){
  var NS='http://www.w3.org/2000/svg',t=document.getElementById('ticks'),intro=document.getElementById('intro');
  for(var i=0;i<60;i++){
    var big=i%5===0,a=i*6*Math.PI/180,r1=big?138:148,r2=158,l=document.createElementNS(NS,'line');
    [['x1',200+r1*Math.sin(a)],['y1',200-r1*Math.cos(a)],['x2',200+r2*Math.sin(a)],['y2',200-r2*Math.cos(a)],['stroke-width',big?4:1.5]].forEach(function(p){l.setAttribute(p[0],p[1]);});
    l.setAttribute('class','itick');l.style.animationDelay=(0.8+i*0.015)+'s';t.appendChild(l);
  }
  var w=document.getElementById('introWord');
  'ALBERTO'.split('').forEach(function(ch,i){var s=document.createElement('span');s.textContent=ch;s.style.animationDelay=(2.4+i*0.09)+'s';w.appendChild(s);});
  var closed=false;
  function close(){
    if(closed)return;closed=true;intro.classList.add('open');
    setTimeout(function(){intro.classList.add('done');},1300);
  }
  document.getElementById('skipBtn').onclick=close;
  setTimeout(close,5000);
})();
