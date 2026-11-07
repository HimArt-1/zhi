import * as T from './vendor/three.js';
import { RoundedBoxGeometry } from './vendor/rounded-box.js';
import { buildCarrera } from './carrera.js';

const V = (...values) => new T.Vector3(...values);
const clamp = T.MathUtils.clamp;
const pi = Math.PI;
const staircase = { x: -6.08, z: -4.10, radius: 1.53 };
const fixed = [
  { eye: [1.95, 2.10, 4.74], at: [-2.45, 1.00, .44], pin: [-2.08, 1.77, .48] },
  { eye: [4.5, 2.3, 2.1], at: [2.15, 1.6, -3.65], pin: [2.1, 1.12, -3.6] },
  { eye: [2.3, 2.35, 5.3], at: [5.65, 1.5, .35], pin: [5.6, .76, .35] },
  { eye: [7.2, 3.1, 10.6], at: [0, 2.17, -2.7], pin: [0, 4.95, -2.95] }
];
function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function imageTexture(size, paint) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function material(color, roughness = .8, other = {}) {
  return new T.MeshStandardMaterial({ color, roughness, ...other });
}
function geometryMesh(group, geometry, mat, x = 0, y = 0, z = 0, shadow = true) {
  const obj = new T.Mesh(geometry, mat);
  obj.position.set(x, y, z);
  obj.castShadow = shadow; obj.receiveShadow = true;
  group.add(obj);
  return obj;
}
const cube = new T.BoxGeometry(1,1,1);
const ball = new T.SphereGeometry(1,20,12);
const disc = new T.CylinderGeometry(1,1,1,40);
function box(group, x, y, z, w, h, d, mat, radius = 0, shadow = true) {
  if (radius) return geometryMesh(group, new RoundedBoxGeometry(w,h,d,3,radius), mat, x,y,z,shadow);
  const mesh = geometryMesh(group,cube,mat,x,y,z,shadow);
  mesh.scale.set(w,h,d); return mesh;
}
function ell(group,x,y,z,w,h,d,mat,shadow=true) {
  const mesh=geometryMesh(group,ball,mat,x,y,z,shadow);
  mesh.scale.set(w,h,d); return mesh;
}
function cyl(group,x,y,z,r,h,mat,shadow=true) {
  const mesh=geometryMesh(group,disc,mat,x,y,z,shadow);
  mesh.scale.set(r,h,r); return mesh;
}
function rod(group, a, b, r, mat) {
  const start = V(...a), end = V(...b), delta = end.clone().sub(start);
  const mid = start.clone().addScaledVector(delta,.5);
  const mesh = cyl(group,mid.x,mid.y,mid.z,r,delta.length(),mat);
  mesh.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());
  return mesh;
}
function roundShape(w,h,r) {
  const x=-w/2,y=-h/2,s=new T.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);
  s.quadraticCurveTo(x,y,x+r,y);return s;
}
function plaque(g,x,y,z,w,h,r,mat) {
  return geometryMesh(g,new T.ExtrudeGeometry(roundShape(w,h,r),{depth:.035,bevelEnabled:false,curveSegments:12}),mat,x,y,z);
}
function tiled(g,w,d,x,z,tile,dy=0) {
  const nx=Math.ceil(w/.88), nz=Math.ceil(d/.82), dx=w/nx,dz=d/nz;
  const floor = new T.InstancedMesh(cube,tile,nx*nz);
  const rand=random(64);
  const m=new T.Matrix4(), q=new T.Quaternion(), p=V(0,0,0), scale=V(dx-.017,.08,dz-.017);
  const hue=new T.Color();
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    p.set(x-w/2+(i+.5)*dx,dy-.043,z-d/2+(j+.5)*dz);
    m.compose(p,q,scale);floor.setMatrixAt(i*nz+j,m);
    hue.setScalar(.79+rand()*.18);floor.setColorAt(i*nz+j,hue);
  }
  floor.receiveShadow=true;g.add(floor);
}
function makeMaterials(brandImage) {
  const logo = document.createElement('canvas');
  logo.width = brandImage.naturalWidth;
  logo.height = brandImage.naturalHeight;
  const logoInk = logo.getContext('2d');
  logoInk.drawImage(brandImage,0,0);
  logoInk.globalCompositeOperation = 'source-in';
  logoInk.fillStyle = '#fff';
  logoInk.fillRect(0,0,logo.width,logo.height);
  const brand = new T.CanvasTexture(logo);
  brand.colorSpace = T.SRGBColorSpace;
  const marble=imageTexture(384,(ctx,n)=>{
    const img=ctx.createImageData(n,n), rand=random(53);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=(y*n+x)*4;
      const wave=x*.128+y*.071+Math.sin(y*.041+x*.016)*2.1+Math.sin(x*.046-y*.023)*1.3+Math.sin((y+x)*.135)*.42;
      const thin=Math.pow(.5+.5*Math.sin(wave*2.5+Math.sin(y*.13)),12);
      const layer=Math.pow(.5+.5*Math.sin(wave*.47),2.2), shade=1-(layer*.67+thin*.15);
      const grain=rand()*14;
      img.data.set([70+shade*155+grain,78+shade*145+grain,66+shade*139+grain,255],i);
    }
    ctx.putImageData(img,0,0);
  });
  const wood=imageTexture(256,(ctx,n)=>{
    const img=ctx.createImageData(n,n), rand=random(31);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=(y*n+x)*4;
      const g=Math.sin(x*.12+Math.sin(y*.024)*.76)*12+Math.sin(x*.94+Math.cos(y*.055)*.43)*8+rand()*11;
      img.data.set([100+g,65+g*.81,44+g*.61,255],i);
    }
    ctx.putImageData(img,0,0);
  });
  const sand=imageTexture(128,(ctx,n)=>{
    const rand=random(67),img=ctx.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const mottling=4*Math.sin(x*.094+Math.sin(y*.08))+2.6*Math.cos(y*.25+x*.063);
      const k=mottling+rand()*11-5.5;
      img.data.set([208+k,192+k,165+k,255],(y*n+x)*4);
    }
    ctx.putImageData(img,0,0);
  });
  const canvas=imageTexture(128,(ctx,n)=>{
    ctx.fillStyle='#e6ddc6';ctx.fillRect(0,0,n,n);
    ctx.fillStyle='#aa9f7c38';
    for(let i=0;i<n;i+=3){ctx.fillRect(i,0,1,n);ctx.fillRect(0,i,n,1);}
  });
  const shade=imageTexture(128,(ctx,n)=>{
    const g=ctx.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
    g.addColorStop(0,'rgba(30,25,17,.53)');g.addColorStop(.55,'rgba(30,25,17,.25)');g.addColorStop(1,'rgba(30,25,17,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,n,n);
  });
  const daylight=imageTexture(256,(ctx,n)=>{
    const sky=ctx.createLinearGradient(0,0,n*.30,n);
    sky.addColorStop(0,'#d9e6e4');
    sky.addColorStop(.55,'#f8ecce');
    sky.addColorStop(1,'#aaad86');
    ctx.fillStyle=sky;
    ctx.fillRect(0,0,n,n);
    const leaves=random(108);
    for(let i=0;i<100;i++){
      const x=leaves()*n, y=n*(.57+leaves()*.47);
      ctx.fillStyle='rgba(87,103,74,.075)';
      ctx.beginPath();
      ctx.ellipse(x,y,7+leaves()*23,4+leaves()*13,leaves()*pi,0,pi*2);
      ctx.fill();
    }
  });
  return {
    brand, plaster:material(0xefe4d0), ceiling:material(0xf9edd8), walnut:material(0xffffff,.46,{map:wood}),
    walnutDark:material(0x594434,.6,{map:wood}), sand:material(0xffffff,.8,{map:sand,bumpMap:sand,bumpScale:.022}),
    dark:material(0x252722), frame:material(0x33382d,.38,{metalness:.38}),
    chrome:material(0xc7c4b5,.21,{metalness:.83}),
    glass:material(0x282d26,.16,{metalness:.62,envMapIntensity:1.2}),
    amber:material(0xffe3aa,.42,{emissive:0xffd399,emissiveIntensity:1.1}),
    brass:material(0xb59b65,.3,{metalness:.57}), porcelain:material(0xeee7d3,.24),
    ceramicGreen:material(0x68754c,.38,{metalness:.10}),
    marble:material(0xffffff,.29,{map:marble,bumpMap:marble,bumpScale:.009}),
    daylight:new T.MeshBasicMaterial({map:daylight}),
    canvas:material(0xffffff,.94,{map:canvas,side:T.DoubleSide}),
    shade:new T.MeshBasicMaterial({map:shade,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})
  };
}
function shadow(g,x,z,w,d,m,y=.004){
  const blob=geometryMesh(g,new T.PlaneGeometry(w,d),m,x,y,z,false);blob.rotation.x=-pi/2;
}
function placeCarrera(group, model, x, y, z, angle, shade) {
  const car = model.clone();
  car.position.set(x, y, z);
  car.rotation.y = angle;
  group.add(car);
  shadow(car, 0, 0, 2.65, 5.18, shade, .007);
  for (const [axleZ, halfTrack] of [[-1.28,.759],[1.17,.772]]) {
    for (const side of [-1,1]) shadow(car, side*halfTrack, axleZ, .59, .73, shade, .009);
  }
}
function director(g,x,z,angle,m,s=1) {
  const chair=new T.Group();chair.position.set(x,0,z);chair.rotation.y=angle;chair.scale.setScalar(s);g.add(chair);
  for(const x of [-.255,.255]){
    rod(chair,[x,.025,-.25],[x,.51,.23],.018,m.frame);
    rod(chair,[x,.025,.25],[x,.52,-.22],.018,m.frame);
    rod(chair,[x,.46,-.22],[x,.96,-.24],.017,m.frame);
    rod(chair,[x,.44,.21],[x,.67,.19],.017,m.frame);
    box(chair,x,.674,-.018,.054,.036,.46,m.walnut,.016);
  }
  rod(chair,[-.255,.46,.22],[.255,.46,.22],.018,m.frame);
  box(chair,0,.461,-.015,.49,.035,.43,m.canvas,.016);
  box(chair,0,.812,-.236,.5,.232,.021,m.canvas,.009).rotation.x=-.09;
  shadow(chair,0,0,.86,.82,m.shade);
}
function table(g,x,z,m) {
  cyl(g,x,.037,z,.27,.048,m.frame);cyl(g,x,.33,z,.052,.6,m.frame);
  cyl(g,x,.65,z,.44,.059,m.walnut);
  cup(g,x+.13,.68,z-.075,m,.80);
  shadow(g,x,z,1.05,1.05,m.shade);
}
function cup(g,x,y,z,m,s=1) {
  const profile=[V(.035,0),V(.043,.014),V(.054,.084),V(.057,.089),V(.05,.088),V(.045,.075),V(.03,.01)];
  geometryMesh(g,new T.LatheGeometry(profile.map(p=>new T.Vector2(p.x*s,p.y*s)),18),m.porcelain,x,y,z,false);
  const handle=geometryMesh(g,new T.TorusGeometry(.023*s,.006*s,6,16),m.porcelain,x+.057*s,y+.043*s,z,false);
  handle.scale.set(.92,1.05,1);
  cyl(g,x,y+.071*s,z,.043*s,.005,material(0x5a3827),false);
}
function oliveTree(g,x,z,m,seed=55,s=1) {
  const tree=new T.Group();tree.position.set(x,0,z);tree.scale.setScalar(s);g.add(tree);
  const pot=geometryMesh(tree,new T.CylinderGeometry(.25,.18,.43,20),m.porcelain,0,.22,0);
  pot.receiveShadow=true;cyl(tree,0,.439,0,.21,.012,m.dark);
  const r=random(seed);const twig=material(0x6f593e),leaf=material(0x687349,.78,{side:T.DoubleSide});
  const leaves=new T.InstancedMesh(new T.SphereGeometry(1,7,4),leaf,120);
  const part=new T.Object3D();
  for(let j=0;j<10;j++){
    const a=j*2.39,h=1.2+r()*.82,rx=Math.sin(a)*(.18+r()*.25),rz=Math.cos(a)*(.18+r()*.25);
    rod(tree,[0,.44,0],[rx,h,rz],.016,twig);
    for(let i=0;i<12;i++){
      part.position.set(rx+(r()-.5)*.48,h+(r()-.5)*.49,rz+(r()-.5)*.45);
      part.rotation.set(r()*pi,r()*pi,r()*pi);
      part.scale.set(.032+r()*.027,.074+r()*.05,.010);
      part.updateMatrix();leaves.setMatrixAt(j*12+i,part.matrix);
      leaves.setColorAt(j*12+i,new T.Color().setHSL(.20+r()*.065,.24+r()*.24,.32+r()*.23));
    }
  }
  tree.add(leaves);shadow(tree,0,0,1.1,1.1,m.shade);
}
function spiral(g,m) {
  const {x,z,radius:r}=staircase;
  const start=-.7,sweep=pi*2.03,n=92;
  const verts=[],uv=[],idx=[];
  for(let i=0;i<=n;i++){
    const t=i/n,a=start+t*sweep;
    for(const h of [0,.88]){verts.push(x+Math.cos(a)*r,.12+t*4.48+h,z+Math.sin(a)*r);uv.push(t*4,h);}
    if(i){const b=2*i;idx.push(b-2,b,b-1,b-1,b,b+1);}
  }
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(verts,3));geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.setIndex(idx);geom.computeVertexNormals();
  const wood=m.walnut.clone();wood.side=T.DoubleSide;
  geometryMesh(g,geom,wood);
  const rail=[];for(let i=0;i<=n;i++){const t=i/n,a=start+t*sweep;rail.push(V(x+Math.cos(a)*r,1+t*4.48,z+Math.sin(a)*r));}
  geometryMesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(rail),n,.034,6,false),m.walnutDark);
  cyl(g,x,2.28,z,.075,4.56,m.walnutDark);
  for(let i=0;i<25;i++){
    const t=i/25,a=start+t*sweep;box(g,x+Math.cos(a)*.81,.12+t*4.48,z+Math.sin(a)*.81,1.39,.09,.31,m.walnut,.015).rotation.y=-a;
  }
}
function zhiSign(g,x,y,z,w,m,light=false) {
  const h=w*m.brand.image.height/m.brand.image.width;
  const ink=new T.MeshBasicMaterial({
    map:m.brand,color:light?0xffe9ac:0xfff5df,alphaTest:.18,toneMapped:false
  });
  return geometryMesh(g,new T.PlaneGeometry(w,h),ink,x,y,z,false);
}
function interior(g,m,carrera) {
  box(g,0,-.091,1.6,16,.16,17,material(0x9e8f77),0,false);
  tiled(g,16,17,0,1.6,m.sand);
  box(g,0,2.8,-6.7,16.2,5.65,.24,m.plaster,0,false);
  box(g,7.95,2.8,1.6,.25,5.65,17.15,m.plaster,0,false);
  box(g,-7.95,2.8,1.6,.25,5.65,17.15,m.plaster,0,false);
  box(g,0,5.68,1.4,16.2,.16,17,m.ceiling,0,false);
  // Close the room behind the exhibit so the reverse view looks toward the glazed entrance.
  box(g,0,2.80,10.09,16.1,5.62,.24,m.plaster,0,false);
  box(g,0,.16,9.91,15.8,.30,.15,m.walnutDark,.018,false);
  for(const x of [-5.34,-3.30,3.30,5.34]){
    box(g,x,2.70,9.91,1.79,3.61,.13,m.walnut,.035,false);
    const pane=geometryMesh(g,new T.PlaneGeometry(1.63,3.43),m.daylight,x,2.70,9.832,false);
    pane.rotation.y=pi;
    box(g,x,2.70,9.81,.031,3.45,.07,m.walnutDark,0,false);
    box(g,x,1.83,9.81,1.64,.038,.07,m.walnutDark,0,false);
  }
  box(g,0,1.99,9.89,2.52,3.95,.17,m.walnut,.025,false);
  for(const x of [-.592,.592]){
    const door=geometryMesh(g,new T.PlaneGeometry(1.02,2.48),m.daylight,x,2.35,9.79,false);
    door.rotation.y=pi;
    box(g,x,1.31,9.76,1.04,.044,.065,m.walnutDark,0,false);
  }
  for(const x of [-.11,.11])box(g,x,1.44,9.72,.042,.29,.055,m.brass,.012);
  oliveTree(g,-2.37,9.18,m,21,.94);
  oliveTree(g,2.37,9.18,m,69,.89);
  // Warm daylight in the tall recessed window bays.
  for(const z of [-3.6,-1.65,.3,2.25,4.2]){
    box(g,-7.80,2.91,z,.085,4.46,1.76,m.walnut,0,false);
    const pane=geometryMesh(g,new T.PlaneGeometry(1.55,4.23),m.daylight,-7.748,2.94,z,false);
    pane.rotation.y=pi/2;
    box(g,-7.69,2.94,z,.08,4.25,.037,m.walnutDark,0,false);
    box(g,-7.69,1.96,z,.08,.032,1.56,m.walnutDark,0,false);
  }
  for(const x of [-3.38,.15,6.95])box(g,x,2.79,-5.97,.56,5.57,1.26,m.plaster,.06);
  box(g,2.80,2.53,-6.51,5.2,4.42,.23,m.walnut,0,false);
  for(let i=0;i<40;i++)box(g,.27+i*.13,4.38,-6.36,.013,.52,.015,m.walnutDark,0,false);
  for(const y of [1.55,2.27,2.98]){
    box(g,3.23,y,-6.18,3.32,.07,.48,m.walnut,.014);
    box(g,3.23,y-.041,-5.99,3.22,.017,.026,m.amber,0,false);
    for(let j=0;j<8;j++)cup(g,1.9+j*.37,y+.035,-6.15,m,1.35);
  }
  zhiSign(g,2.88,3.69,-6.32,1.77,m);
  box(g,2.74,.59,-3.75,5.46,1.16,1.06,m.marble,.35);
  box(g,2.74,1.183,-3.75,5.53,.10,1.13,m.marble,.04);
  box(g,2.74,.12,-3.72,5.24,.19,1.03,m.frame,.03);
  box(g,2.42,1.465,-3.78,1.42,.46,.55,m.frame,.07);
  box(g,2.42,1.45,-3.485,1.25,.26,.06,m.chrome,.028);
  for(let j=0;j<3;j++){
    const x=1.99+j*.4;box(g,x,1.41,-3.44,.25,.10,.09,m.dark,.025);
    cup(g,x,1.697,-3.7,m,1.2);cup(g,x,1.245,-3.39,m);
  }
  for(const x of [1.11,4.03]){
    box(g,x,1.37,-3.78,.27,.28,.31,m.dark,.045);
    cyl(g,x,1.64,-3.78,.092,.25,m.glass);
    cyl(g,x,1.78,-3.78,.094,.03,m.chrome);
  }
  for(const x of [.42,.64,4.68,4.93])cup(g,x,1.237,-3.57,m,1.4);
  for(const x of [.87,2.74,4.65]){
    rod(g,[x,5.59,-3.81],[x,3.48,-3.81],.013,m.frame);
    geometryMesh(g,new T.CylinderGeometry(.092,.31,.18,32),m.frame,x,3.40,-3.81);
    cyl(g,x,3.30,-3.81,.26,.018,m.amber,false);
  }
  for(const y of [2.15,2.75,3.35]){
    const plate=cyl(g,7.10,y,-5.92,.145,.052,m.brass);plate.rotation.x=pi/2;
    ell(g,7.10,y,-5.88,.119,.119,.038,m.amber,false);
  }
  spiral(g,m);
  const plinth = new T.Group();
  plinth.position.set(-2.50,0,.40);
  plinth.rotation.y = .14;
  g.add(plinth);
  box(plinth,0,.072,0,3.10,.137,5.19,m.walnutDark,.045);
  box(plinth,0,.158,0,3.22,.064,5.30,m.walnut,.025);
  box(plinth,0,.105,0,3.13,.012,5.22,m.brass,.005);
  placeCarrera(g,carrera,-2.50,.191,.40,.14,m.shade);
  shadow(g,-2.5,.40,4.33,6.30,m.shade);
  for(const [x,z] of [[5.48,-.18],[5.53,2.45]]){
    table(g,x,z,m);director(g,x+.69,z+.22,-1.75,m);director(g,x-.58,z-.30,1.2,m);
  }
  oliveTree(g,6.57,-3.70,m,31,1.22);oliveTree(g,7.26,3.62,m,76,1.1);
}
function facade(g,m,carrera) {
  box(g,0,-.135,1.1,26,.22,22,material(0x9d8b73),0,false);
  box(g,0,-.008,-2.75,19,.15,5.4,m.sand,.04,false);
  tiled(g,19,5.4,0,-2.75,m.sand,.073);
  box(g,0,3.55,-3.98,18.2,7.10,1.1,m.plaster,.07,false);
  box(g,0,4.23,-3.39,18.2,.35,.66,m.ceiling,.075);
  box(g,0,6.88,-3.37,18.24,.45,.66,m.plaster,.09);
  const tiles=[0x778357,0x718051,0x7f8a5c,0x68754c,0x788257].map(c=>material(c,.43,{metalness:.10}));
  const r=random(45);
  for(let i=0;i<87;i++){
    const x=(i-43)*.203;if(Math.abs(x)<1.48)continue;
    for(let j=0;j<5;j++)box(g,x,.192+j*.212,-3.37,.192,.202,.09,tiles[Math.floor(r()*tiles.length)],0,false);
  }
  for(const [x,w] of [[-4.86,5.15],[4.38,4.82]]){
    plaque(g,x,2.68,-3.35,w,2.91,.47,m.walnut);
    plaque(g,x,2.68,-3.30,w-.21,2.70,.42,m.canvas);
    for(let i=0;i<Math.floor(w/.081);i++){
      const dx=-w/2+.20+i*.081;if(dx>=w/2-.16)break;
      const edge=Math.max(0,Math.abs(dx)-(w/2-.47));
      const h=2.68-edge*2.0;
      box(g,x+dx,2.68,-3.245,.041,h,.032,m.canvas,.015,false);
    }
  }
  box(g,0,1.90,-3.27,2.87,3.68,.28,m.walnut,.035);
  for(const x of [-.65,.65]){
    box(g,x,2.12,-3.09,1.19,2.02,.065,m.glass,.023);
    box(g,x,.69,-3.08,1.18,.81,.10,m.walnut,.03);
    box(g,x,2.07,-3.03,1.20,.04,.028,m.walnutDark);
  }
  const knob=cyl(g,0,1.65,-3.035,.109,.06,m.brass);knob.rotation.x=pi/2;
  box(g,0,4.56,-3.22,3.65,.85,.23,m.walnutDark,.045);
  zhiSign(g,0,4.58,-3.079,1.93,m,true);
  for(const x of [-1.76,1.76]){
    box(g,x,2.64,-3.20,.13,.37,.14,m.ceramicGreen,.035);
    box(g,x,2.84,-3.18,.13,.13,.15,m.amber,.035);
  }
  for(const [x,z] of [[-5.24,-2.14],[-3.72,-2.38],[4.53,-2.38]]){
    const seating=new T.Group();seating.position.set(x,.07,z);g.add(seating);
    table(seating,0,0,m);director(seating,.63,-.06,-1.2,m);director(seating,-.55,-.10,1.25,m);
  }
  oliveTree(g,-1.92,-2.74,m,79,.95);oliveTree(g,7.22,-2.86,m,27,1.35);
  placeCarrera(g,carrera,-.37,.025,1.49,-1.16,m.shade);
}

