import * as T from '../vendor/three.js';
import { buildCarrera } from '../carrera.js';

const length = 5.4;
const smooth = (start, end, value) => T.MathUtils.smoothstep(value, start, end);
const mix = T.MathUtils.lerp;
const point = (x, y, z) => new T.Vector3(x, y, z);
const smoothOut = t => 1 - (1 - t) ** 3;
const PI = Math.PI;

function makeTexture(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function addBox(group, material, size, location) {
  const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
  mesh.position.set(...location);
  group.add(mesh);
  return mesh;
}

function glowTexture() {
  return makeTexture(128, (context, size) => {
    const center = size / 2;
    const gradient = context.createRadialGradient(center,center,0,center,center,center);
    gradient.addColorStop(0,'rgba(255,247,222,.85)');
    gradient.addColorStop(.12,'rgba(248,224,177,.38)');
    gradient.addColorStop(.37,'rgba(230,188,120,.09)');
    gradient.addColorStop(1,'rgba(217,178,111,0)');
    context.fillStyle = gradient;
    context.fillRect(0,0,size,size);
  });
}

function studioEnvironment(renderer) {
  const rig = new T.Scene();
  rig.background = new T.Color(0x343830);
  const cards = [
    { position:[-4.3,3.5,1.0], size:[.10,4.5,7.2], color:0xffe1aa, power:3.7 },
    { position:[4.8,3.4,-1.8], size:[.10,3.8,4.9], color:0xb4c9be, power:2.35 },
    { position:[0,6.0,-1.7], size:[6.0,.08,2.8], color:0xe8ede5, power:1.75 },
    { position:[0,2.0,7.0], size:[5.0,2.0,.06], color:0xf6ecd5, power:1.5 },
    { position:[1.3,1.7,-8.0], size:[2.6,4.4,.08], color:0x9aaf93, power:1.25 }
  ];
  for (const { position, size, color, power } of cards) {
    const card = new T.MeshBasicMaterial({ color:new T.Color(color).multiplyScalar(power) });
    addBox(rig, card, size, position);
  }
  const generator = new T.PMREMGenerator(renderer);
  const environment = generator.fromScene(rig,.055);
  generator.dispose();
  return environment;
}

function gallery(scene) {
  const floorMap = makeTexture(256,(context,size) => {
    let state = 29871;
    const pixels = context.createImageData(size,size);
    for (let y=0;y<size;y++) {
      for (let x=0;x<size;x++) {
        state = (1664525*state+1013904223)>>>0;
        const noise = state / 4294967296;
        const n = 33 + noise*12 + 7*Math.sin(x*.033 + 2*Math.sin(y*.045))
          + 4*Math.sin((x+y)*.19);
        pixels.data.set([n,n*.97,n*.86,255],(y*size+x)*4);
      }
    }
    context.putImageData(pixels,0,0);
  });
  floorMap.wrapS = floorMap.wrapT = T.RepeatWrapping;
  floorMap.repeat.set(7,12);
  const floor = new T.Mesh(new T.PlaneGeometry(22,54),new T.MeshStandardMaterial({
    color:0xa7a995,map:floorMap,metalness:.34,roughness:.31,envMapIntensity:.40
  }));
  floor.rotation.x = -PI/2;
  floor.position.set(0,-.012,-6);
  floor.receiveShadow = true;
  scene.add(floor);

  const concrete = new T.MeshStandardMaterial({color:0x3b4036,roughness:.75});
  const dark = new T.MeshStandardMaterial({color:0x252b24,roughness:.90});
  const brass = new T.MeshBasicMaterial({color:0xb39264,toneMapped:false});
  const ivory = new T.MeshBasicMaterial({color:0xf8dbad,toneMapped:false});
  for (const side of [-1,1]) {
    addBox(scene,dark,[.50,5.5,43],[side*6.35,2.75,-10.6]);
    addBox(scene,brass,[.019,.008,36],[side*2.70,-.001,-7]);
    for (let row=0;row<8;row++) {
      const z=5.8-row*4.7;
      addBox(scene,concrete,[.25,4.60,.36],[side*5.87,2.28,z]);
      addBox(scene,ivory,[.025,3.50,.036],[side*5.72,2.08,z+.18]);
      addBox(scene,brass,[.065,.014,.33],[side*2.70,.001,z]);
    }
  }
  addBox(scene,concrete,[12.9,.24,43],[0,4.74,-10.6]);
  addBox(scene,dark,[13.4,5.4,.7],[0,2.55,-29.2]);
  for (const z of [5,1,-3,-7,-11,-15]) {
    addBox(scene,concrete,[12.3,.15,.31],[0,4.49,z]);
    addBox(scene,ivory,[7.9,.022,.085],[0,4.39,z]);
  }
}

function lighting(scene) {
  scene.add(new T.HemisphereLight(0xabbdb2,0x4c3824,.80));
  const key = new T.DirectionalLight(0xffe3b6,2.72);
  key.position.set(-4.2,6.4,5.5);
  key.target.position.set(0,0,-1.7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.3,far:22});
  key.shadow.normalBias=.014;
  key.shadow.bias=-.00027;
  scene.add(key,key.target);
  const rim = new T.DirectionalLight(0xc0dace,2.1);
  rim.position.set(3.8,2.3,-4.8);
  scene.add(rim);
  const fill = new T.DirectionalLight(0xefc591,1.35);
  fill.position.set(5.0,1.9,6.6);
  scene.add(fill);
}

