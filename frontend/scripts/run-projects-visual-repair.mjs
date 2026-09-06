import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const proof=path.resolve(process.env.SYSGRID_PROOF_DIR || path.join(frontend,'test-results','visual-repair'))
fs.mkdirSync(proof,{recursive:true})
const env={...process.env,SYSGRID_PROOF_DIR:proof,CI:'1'}
const local=(...p)=>path.join(frontend,'node_modules',...p)
const receipts=[]
async function run(name,args,timeout=240000){
 const started=Date.now(),log=fs.createWriteStream(path.join(proof,name+'.log'));console.log('RUNNING '+name)
 return new Promise((resolve,reject)=>{let child=spawn(process.execPath,args,{cwd:frontend,env,stdio:['ignore','pipe','pipe']});let expired=false;const timer=setTimeout(()=>{expired=true;child.kill('SIGTERM')},timeout)
  for(const source of [child.stdout,child.stderr])source.on('data',d=>{log.write(d);process.stdout.write(d)})
  child.on('error',e=>{clearTimeout(timer);log.end();reject(e)})
  child.on('exit',(code,signal)=>{clearTimeout(timer);log.end();receipts.push({name,exitCode:code,signal,expired,durationMs:Date.now()-started});fs.writeFileSync(path.join(proof,'stages.json'),JSON.stringify(receipts,null,2));code===0?resolve():reject(Error(`${name} failed; see ${proof}`))})
 })
}
const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const n=server.address().port;server.close(()=>resolve(n))})})
let vite
try{
 for(const f of [local('vite','bin','vite.js'),local('vitest','vitest.mjs'),local('playwright','cli.js')])if(!fs.existsSync(f))throw Error('Installed verification dependency missing: '+f+'. No npm install or lockfile change was performed.')
 const require=createRequire(path.join(frontend,'package.json'));const chromium=require('playwright').chromium
 if(!fs.existsSync(chromium.executablePath()))await run('chromium-provision',[local('playwright','cli.js'),'install','chromium'],600000)
 await run('geometry-unit',[local('vitest','vitest.mjs'),'run','src/components/ProjectsVisualRepair.geometry.test.ts','src/components/ProjectsModernGantt.model.test.ts'])
 await run('frontend-build',[local('vite','bin','vite.js'),'build'],600000)
 const url='http://127.0.0.1:'+port;env.SYSGRID_PROOF_URL=url
 const log=fs.openSync(path.join(proof,'vite.log'),'w');vite=spawn(process.execPath,[local('vite','bin','vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:frontend,env,stdio:['ignore',log,log]});fs.closeSync(log)
 let ready=false
 for(let n=0;n<100;n++){if(vite.exitCode!==null)throw Error('Isolated Vite exited before readiness');try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200))}
 if(!ready)throw Error('Isolated Vite did not become ready')
 await run('real-app-smoke',[local('playwright','cli.js'),'test','--config=playwright.projects-visual-repair.config.ts'],600000)
 fs.writeFileSync(path.join(proof,'PROOF.json'),JSON.stringify({status:'PASS',scope:'Build, focused geometry tests, and real frontend with intercepted fixture APIs. Not production-backend persistence or complete OUT-40 regression.',receipts},null,2))
 console.log('PROJECTS_VISUAL_SMOKE_PASS')
}catch(e){fs.writeFileSync(path.join(proof,'PROOF.json'),JSON.stringify({status:'FAIL',message:String(e),receipts},null,2));console.error(String(e));process.exitCode=1}
finally{if(vite){vite.kill('SIGTERM');setTimeout(()=>{if(vite.exitCode===null)vite.kill('SIGKILL')},1500).unref()}}