export function createTour(host,{initial,onLoss,onPins,brandImage}) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.65));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;
  canvas.tabIndex=0;canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','مجسّم زهي. استخدم مفاتيح الأسهم لتغيير الزاوية وعلامتي الجمع والطرح للتقريب.');
  host.append(canvas);
  const scene=new T.Scene();scene.background=new T.Color(0xcab89f);
  const camera=new T.PerspectiveCamera(40,1,.055,90);
  const m=makeMaterials(brandImage), inside=new T.Group(), outside=new T.Group();
  scene.add(inside,outside);outside.visible=false;
  const carrera = buildCarrera();
  interior(inside,m,carrera);
  facade(outside,m,carrera);

  const pmrem=new T.PMREMGenerator(renderer);
  const studio=new T.Scene();studio.background=new T.Color(0x71695a);
  const reflectionPanels = [
    [-6,3.1,-3,.12,4.8,2.0,0xe1efff,1.75],
    [-6,3.1,.1,.12,4.8,2.0,0xe8f3ff,1.9],
    [-6,3.1,3.2,.12,4.8,2.0,0xf5f6ec,1.6],
    [0,7,0,9,.1,4.8,0xffecd3,1.35],
    [4,2.9,-5,5.0,2.3,.12,0xffd9aa,1.4],
    [4,3.5,6,3.9,1.5,.12,0xfaf6e9,1.0]
  ];
  for(const [x,y,z,w,h,d,color,intensity] of reflectionPanels){
    const panel = new T.MeshBasicMaterial({ color:new T.Color(color).multiplyScalar(intensity) });
    box(studio,x,y,z,w,h,d,panel,0,false);
  }
  const env=pmrem.fromScene(studio,.04);scene.environment=env.texture;pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffefdc,0xa18a6e,1.34));
  const sun=new T.DirectionalLight(0xffe0b6,2.33);sun.position.set(-5.5,6.5,6.2);sun.target.position.set(0,0,-1.4);
  sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:24});
  sun.shadow.bias=-.00035;sun.shadow.normalBias=.022;
  scene.add(sun,sun.target);
  const fill=new T.DirectionalLight(0xdce8eb,.76);fill.position.set(5,3,6);scene.add(fill);
  const ambientBar=new T.PointLight(0xffd9a5,22,7,2);ambientBar.position.set(3.2,3.1,-3.25);inside.add(ambientBar);
  const displayLight=new T.SpotLight(0xffedcf,38,11,.58,.77,2);
  displayLight.position.set(-1.42,4.96,2.38);
  displayLight.target.position.set(-2.5,.64,.45);
  inside.add(displayLight,displayLight.target);

  const mirrorTarget=new T.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,type:T.HalfFloatType});
  const mirrorCam=new T.CubeCamera(.1,25,mirrorTarget);mirrorCam.position.set(-.85,5.34,.58);scene.add(mirrorCam);
  renderer.shadowMap.needsUpdate=true;
  mirrorCam.update(renderer,scene);
  const mirror=ell(inside,-.85,5.535,.58,3.74,.035,2.22,material(0xc7b89c,.09,{metalness:1,envMap:mirrorTarget.texture,envMapIntensity:1.4}),false);
  mirror.rotation.y=.25;

  const pos=V(0,0,0), target=V(0,0,0), destination=V(0,0,0), aim=V(0,0,0);
  const sph=new T.Spherical(), home=new T.Spherical(), projected=V(0,0,0), orbitOffset=V(0,0,0);
  let active=false, visible=true, frame=0, drag=null, station=initial, width=0, height=0;
  function request() {
    if (active && visible && !document.hidden && !frame) frame=requestAnimationFrame(draw);
  }
  function draw() {
    frame=0;
    const stillMoving=pos.distanceToSquared(destination)+target.distanceToSquared(aim)>.000075;
    if(stillMoving){pos.lerp(destination,.135);target.lerp(aim,.135);}
    else {pos.copy(destination);target.copy(aim);}
    camera.position.copy(pos);camera.lookAt(target);
    renderer.render(scene,camera);
    onPins(fixed.map(({pin},index)=>{
      if((station===3)!==(index===3))return null;
      projected.set(...pin).project(camera);
      if(projected.z<0||projected.z>1||Math.abs(projected.x)>.91||Math.abs(projected.y)>.69)return null;
      return {x:50*(1+projected.x),y:50*(1-projected.y)};
    }));
    if(stillMoving)request();
  }
  function resize() {
    width=host.clientWidth;height=host.clientHeight;
    if(!width||!height)return;
    camera.aspect=width/height;
    camera.fov=camera.aspect<1.1?64:camera.aspect<1.5?52:42;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);request();
  }
  function goTo(i,animate=true){
    station=i;const p=fixed[i];const exterior=i===3;
    const changed=outside.visible!==exterior;
    inside.visible=!exterior;outside.visible=exterior;
    destination.set(...p.eye);aim.set(...p.at);
    home.setFromVector3(orbitOffset.copy(destination).sub(aim));
    sph.copy(home);
    if(!animate||changed){pos.copy(destination);target.copy(aim);}
    if(changed)renderer.shadowMap.needsUpdate=true;
    request();
  }
  function orbit(dx,dy,zoom=0) {
    sph.theta-=dx;
    if (station !== 0) {
      const limit=station===3?.64:.90;
      sph.theta=clamp(sph.theta,home.theta-limit,home.theta+limit);
    }
    sph.phi=clamp(sph.phi-dy,.62,1.51);
    sph.radius=clamp(sph.radius*(1+zoom),home.radius*.5,home.radius*1.17);
    orbitOffset.setFromSpherical(sph);
    if (station === 0) {
      // Shorten the radius close to the cafe walls while preserving the requested zoom.
      const limitX=orbitOffset.x ? (orbitOffset.x<0?-7.38-aim.x:7.38-aim.x)/orbitOffset.x : Infinity;
      const limitZ=orbitOffset.z ? (orbitOffset.z<0?-6.10-aim.z:9.60-aim.z)/orbitOffset.z : Infinity;
      const distance=Math.hypot(orbitOffset.x,orbitOffset.z);
      const stairX=staircase.x-aim.x, stairZ=staircase.z-aim.z;
      const stairRadius=staircase.radius+.21;
      const along=(stairX*orbitOffset.x+stairZ*orbitOffset.z)/distance;
      const sideDistanceSquared=stairX*stairX+stairZ*stairZ-along*along;
      const stairLimit=along>0 && sideDistanceSquared<stairRadius*stairRadius
        ? (along-Math.sqrt(stairRadius*stairRadius-sideDistanceSquared)-.20)/distance
        : Infinity;
      orbitOffset.multiplyScalar(Math.min(1,limitX,limitZ,stairLimit));
    }
    destination.copy(aim).add(orbitOffset);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){pos.copy(destination);target.copy(aim);}
    request();
  }
  function down(e) {
    if(e.button!==0||drag)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
  }
  function move(e) {
    if(drag?.id!==e.pointerId)return;
    const speed=pi/Math.max(450,width);
    orbit((e.clientX-drag.x)*speed,(e.clientY-drag.y)*speed);
    drag.x=e.clientX;drag.y=e.clientY;
  }
  function stop(e){if(drag?.id===e.pointerId)drag=null;}
  function key(e) {
    const moves={ArrowLeft:[-.13,0],ArrowRight:[.13,0],ArrowUp:[0,-.09],ArrowDown:[0,.09],'+':[0,0,-.15],'=':[0,0,-.15],'-':[0,0,.15]};
    if(!moves[e.key])return;
    e.preventDefault();orbit(...moves[e.key]);
  }
  function loss(e){e.preventDefault();onLoss();}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',loss);
  const ro=new ResizeObserver(resize);ro.observe(host);
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;request();});io.observe(host);
  document.addEventListener('visibilitychange',request);
  goTo(initial,false);resize();
  return {
    goTo,zoom:amount=>orbit(0,0,amount),
    resume(){active=true;request();},
    pause(){active=false;cancelAnimationFrame(frame);frame=0;},
    dispose(){
      this.pause();ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',request);
      canvas.removeEventListener('webglcontextlost',loss);canvas.remove();
      const resources=new Set();
      for(const root of [scene,studio])root.traverse(obj=>{
        if(obj.geometry&&obj.geometry!==cube&&obj.geometry!==ball&&obj.geometry!==disc)resources.add(obj.geometry);
        if(obj.material){resources.add(obj.material);if(obj.material.map)resources.add(obj.material.map);}
      });
      for(const res of resources)res.dispose();
      mirrorTarget.dispose();env.dispose();sun.shadow.dispose();renderer.dispose();
    }
  };
}
