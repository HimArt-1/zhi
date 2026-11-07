import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const stills = process.argv.includes('--stills');
const framesPerSecond = 24;
const formats = [
  {name:'intro-carrera',width:1280,height:720},
  {name:'intro-carrera-portrait',width:540,height:960}
];
const sources = new Set([
  'scripts/intro-film.js','carrera.js','vendor/gltf-loader.js','vendor/buffer-geometry-utils.js',
  'assets/porsche-911-carrera-s.glb','vendor/three.js','assets/logo.webp'
]);
const setup = `<!doctype html><meta charset="utf-8"><script type="module">
  import { createFilm } from '/scripts/intro-film.js';
  const {width,height}=Object.fromEntries(new URL(location.href).searchParams);
  const logo=new Image();
  logo.src='/assets/logo.webp';
  await logo.decode();
  const film=await createFilm(Number(width),Number(height),logo);
  window.captureFrame=time=>film.frame(time);
  window.filmDuration=film.duration;
</script>`;
const server = createServer(async (request,response) => {
  const url = new URL(request.url,'http://localhost');
  if (url.pathname === '/') {
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
    response.writeHead(200,{'content-type':path.endsWith('.webp')?'image/webp':path.endsWith('.glb')?'model/gltf-binary':'text/javascript'});
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const output = stills ? await mkdtemp(join(tmpdir(),'zhi-film-stills-')) : new URL('../assets/',import.meta.url).pathname;
let browser;

async function encode(page, name, duration) {
  const destination = join(output,name+'.mp4');
  const temporary = join(output,name+'.rendering.mp4');
  const encoder=spawn('ffmpeg',[
    '-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg',
    '-framerate',String(framesPerSecond),'-i','pipe:0','-an','-c:v','libx264',
    '-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',temporary
  ],{stdio:['pipe','ignore','inherit']});
  const closed = once(encoder,'close');
  encoder.stdin.on('error',error=>{if(error.code!=='EPIPE') console.error(error.message);});
  try {
    const total=Math.ceil(duration*framesPerSecond);
    for(let frame=0;frame<total;frame++) {
      const encoded=await page.evaluate(time=>window.captureFrame(time),frame/framesPerSecond);
      if(encoder.exitCode!==null) throw new Error('FFmpeg closed before all frames were encoded.');
      if(!encoder.stdin.write(Buffer.from(encoded,'base64'))) await once(encoder.stdin,'drain');
    }
    encoder.stdin.end();
    const [code]=await closed;
    if(code!==0) throw new Error('FFmpeg exited with code '+code);
    await rename(temporary,destination);
    console.log('Rendered '+destination);
  } catch(error) {
    encoder.kill();
    await closed.catch(()=>{});
    await rm(temporary,{force:true});
    throw error;
  }
}

try {
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  for(const {name,width,height} of formats) {
    if (process.argv.includes('--portrait') && name !== 'intro-carrera-portrait') continue;
    const page=await browser.newPage();
    page.on('pageerror', error=>console.error(error.message));
    await page.goto(base+'/?width='+width+'&height='+height);
    await page.waitForFunction(()=>typeof window.captureFrame==='function',null,{timeout:30000});
    if(stills) {
      for(const time of [.72,1.78,2.73,3.57,4.85]) {
        const encoded=await page.evaluate(time=>window.captureFrame(time),time);
        await writeFile(join(output,name+'-'+time+'.jpg'),Buffer.from(encoded,'base64'));
      }
    } else {
      const duration=await page.evaluate(()=>window.filmDuration);
      await encode(page,name,duration);
    }
    await page.close();
  }
  if(stills) console.log(output);
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
