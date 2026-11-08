export interface AIIncident {
    id: string;
    description: string;
  }
  
  export interface AIResult {
    id: string;
    urgency: "Critical" | "Elevated" | "Routine";
    request_type: "Emergency" | "Assistance" | "Information" | "Uncertain";
    summary: string;
    reason: string;
    immediate_review: boolean;
    missing_information: string[];
  }

export async function prioritizeIncidents(incidents: {
    id: string;
    description: string;
  }[]) {
    const response = await fetch("http://localhost:8001/prioritize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ incidents }),
    });
  
    if (!response.ok) {
      throw new Error("AI prioritization failed");
    }
  
    return await response.json();
  }