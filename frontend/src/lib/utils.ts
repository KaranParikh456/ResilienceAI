// src/lib/utils.ts
/** 
 * Mocks fetching data from a backend API endpoint for demonstration purposes.
 */
export async function fetchDashboardMetrics() {
    console.log("--- Dashboard: Fetching metrics data ---");
    
    // Simulate network delay (500ms) to mimic real-world loading state
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
        { title: "System Uptime", value: "< 99.9%" }, // Example of a key metric
        { title: "Active Users", value: "123" },
        { title: "Pending Tickets", value: "45" },
        { title: "API Latency", value: "< 100ms" },
    ];
}
