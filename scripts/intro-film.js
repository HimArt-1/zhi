import * as T from '../vendor/three.js';
import { GLTFLoader } from './gltf-loader.js';

const duration = 4.95;
const olive = 0x52583a;
const smooth = (start,end,t) => T.MathUtils.smoothstep(t,start,end);
const mix = T.MathUtils.lerp;
const v = (x,y,z) => new T.Vector3(x,y,z);

function studioEnvironment(renderer) {
  // Light cards shape reflections on the model and are never rendered into the film.
  const stage = new T.Scene();
  stage.background = new T.Color(0x666c59);
  const cards = [
    [[-4,3.8,3.1],[.10,5,7],0xffefd5,2.1],
    [[4.5,3.7,-1.3],[.10,4,5.4],0xccded0,1.65],
    [[0,6,-1.7],[7.3,.10,3.2],0xf3f3e9,1.55],
    [[0,3.0,7],[5.7,2.6,.10],0xfff5e4,1.35]
  ];
  for (const [position,size,color,strength] of cards) {
    const panel=new T.Mesh(new T.BoxGeometry(...size),new T.MeshBasicMaterial({
      color:new T.Color(color).multiplyScalar(strength)
    }));
    panel.position.set(...position);
    stage.add(panel);
  }
  const generator=new T.PMREMGenerator(renderer);
  const map=generator.fromScene(stage,.05);
  generator.dispose();
  return map.texture;
}

function recolorBodyAtlas(map) {
  const canvas=document.createElement('canvas');
  canvas.width=map.image.width;
  canvas.height=map.image.height;
  const context=canvas.getContext('2d');
  context.drawImage(map.image,0,0);
  const image=context.getImageData(0,0,canvas.width,canvas.height);
  const pixels=image.data;
  // The upper paint islands are neutral. Lights, trim and other atlas regions stay intact.
  const paintBytes=[(olive>>16)&255,(olive>>8)&255,olive&255];
  for (let index=0;index<canvas.width*Math.floor(canvas.height*.59)*4;index+=4) {
    const low=Math.min(pixels[index],pixels[index+1],pixels[index+2]);
    const high=Math.max(pixels[index],pixels[index+1],pixels[index+2]);
    if (low<125 || high-low>32 || pixels[index+3]<10) continue;
    for (let channel=0;channel<3;channel++) pixels[index+channel]=paintBytes[channel]*high/255;
  }
  context.putImageData(image,0,0);
  const tinted=new T.CanvasTexture(canvas);
  tinted.flipY=map.flipY;
  tinted.colorSpace=T.SRGBColorSpace;
  return tinted;
}

