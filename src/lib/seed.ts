import { connectDB } from "./db";
import { Screening } from "@/models/Screening";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function ensureOfficersSeeded() {
  await connectDB();
  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  const officers = [
    {
      email: "arjun.singh@pramaan.gov.in",
      password: defaultPasswordHash,
      name: "Inspector Arjun Singh",
      role: "Immigration Inspector",
    },
    {
      email: "priya.sharma@pramaan.gov.in",
      password: defaultPasswordHash,
      name: "Officer Priya Sharma",
      role: "Border Security Officer",
    },
    {
      email: "vikram.rao@pramaan.gov.in",
      password: defaultPasswordHash,
      name: "Supervisor Vikram Rao",
      role: "Checkpoint Supervisor",
    },
    {
      email: "demo@example.com",
      password: defaultPasswordHash,
      name: "Officer Arjun Singh",
      role: "Border Security Officer",
    },
  ];

  for (const officer of officers) {
    await User.findOneAndUpdate(
      { email: officer.email },
      { $set: { name: officer.name, role: officer.role, password: officer.password } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export async function ensureDatabaseSeeded(officerName: string = "Arjun Singh") {
  await connectDB();
  await ensureOfficersSeeded();
  const count = await Screening.countDocuments();
  if (count >= 8) return;

  const realScreenings = [
    {
      screeningId: "SCR-10482",
      time: new Date(Date.now() - 1000 * 60 * 18), // 18 mins ago (10:42)
      documentType: "Passport",
      name: "Tariq Mansoor",
      riskScore: 88,
      riskLevel: "HIGH",
      status: "PENDING REVIEW",
      officerId: officerName,
      primaryConcern: "Face mismatch",
      ocrData: JSON.stringify({
        passportNo: "P8920114",
        nationality: "EGY",
        dob: "12/04/1988",
        expiry: "20/09/2028",
        mrzValid: true,
      }),
      faceMatchScore: 42.1,
    },
    {
      screeningId: "SCR-10481",
      time: new Date(Date.now() - 1000 * 60 * 20), // 10:40
      documentType: "Passport",
      name: "David Miller",
      riskScore: 12,
      riskLevel: "LOW",
      status: "CLEARED",
      officerId: officerName,
      primaryConcern: null,
      ocrData: JSON.stringify({
        passportNo: "P4401928",
        nationality: "GBR",
        dob: "22/11/1993",
        expiry: "15/05/2033",
        mrzValid: true,
      }),
      faceMatchScore: 97.4,
    },
    {
      screeningId: "SCR-10480",
      time: new Date(Date.now() - 1000 * 60 * 23), // 10:37
      documentType: "Passport",
      name: "Maria Fernandez",
      riskScore: 14,
      riskLevel: "LOW",
      status: "CLEARED",
      officerId: officerName,
      primaryConcern: null,
      ocrData: JSON.stringify({
        passportNo: "P6720491",
        nationality: "ESP",
        dob: "08/02/1995",
        expiry: "18/11/2031",
        mrzValid: true,
      }),
      faceMatchScore: 95.8,
    },
    {
      screeningId: "SCR-10479",
      time: new Date(Date.now() - 1000 * 60 * 27), // 10:33
      documentType: "ID Card",
      name: "Ravi Kumar",
      riskScore: 48,
      riskLevel: "MEDIUM",
      status: "PENDING REVIEW",
      officerId: officerName,
      primaryConcern: "Microprint irregularity",
      ocrData: JSON.stringify({
        passportNo: "IND9034812",
        nationality: "IND",
        dob: "15/08/1990",
        expiry: "30/06/2030",
        mrzValid: true,
      }),
      faceMatchScore: 84.6,
    },
    {
      screeningId: "SCR-10478",
      time: new Date(Date.now() - 1000 * 60 * 31), // 10:29
      documentType: "Passport",
      name: "Li Wei",
      riskScore: 8,
      riskLevel: "LOW",
      status: "CLEARED",
      officerId: officerName,
      primaryConcern: null,
      ocrData: JSON.stringify({
        passportNo: "G5819024",
        nationality: "CHN",
        dob: "04/07/1987",
        expiry: "03/07/2029",
        mrzValid: true,
      }),
      faceMatchScore: 98.2,
    },
    {
      screeningId: "SCR-10477",
      time: new Date(Date.now() - 1000 * 60 * 35), // 10:31
      documentType: "Passport",
      name: "Viktor Petrov",
      riskScore: 56,
      riskLevel: "MEDIUM",
      status: "PENDING REVIEW",
      officerId: officerName,
      primaryConcern: "Document anomaly",
      ocrData: JSON.stringify({
        passportNo: "P1198302",
        nationality: "RUS",
        dob: "19/09/1984",
        expiry: "10/01/2027",
        mrzValid: true,
      }),
      faceMatchScore: 78.3,
    },
    {
      screeningId: "SCR-10476",
      time: new Date(Date.now() - 1000 * 60 * 38), // 10:22
      documentType: "Passport",
      name: "Sarah Johnson",
      riskScore: 6,
      riskLevel: "LOW",
      status: "CLEARED",
      officerId: officerName,
      primaryConcern: null,
      ocrData: JSON.stringify({
        passportNo: "P9023411",
        nationality: "USA",
        dob: "30/03/1991",
        expiry: "25/08/2032",
        mrzValid: true,
      }),
      faceMatchScore: 99.1,
    },
    {
      screeningId: "SCR-10465",
      time: new Date(Date.now() - 1000 * 60 * 42), // 10:18
      documentType: "ID Card",
      name: "Elena Rostova",
      riskScore: 52,
      riskLevel: "MEDIUM",
      status: "PENDING REVIEW",
      officerId: officerName,
      primaryConcern: "Data inconsistency",
      ocrData: JSON.stringify({
        passportNo: "EU7812903",
        nationality: "DEU",
        dob: "11/12/1989",
        expiry: "14/12/2026",
        mrzValid: true,
      }),
      faceMatchScore: 81.5,
    },
  ];

  for (const s of realScreenings) {
    await Screening.findOneAndUpdate(
      { screeningId: s.screeningId },
      { ...s, officerId: officerName },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
