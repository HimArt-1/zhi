import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run=promisify(execFile);
const root=new URL('../',import.meta.url);
const stills=process.argv.includes('--stills');
const frameMs=50;
const formats=[
  {name:'opening-car',width:960,height:540},
  {name:'opening-car-portrait',width:432,height:768}
];
const sources=new Set([
  'scripts/intro-film.js','scripts/gltf-loader.js','scripts/buffer-geometry-utils.js',
  'scripts/intro-model.glb','vendor/three.js','assets/logo.webp'
]);
const setup=`<!doctype html><meta charset="utf-8"><script type="module">
  import { createFilm } from '/scripts/intro-film.js';
  const {width,height}=Object.fromEntries(new URL(location.href).searchParams);
  const logo=new Image();
  logo.src='/assets/logo.webp';
  await logo.decode();
  const film=await createFilm(Number(width),Number(height),logo);
  window.captureFrame=time=>film.frame(time);
  window.filmDuration=film.duration;
</script>`;
const server=createServer(async (request,response) => {
  const url=new URL(request.url,'http://localhost');
  if (url.pathname==='/') {
    response.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(setup);
    return;
  }
  const path=url.pathname.slice(1);
  if (!sources.has(path)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data=await readFile(new URL(path,root));
    const type=path.endsWith('.webp')?'image/webp':path.endsWith('.glb')?'model/gltf-binary':'text/javascript';
    response.writeHead(200,{'content-type':type}).end(data);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const work=await mkdtemp(join(tmpdir(),'zhi-cutout-'));
let browser;
try {
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  for (const {name,width,height} of formats) {
    const page=await browser.newPage();
    page.on('pageerror',error=>console.error(error.message));
    await page.goto(base+'/?width='+width+'&height='+height);
    await page.waitForFunction(()=>typeof window.captureFrame==='function',null,{timeout:30000});
    const capture=async (time,path)=>{
      const encoded=await page.evaluate(t=>window.captureFrame(t),time);
      await writeFile(path,Buffer.from(encoded,'base64'));
    };
    if (stills) {
      for (const time of [.6,1.28,2.42,3.8,4.6]) await capture(time,join(work,name+'-'+time+'.png'));
    } else {
      const duration=await page.evaluate(()=>window.filmDuration);
      const frames=[];
      for (let frame=0;frame<Math.ceil(duration*1000/frameMs);frame++) {
        const path=join(work,name+'-'+String(frame).padStart(3,'0')+'.png');
        await capture(frame*frameMs/1000,path);
        frames.push(path);
      }
      const encoded=join(work,name+'.webp');
      await run('img2webp',['-loop','1','-lossy','-q','79','-m','4','-d',String(frameMs),...frames,'-o',encoded]);
      const transparent=join(work,name+'-alpha.webp');
      await run('webpmux',['-set','bgcolor','0,0,0,0',encoded,'-o',transparent]);
      await rename(transparent,new URL('../assets/'+name+'.webp',import.meta.url));
      console.log('Rendered '+name+'.webp');
    }
    await page.close();
  }
  if (stills) console.log(work);
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  if (!stills) await rm(work,{recursive:true,force:true});
}