function setShot(time, portrait, camera, aim, car) {
  const distance = 6.9 * (1 - (1 - Math.min(time/3.82,1)) ** 2.16);
  car.position.set(-.22 + .23*smooth(1,3.75,time),0,-6.90+distance);
  car.rotation.y = mix(-.102,.17,smooth(1.25,3.6,time));
  for (const wheel of car.children.filter(child => child.userData.rollingRadius)) {
    wheel.rotation.x = distance / wheel.userData.rollingRadius;
  }

  if (time < 1.39) {
    const t = smooth(0,1.39,time);
    camera.fov = portrait ? 43 : 37;
    camera.position.set(mix(2.20,1.43,t),mix(.85,.78,t),car.position.z+mix(3.40,2.62,t));
    aim.set(mix(.50,.43,t),.69,car.position.z+1.52);
  } else {
    const t = smooth(1.39,4.15,time);
    const angle = mix(.83,.55,t);
    const radius = portrait ? mix(6.6,6.45,t) : mix(6.8,5.30,t);
    const aimX = portrait ? -.27 : mix(.37,.57,t);
    camera.fov = portrait ? 52 : 40;
    const track = mix(.55,.26,t);
    camera.position.set(Math.sin(angle)*radius,mix(1.02,1.60,t),Math.cos(angle)*radius+track);
    aim.set(aimX,portrait ? 1.18 : .89,car.position.z*(portrait?.65:.36)+(portrait?.33:.20));
  }
  camera.updateProjectionMatrix();
  camera.lookAt(aim);
}

function grade(context,width,height,time,logo,portrait) {
  const darkness = .87*(1-smooth(0,.47,time));
  const cut = .95*(1-smooth(0,.14,Math.abs(time-1.39)));
  const title = smooth(3.73,4.31,time);
  const vignette = context.createRadialGradient(width*.52,height*.49,height*.19,width*.52,height*.49,width*.65);
  vignette.addColorStop(0,'rgba(13,15,11,0)');
  vignette.addColorStop(1,'rgba(8,10,7,.59)');
  context.fillStyle = vignette;
  context.fillRect(0,0,width,height);
  context.fillStyle = 'rgba(10,13,10,'+Math.max(darkness,cut,title*.66)+')';
  context.fillRect(0,0,width,height);
  if (title <= 0) return;

  const reveal = smoothOut(title);
  const markWidth = (portrait ? .58 : .27) * width;
  const markHeight = markWidth*logo.naturalHeight/logo.naturalWidth;
  const y = height*(portrait?.422:.43)-markHeight/2;
  context.save();
  context.globalAlpha = title;
  context.translate(0, (1-title)*height*.018);
  context.beginPath();
  context.rect(0,y, width,markHeight*reveal);
  context.clip();
  context.drawImage(logo,(width-markWidth)/2,y,markWidth,markHeight);
  context.restore();

  const subtitle = smooth(4.14,4.64,time);
  context.globalAlpha = subtitle;
  context.fillStyle = '#e1d8bb';
  const fontSize = Math.max(10,Math.round(height*.019));
  context.font = '500 '+fontSize+'px monospace';
  context.textAlign = 'center';
  context.fillText('Z H I   C O F F E E   H O U S E',width/2,y+markHeight+height*.055);
  context.fillRect(width*.483,y+markHeight+height*.078,width*.034,1);
  context.globalAlpha = 1;
}

export function createFilm(width,height,logo) {
  const renderer = new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
  renderer.setSize(width,height);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color(0x20271e);
  scene.fog = new T.FogExp2(0x232b22,.051);
  scene.environment = studioEnvironment(renderer).texture;
  gallery(scene);
  lighting(scene);

  const car = buildCarrera();
  scene.add(car);
  const lightMap = glowTexture();
  const lampSprites = [-.66,.66].map(x => {
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map:lightMap,transparent:true,depthWrite:false,opacity:.24,blending:T.AdditiveBlending
    }));
    sprite.position.set(x,.765,1.62);
    sprite.scale.set(.48,.48,1);
    car.add(sprite);
    return sprite;
  });
  const shadowTexture = makeTexture(128,(context,size) => {
    const mid=size/2;
    const shade=context.createRadialGradient(mid,mid,4,mid,mid,mid);
    shade.addColorStop(0,'rgba(9,11,8,.95)');
    shade.addColorStop(.5,'rgba(9,11,8,.71)');
    shade.addColorStop(1,'rgba(9,11,8,0)');
    context.fillStyle=shade;
    context.fillRect(0,0,size,size);
  });
  const contact = new T.Mesh(new T.PlaneGeometry(2.74,5.49),new T.MeshBasicMaterial({
    map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false
  }));
  contact.rotation.x = -PI/2;
  contact.position.y = -.006;
  car.add(contact);

  const output = document.createElement('canvas');
  output.width=width; output.height=height;
  const context = output.getContext('2d');
  const camera = new T.PerspectiveCamera(40,width/height,.055,65);
  const aim = point(0,0,0);
  const portrait = height > width;
  return {
    duration:length,
    frame(time) {
      setShot(time,portrait,camera,aim,car);
      for(const sprite of lampSprites) sprite.material.opacity = .12+.24*smooth(.20,.52,time)*(1-.60*smooth(3.73,4.43,time));
      renderer.render(scene,camera);
      context.drawImage(renderer.domElement,0,0);
      grade(context,width,height,time,logo,portrait);
      return output.toDataURL('image/jpeg',.94).split(',')[1];
    }
  };
}
