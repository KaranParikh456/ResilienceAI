 'use client';
import {useEffect,useState} from 'react';
export default function EvidenceNotice(){
  const [fixture,setFixture]=useState(false);
  useEffect(()=>{
    const listener=(event:Event)=>{if((event as CustomEvent<boolean>).detail)setFixture(true);};
    window.addEventListener('resilience-fixture',listener);
    return ()=>window.removeEventListener('resilience-fixture',listener);
  },[]);
  return fixture?<p role="status" className="mb-4 rounded border border-warn/30 bg-warn/10 p-3 text-sm">Fixture evidence: this view includes synthetic data.</p>:null;
}