function rollingWheels(mesh) {
  const positions = mesh.geometry.getAttribute('position');
  const normals = mesh.geometry.getAttribute('normal');
  const original = positions.array.slice();
  const originalNormals = normals.array.slice();
  mesh.geometry.computeBoundingBox();
  const center = mesh.geometry.boundingBox.getCenter(v(0,0,0));
  const groups = Array.from({ length: 4 }, () => ({
    indices: [], lowY: Infinity, highY: -Infinity, lowZ: Infinity, highZ: -Infinity
  }));
  for (let index = 0; index < positions.count; index++) {
    const [x,y,z] = original.subarray(index*3,index*3+3);
    const group = groups[(x > center.x ? 1 : 0) + (y > center.y ? 2 : 0)];
    group.indices.push(index);
    group.lowY = Math.min(group.lowY,y);
    group.highY = Math.max(group.highY,y);
    group.lowZ = Math.min(group.lowZ,z);
    group.highZ = Math.max(group.highZ,z);
  }
  return distance => {
    const angle = -distance/.34;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    for (const group of groups) {
      if (!group.indices.length) continue;
      const y0 = (group.lowY+group.highY)/2, z0 = (group.lowZ+group.highZ)/2;
      for (const index of group.indices) {
        const offset = index*3;
        const y = original[offset+1]-y0, z = original[offset+2]-z0;
        positions.setXYZ(index,original[offset],y0+y*cos-z*sin,z0+y*sin+z*cos);
        const ny = originalNormals[offset+1], nz = originalNormals[offset+2];
        normals.setXYZ(index,originalNormals[offset],ny*cos-nz*sin,ny*sin+nz*cos);
      }
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
  };
}

async function loadCar() {
  const source=await new GLTFLoader().loadAsync('/scripts/intro-model.glb');
  const car=new T.Group();
  const aligned=new T.Group();
  aligned.add(source.scene);
  car.add(aligned);
  aligned.rotation.y=Math.PI;
  const bounds=new T.Box3().setFromObject(aligned);
  const center=bounds.getCenter(v(0,0,0));
  const scale=4.50/bounds.getSize(v(0,0,0)).z;
  aligned.scale.setScalar(scale);
  aligned.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  let spinWheels;
  source.scene.traverse(mesh=>{
    if (!mesh.isMesh) return;
    const material=mesh.material;
    if (/^Bonnetrefblend/.test(material.name)) {
      mesh.material=new T.MeshPhysicalMaterial({
        color:olive,metalness:.53,roughness:.24,clearcoat:1,
        clearcoatRoughness:.16,envMapIntensity:1.03,side:T.DoubleSide
      });
    } else if (/^Bodyunref/.test(material.name)) {
      material.map=recolorBodyAtlas(material.map);
      material.envMapIntensity=.66;
      material.depthWrite=false;
    } else if (/^Glass/.test(material.name)) {
      material.color.setHex(0x748077);
      material.metalness=.17;
      material.roughness=.22;
      material.opacity=.73;
      material.depthWrite=false;
      mesh.renderOrder=3;
    } else if (/^Mfghost.*whrear/.test(material.name)) {
      spinWheels = rollingWheels(mesh);
    } else if (/^Puncheff.*addlight/.test(material.name)) {
      material.emissiveIntensity=.52;
      material.depthWrite=false;
    }
  });
  return {car, spinWheels};
}

function makeWordmark(logo) {
  const canvas=document.createElement('canvas');
  canvas.width=logo.naturalWidth;
  canvas.height=logo.naturalHeight;
  const context=canvas.getContext('2d');
  context.drawImage(logo,0,0);
  context.globalCompositeOperation='source-in';
  context.fillStyle='#2c3524';
  context.fillRect(0,0,canvas.width,canvas.height);
  return canvas;
}

export async function createFilm(width,height,logo) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setSize(width,height);
  renderer.setClearColor(0,0);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  const scene=new T.Scene();
  scene.environment=studioEnvironment(renderer);
  scene.add(new T.HemisphereLight(0xe8eade,0x7b6b50,1.22));
  const key=new T.DirectionalLight(0xffe4bb,2.52);
  key.position.set(-3.4,5.1,5.8);
  const rim=new T.DirectionalLight(0xd6e6dd,1.48);
  rim.position.set(5.2,2.8,-4.1);
  scene.add(key,rim);
  const {car,spinWheels}=await loadCar();
  scene.add(car);

  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  const portrait=height>width;
  const camera=new T.PerspectiveCamera(portrait?45:29,width/height,.05,50);
  const mark=makeWordmark(logo);
  return {
    duration,
    frame(time) {
      const entry=1-(1-smooth(0,3.05,time+(portrait?.67:.14)))**2;
      const drift=smooth(.48,4.35,time);
      car.position.set(mix(4.6,0,entry),0,mix(-7.8,0,entry));
      car.rotation.y=mix(-.47,.03,drift);
      spinWheels?.(Math.hypot(4.6,7.8)*entry);
      camera.position.set(mix(5.0,4.6,drift),mix(1.8,2.22,drift),portrait?7.95:7.5);
      camera.lookAt(.02,portrait?1.32:1.17,.13);
      renderer.render(scene,camera);

      context.clearRect(0,0,width,height);
      context.globalAlpha=smooth(0,.55,time);
      context.drawImage(renderer.domElement,0,0);
      const reveal=smooth(2.86,3.64,time);
      const markWidth=width*(portrait?.54:.24);
      const markHeight=markWidth*mark.height/mark.width;
      const top=height*(portrait?.29:.16)-markHeight*(1-reveal)*.24;
      context.globalAlpha=reveal;
      context.drawImage(mark,(width-markWidth)/2,top,markWidth,markHeight);
      context.globalAlpha=1;
      return canvas.toDataURL('image/png').split(',')[1];
    }
  };
}
