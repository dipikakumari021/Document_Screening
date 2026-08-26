export interface Screening {
  id: string;
  time: string;
  documentType: string;
  name: string;
  riskScore: number; // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  status: "CLEARED" | "PENDING REVIEW" | "ESCALATED";
  officer: string;
  primaryConcern?: string;
}

export const mockScreenings: Screening[] = [
  { id: "SCR-10482", time: "10:42", documentType: "Passport", name: "John Doe", riskScore: 85, riskLevel: "HIGH", status: "PENDING REVIEW", officer: "Arjun Singh", primaryConcern: "Face mismatch" },
  { id: "SCR-10477", time: "10:31", documentType: "Passport", name: "Alice Smith", riskScore: 55, riskLevel: "MEDIUM", status: "PENDING REVIEW", officer: "Arjun Singh", primaryConcern: "Document anomaly" },
  { id: "SCR-10465", time: "10:18", documentType: "ID Card", name: "Bob Johnson", riskScore: 42, riskLevel: "MEDIUM", status: "PENDING REVIEW", officer: "Arjun Singh", primaryConcern: "Data inconsistency" },
  { id: "SCR-10481", time: "10:40", documentType: "Passport", name: "David Miller", riskScore: 12, riskLevel: "LOW", status: "CLEARED", officer: "Arjun Singh" },
  { id: "SCR-10480", time: "10:37", documentType: "Passport", name: "Maria Fernandez", riskScore: 18, riskLevel: "LOW", status: "CLEARED", officer: "Arjun Singh" },
  { id: "SCR-10479", time: "10:33", documentType: "ID Card", name: "Ravi Kumar", riskScore: 48, riskLevel: "MEDIUM", status: "PENDING REVIEW", officer: "Arjun Singh", primaryConcern: "Blurred MRZ" },
  { id: "SCR-10478", time: "10:29", documentType: "Passport", name: "Li Wei", riskScore: 5, riskLevel: "LOW", status: "CLEARED", officer: "Arjun Singh" },
  { id: "SCR-10476", time: "10:22", documentType: "Passport", name: "Sarah Johnson", riskScore: 8, riskLevel: "LOW", status: "CLEARED", officer: "Arjun Singh" },
];

export const getScreeningStats = () => {
  const today = new Date();
  
  return {
    total: 1248,
    todayGrowth: "+12%",
    highRisk: 18,
    mediumRisk: 46,
    lowRisk: 1184,
    activityData: [
      { name: '7 Days Ago', screenings: 100, highRisk: 2 },
      { name: '6 Days Ago', screenings: 210, highRisk: 5 },
      { name: '5 Days Ago', screenings: 120, highRisk: 3 },
      { name: '4 Days Ago', screenings: 190, highRisk: 8 },
      { name: '3 Days Ago', screenings: 310, highRisk: 12 },
      { name: '2 Days Ago', screenings: 180, highRisk: 4 },
      { name: 'Today', screenings: 120, highRisk: 1 },
    ],
    riskDistribution: [
      { name: 'High Risk', value: 18, color: '#ef4444' },
      { name: 'Medium Risk', value: 46, color: '#f59e0b' },
      { name: 'Low Risk', value: 1184, color: '#22c55e' }
    ]
  };
};
