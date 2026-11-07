import * as T from './vendor/three.js';
import { GLTFLoader } from './vendor/gltf-loader.js';

const olive = 0x52583a;

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

export async function loadCarrera({glassOpacity=.73}={}) {
  const url=new URL('./assets/porsche-911-carrera-s.glb',import.meta.url);
  const {scene}=await new GLTFLoader().loadAsync(url.href);
  const car=new T.Group();
  car.name='Porsche 911 Carrera S (991.2)';
  const aligned=new T.Group();
  aligned.add(scene);
  car.add(aligned);
  aligned.rotation.y=Math.PI;
  const bounds=new T.Box3().setFromObject(aligned);
  const center=bounds.getCenter(new T.Vector3());
  const scale=4.50/bounds.getSize(new T.Vector3()).z;
  aligned.scale.setScalar(scale);
  aligned.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  scene.traverse(mesh=>{
    if (!mesh.isMesh) return;
    const material=mesh.material;
    mesh.castShadow = /^Bonnetrefblend|^Mfghost.*whrear/.test(material.name);
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
      material.opacity=glassOpacity;
      material.depthWrite=false;
      mesh.renderOrder=3;
    } else if (/^Puncheff.*addlight/.test(material.name)) {
      material.emissiveIntensity=.52;
      material.depthWrite=false;
    }
  });
  return car;
}
