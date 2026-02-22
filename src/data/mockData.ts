export const contacts = [
  { id: 1, fn: "Jan", ln: "de Vries", co: "Keuken van Brabant", email: "jan@keukenvanbrabant.nl", stage: "qualified", score: 82, tier: "hot" as const, src: "Google Maps", last: "2u geleden", ind: "Keukens", city: "Eindhoven" },
  { id: 2, fn: "Lisa", ln: "Bakker", co: "TechFlow Solutions", email: "lisa@techflow.nl", stage: "opportunity", score: 71, tier: "hot" as const, src: "LinkedIn", last: "5u geleden", ind: "IT Services", city: "Tilburg" },
  { id: 3, fn: "Mark", ln: "Jansen", co: "Bouwbedrijf Helmond", email: "mark@bouwhelmond.nl", stage: "lead", score: 58, tier: "warm" as const, src: "Apify", last: "1d geleden", ind: "Bouw", city: "Helmond" },
  { id: 4, fn: "Sophie", ln: "van Dijk", co: "Interieurs Plus", email: "sophie@interieursplus.nl", stage: "lead", score: 45, tier: "warm" as const, src: "Website", last: "2d geleden", ind: "Interieur", city: "Best" },
  { id: 5, fn: "Peter", ln: "Smeets", co: "AutoService Eindhoven", email: "peter@autoservice-ehv.nl", stage: "customer", score: 91, tier: "hot" as const, src: "Referral", last: "30 min", ind: "Automotive", city: "Eindhoven" },
  { id: 6, fn: "Emma", ln: "Willems", co: "GreenGarden B.V.", email: "emma@greengarden.nl", stage: "contacted", score: 34, tier: "cold" as const, src: "Cold outreach", last: "5d geleden", ind: "Tuinbouw", city: "Breda" },
  { id: 7, fn: "Tom", ln: "Hendriks", co: "Fitness First Tilburg", email: "tom@fitnessfirst.nl", stage: "proposal_sent", score: 67, tier: "warm" as const, src: "Apify", last: "1d geleden", ind: "Sport", city: "Tilburg" },
  { id: 8, fn: "Anna", ln: "Kuijpers", co: "Bakkerij 't Zoete", email: "anna@hetzoete.nl", stage: "lead", score: 52, tier: "warm" as const, src: "Apify", last: "3d geleden", ind: "Horeca", city: "Den Bosch" },
];

export const deals = [
  { id: 1, title: "CRM + Portaal", co: "Keuken van Brabant", val: 12500, stage: "Offerte", prob: 60, contact: "Jan de Vries", days: 3 },
  { id: 2, title: "ERP Systeem", co: "TechFlow Solutions", val: 28000, stage: "Onderhandeling", prob: 80, contact: "Lisa Bakker", days: 7 },
  { id: 3, title: "Website + Dashboard", co: "Bouwbedrijf Helmond", val: 8500, stage: "Demo", prob: 40, contact: "Mark Jansen", days: 1 },
  { id: 4, title: "Automatisering", co: "AutoService Eindhoven", val: 15000, stage: "Nieuw", prob: 10, contact: "Peter Smeets", days: 0 },
  { id: 5, title: "Klantportaal", co: "Interieurs Plus", val: 6000, stage: "Contact", prob: 20, contact: "Sophie van Dijk", days: 4 },
  { id: 6, title: "WhatsApp Integratie", co: "Fitness First Tilburg", val: 4500, stage: "Offerte", prob: 60, contact: "Tom Hendriks", days: 2 },
  { id: 7, title: "Boekhouding Koppeling", co: "GreenGarden B.V.", val: 3200, stage: "Contact", prob: 20, contact: "Emma Willems", days: 6 },
];

export const pipelineStages = [
  { name: "Nieuw", color: "#6b7280" },
  { name: "Contact", color: "hsl(225, 93%, 64%)" },
  { name: "Demo", color: "hsl(263, 86%, 77%)" },
  { name: "Offerte", color: "hsl(43, 96%, 56%)" },
  { name: "Onderhandeling", color: "hsl(27, 96%, 61%)" },
  { name: "Gewonnen", color: "hsl(160, 67%, 52%)", won: true },
];

