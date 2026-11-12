import { http } from './http';
import { ActivityEntry, ChartDataPoint, DashboardMetrics, InfraGraph, RiskAnalysis, SimulationState, Vulnerability } from './types';
import type { Job, Graph, Banks, Simulation, Analysis } from './contracts';
function scanId() { const id=sessionStorage.getItem('resilience-scan'); if(!id) throw new Error('Complete a repository scan on Security first.'); return id; }
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
export async function scanRepository(repository: string): Promise<Vulnerability[]> {
 sessionStorage.removeItem('resilience-scan'); sessionStorage.removeItem('resilience-simulation');
 let job=await http<Job>('/api/scan',post({repository}));
 const deadline=Date.now()+330000;
 while(job.state==='queued'||job.state==='running') {
  if(Date.now()>deadline) throw new Error(`Scan ${job.id} polling timed out; query its status before retrying.`);
  await new Promise(r=>setTimeout(r,1000));
  job=await http<Job>(`/api/scan/${job.id}`);
 }
 if(job.state!=='completed'||!job.evidence) throw new Error(`Scan ${job.id}: ${job.error ?? job.state}. Check backend logs for scanner prerequisites.`);
 sessionStorage.setItem('resilience-scan',job.id);
 return (job.evidence.findings??[]).map(f=>({id:f.id,cveId:f.id,packageName:job.evidence!.nodes.find(n=>n.id===f.dependency_id)?.label??f.dependency_id,installedVersion:'See package identity',fixedVersion:f.remediation,severity:f.severity.toUpperCase() as Vulnerability['severity'],source:job.evidence!.source}));
}
export async function fetchInfrastructureGraph(): Promise<InfraGraph> {
 const graph=await http<Graph>(`/api/graph/${scanId()}`);
 return {nodes:graph.nodes.map(n=>({id:n.id,label:n.label,type:'service',status:'unknown'})),edges:graph.edges.map((e,i)=>({...e,id:`edge-${i}`}))};
}
export async function fetchAnalysis() {return http<Analysis>('/api/ai/analyze',post({scan_id:scanId()}));}
export async function fetchRiskAnalyses():Promise<RiskAnalysis[]> { throw new Error('Use the evidence-based analysis view.'); }
export async function fetchBanks() {return http<Banks>('/api/banks/status');}
async function simulation():Promise<Simulation> {
 let id=sessionStorage.getItem('resilience-simulation');
 if(!id){const s=await http<Simulation>('/api/simulation/start',post({scan_id:scanId(),targets:['bank-a','bank-b','bank-c']})); id=s.id;sessionStorage.setItem('resilience-simulation',id);return s;}
 return http<Simulation>(`/api/simulation/${id}`);
}
export async function fetchSimulationState():Promise<SimulationState> {
 const banks=await fetchBanks();
 const id=sessionStorage.getItem('resilience-simulation');
 const s=id?await http<Simulation>(`/api/simulation/${id}`):null;
 return {downBanks:banks.banks.filter(b=>b.status!=='up').map(b=>b.id),failover:false,transactions:(s?.measured_results?.transactions??[]) as SimulationState['transactions']};
}
export async function setBankFailure(bankId:string,down:boolean):Promise<void> {
 if(!down) throw new Error('Timed failures recover automatically after 5 seconds.');
 const s=await simulation();
 await http<Simulation>('/api/simulation/failure',post({simulation_id:s.id,target:bankId,mode:'offline',duration_seconds:5}));
}
export async function setFailoverEnabled(_enabled:boolean):Promise<void> {throw new Error('Automatic failover is not implemented by the bank service.');}
export async function resetSimulation():Promise<void> {sessionStorage.removeItem('resilience-simulation');}
export async function fetchDashboardMetrics():Promise<DashboardMetrics> {
 const banks=await fetchBanks();
 const id=sessionStorage.getItem('resilience-simulation');
 const s=id?await http<Simulation>(`/api/simulation/${id}`):null;
 const tx=(s?.measured_results?.transactions??[]) as {status:string;latency_ms:number}[];
 return {totalTransactions:{title:'Measured samples',value:tx.length},successRate:{title:'Banks up',value:`${banks.banks.filter(b=>b.status==='up').length}/${banks.banks.length}`},failedAttempts:{title:'Failed samples',value:tx.filter(t=>t.status==='FAILED').length},averageLatencyMs:{title:'Observed latency',value:tx.length?Math.round(tx.reduce((sum,t)=>sum+t.latency_ms,0)/tx.length):'No samples',secondaryLabel:'ms'}};
}
export async function fetchRevenueTrendData():Promise<ChartDataPoint[]> {return [];}
export async function fetchActivityStream():Promise<ActivityEntry[]> {const b=await fetchBanks();return b.banks.map(bank=>({timestamp:bank.observed_at,status:'INFO',message:`${bank.id}: ${bank.status} (measured health)`}));}
