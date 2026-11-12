 'use client';
import {useEffect,useState} from 'react';
import {fetchAnalysis} from '@/lib/api';
import type {Analysis} from '@/lib/contracts';
export default function RiskPage(){const [data,setData]=useState<Analysis>();const [error,setError]=useState('');useEffect(()=>{fetchAnalysis().then(setData).catch(e=>setError(e.message));},[]);return <article><h1>Evidence-based risk analysis</h1><p>Predictions and advisory recommendations; measured outages appear in Simulator.</p>{error&&<p role="alert">{error}</p>}{data?<><p>{data.fixture?'Fixture evidence':''}</p><p>{data.mode}</p><p>{data.summary}</p><ul>{data.remediation.map((r,i)=><li key={i}>{r}</li>)}</ul></>:!error&&<p>Loading...</p>}</article>;}