export const scrapeRuns = [
  { id: 1, name: "Keukenbedrijven Noord-Brabant", prov: "Apify", status: "completed", res: 187, imp: 42, hot: 8, cost: "€2.40", t: "Vandaag 06:00" },
  { id: 2, name: "Installatiebedrijven Eindhoven", prov: "Apify", status: "completed", res: 94, imp: 23, hot: 5, cost: "€1.80", t: "Gisteren 06:00" },
  { id: 3, name: "Website Audit — Top 30 leads", prov: "Firecrawl", status: "running", res: 18, imp: 0, hot: 0, cost: "€0.90", t: "Nu bezig..." },
  { id: 4, name: "Horeca Tilburg + Breda", prov: "Apify", status: "scheduled", res: 0, imp: 0, hot: 0, cost: "—", t: "Morgen 06:00" },
];

export const projects = [
  { id: 1, nr: "PRJ-2025-001", name: "ERP Systeem TechFlow", co: "TechFlow Solutions", status: "in_progress", val: 28000, deadline: "15 mrt", pct: 45 },
  { id: 2, nr: "PRJ-2025-002", name: "CRM + Klantportaal", co: "Keuken van Brabant", status: "quoted", val: 12500, deadline: "1 apr", pct: 0 },
  { id: 3, nr: "PRJ-2024-018", name: "WhatsApp Business Bot", co: "AutoService Eindhoven", status: "delivered", val: 6800, deadline: "Afgerond", pct: 100 },
  { id: 4, nr: "PRJ-2025-003", name: "Dashboard + Rapportages", co: "Bouwbedrijf Helmond", status: "intake", val: 8500, deadline: "TBD", pct: 0 },
];

export const invoices = [
  { id: 1, nr: "INV-2025-014", co: "AutoService Eindhoven", amt: 3400, status: "paid", date: "12 feb", due: "26 feb" },
  { id: 2, nr: "INV-2025-013", co: "AutoService Eindhoven", amt: 3400, status: "paid", date: "1 feb", due: "15 feb" },
  { id: 3, nr: "INV-2025-012", co: "TechFlow Solutions", amt: 14000, status: "sent", date: "8 feb", due: "22 feb" },
  { id: 4, nr: "INV-2025-011", co: "Keuken van Brabant", amt: 6250, status: "overdue", date: "20 jan", due: "3 feb" },
  { id: 5, nr: "INV-2025-010", co: "Fitness First Tilburg", amt: 2250, status: "draft", date: "—", due: "—" },
];

export const contentItems = [
  { id: 1, title: "Case study: AutoService ERP", plat: "linkedin", status: "scheduled", date: "24 feb", type: "Post" },
  { id: 2, title: "5 signalen dat je een CRM nodig hebt", plat: "blog", status: "draft", date: "26 feb", type: "Artikel" },
  { id: 3, title: "Behind the scenes: Data Intelligence", plat: "instagram", status: "idea", date: "28 feb", type: "Reel" },
  { id: 4, title: "Maandelijkse nieuwsbrief februari", plat: "email", status: "review", date: "1 mrt", type: "Newsletter" },
  { id: 5, title: "SiteJob Connect launch", plat: "linkedin", status: "published", date: "10 feb", type: "Post" },
];

export const stageColors: Record<string, string> = {
  lead: "#6b7280", contacted: "hsl(225, 93%, 64%)", qualified: "hsl(263, 86%, 77%)",
  opportunity: "hsl(43, 96%, 56%)", proposal_sent: "hsl(27, 96%, 61%)", customer: "hsl(160, 67%, 52%)",
};
export const stageLabels: Record<string, string> = {
  lead: "Lead", contacted: "Gecontacteerd", qualified: "Gekwalificeerd",
  opportunity: "Kans", proposal_sent: "Offerte verstuurd", customer: "Klant",
};
export const tierColors: Record<string, string> = {
  hot: "hsl(0, 93%, 68%)", warm: "hsl(43, 96%, 56%)", cold: "#6b7280",
};
export const projStatus: Record<string, [string, string]> = {
  intake: ["Intake", "#6b7280"], quoted: ["Offerte", "hsl(43, 96%, 56%)"],
  in_progress: ["In ontwikkeling", "hsl(263, 86%, 77%)"], delivered: ["Opgeleverd", "hsl(160, 67%, 52%)"],
};
export const invStatus: Record<string, [string, string]> = {
  draft: ["Concept", "#6b7280"], sent: ["Verstuurd", "hsl(225, 93%, 64%)"],
  paid: ["Betaald", "hsl(160, 67%, 52%)"], overdue: ["Te laat", "hsl(0, 93%, 68%)"],
};
