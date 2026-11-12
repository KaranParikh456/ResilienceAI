// src/appboard/components/MetricWidget/index.tsx
'use client'; // Important: This component interacts with props, so it needs to be a client component.
import React from 'react';
import styles from './styles.module.css'; 

// --- Interfaces for Type Safety (CRITICAL) ---
interface MetricData {
    title: string;
    value: number | string;
}

interface MetricWidgetProps {
    data: MetricData; // Expects an object with title and value
}

export default function MetricWidget({ data }: MetricWidgetProps) {
  // We assume the 'data' prop is always provided based on how page.tsx calls it.
  return (
    <div className={styles.widgetCard}> 
      {/* The Title */}
      <p className={styles.title}>{data.title}</p>

      {/* Large Value Display - Note: We are assuming 'value' is the most important metric */}
      <h2 className={styles.valueText}>
        {data.value}
      </h2>
    </div >
  );
}
