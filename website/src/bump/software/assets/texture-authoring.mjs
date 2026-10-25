// UI artwork is native vector/canvas; it never bakes a person or the phone into a still.
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const save=async(name,c)=>fetch('/save/'+name+'.webp',{method:'POST',body:c.toDataURL('image/webp',.96).split(',')[1]});
const icon=(c,x,y,size,n)=>{c.save();c.translate(x,y);c.scale(size/32,size/32);c.lineWidth=1.7;c.strokeStyle='#355c56';c.beginPath();if(n%3===0){c.rect(3,3,10,10);c.rect(19,19,10,10);c.moveTo(13,8);c.lineTo(24,8);c.lineTo(24,19);}else if(n%3===1){c.moveTo(11,5);c.lineTo(3,16);c.lineTo(11,27);c.moveTo(21,5);c.lineTo(29,16);c.lineTo(21,27);c.moveTo(18,2);c.lineTo(14,30);}else{c.rect(6,2,20,28);c.moveTo(10,11);c.lineTo(22,11);c.moveTo(10,17);c.lineTo(22,17);c.moveTo(10,23);c.lineTo(18,23);}c.stroke();c.restore();};
try{
 const book=canvas(1024,1024),c=book.getContext('2d');c.fillStyle='#e9e7da';c.fillRect(0,0,1024,1024);
 const names=['Données','API','Processus','CRM','Votre équipe','Logiciel'];
 for(let row=0;row<6;row++)for(let col=0;col<6;col++){
  const x=10+col*168,y=112+row*150,w=150,h=136;c.fillStyle=(row+col)%4===0?'#dce2d4':'#f7f1e4';c.fillRect(x,y,w,h);c.strokeStyle='#b7b5a0';c.lineWidth=1.5;c.strokeRect(x+.5,y+.5,w,h);icon(c,x+48,y+20,56,row+col);c.fillStyle='#354e47';c.font='19px Georgia';c.textAlign='center';c.fillText(names[(row+col)%6],x+w/2,y+105);c.fillStyle='#bcaa7d';c.fillRect(x+48,y+117,54,2);
 }
 c.textAlign='center';c.fillStyle='#657465';c.font='20px Georgia';c.fillText('LE CARNET DES POSSIBILITÉS',512,63);await save('book-pages-v1',book);
 const card=canvas(512,512),k=card.getContext('2d');k.fillStyle='#f0ead9';k.fillRect(0,0,512,512);k.strokeStyle='#a89b73';k.lineWidth=4;k.strokeRect(18,18,476,476);icon(k,185,70,142,1);k.textAlign='center';k.fillStyle='#284a45';k.font='38px Georgia';k.fillText('Votre logiciel',256,286);k.font='23px Georgia';k.fillText('Données · Outils · Équipe',256,337);k.fillStyle='#b8a475';k.fillRect(110,382,292,3);await save('folio-card-v1',card);
 window.__assetReady=true;
}catch(e){window.__assetError=e.stack;}
