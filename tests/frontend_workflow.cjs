// Real client functions against explicit HTTP test responses; no live scanner claims.
const assert = require('node:assert/strict');
const fs = require('node:fs');
process.chdir(require('node:path').resolve(__dirname, '..'));
const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');
const memory = new Map();
global.sessionStorage = {getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
global.window = {dispatchEvent:()=>{}};
global.CustomEvent = class {constructor(type,options){this.type=type;this.detail=options.detail;}};
const requests=[];
let polls=0;
global.fetch=async (url, init)=>{
 requests.push({url,init});
 let body;
 if(url.endsWith('/api/scan')) {
  assert.deepEqual(JSON.parse(init.body),{repository:'demo'});
  body={id:'scan-1',state:'queued'};
 } else if(url.endsWith('/api/scan/scan-1')) {
  body=++polls===1?{id:'scan-1',state:'running'}:{id:'scan-1',state:'completed',evidence:{nodes:[],findings:[],source:'explicit test',fixture:true}};
 } else if(url.endsWith('/api/graph/scan-1')) body={nodes:[],edges:[],fixture:true};
 else if(url.endsWith('/api/ai/analyze')) body={mode:'deterministic_fallback',summary:'test',remediation:[],evidence_refs:[],fixture:true};
 else return {ok:false,json:async()=>({error:{message:'Denied',request_id:'request-test'}})};
 assert.equal(init.headers.Authorization,'Bearer runtime-test-token');
 return {ok:true,json:async()=>body};
};
function load(file,requires={}) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,module,require:name=>requires[name],process,window,sessionStorage,CustomEvent,AbortSignal,fetch,setTimeout:fn=>setTimeout(fn,0),Date,Error,Promise,console});
 return module.exports;
}
(async()=>{
 sessionStorage.setItem('resilience-token','runtime-test-token');
 const http=load('frontend/src/lib/http.ts');
 const api=load('frontend/src/lib/api.ts',{'./http':http});
 assert.deepEqual(Array.from(await api.scanRepository('demo')),[]);
 assert.equal(polls,2);
 assert.equal(sessionStorage.getItem('resilience-scan'),'scan-1');
 await api.fetchInfrastructureGraph();
 await api.fetchAnalysis();
 await assert.rejects(http.http('/denied'),/Denied \[request-test\]/);
 assert.equal(requests.length,6);
 console.log('Frontend workflow passed: runtime auth, queued/running/completed polling, graph, analysis, error request ID.');
})().catch(e=>{console.error(e);process.exitCode=1;});
