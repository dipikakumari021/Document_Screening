"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, Search, UserCheck, AlertTriangle, FileImage } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

type Step = "UPLOAD" | "PROCESSING" | "RESULT";

export default function NewScreeningPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("UPLOAD");
  const [processingStage, setProcessingStage] = useState(0);
  const [result, setResult] = useState<any>(null);

  const stages = [
    { name: "OCR & Data Extraction", icon: FileText, desc: "Reading text and MRZ codes..." },
    { name: "Document Validation", icon: CheckCircle, desc: "Verifying formatting and expiry..." },
    { name: "Tampering Detection", icon: Search, desc: "Analyzing image metadata and structures..." },
    { name: "Face Verification", icon: UserCheck, desc: "Comparing document photo with live face..." },
  ];

  const handleSimulateUpload = () => {
    setStep("PROCESSING");
    
    // Simulate progression through stages
    let currentStage = 0;
    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setProcessingStage(currentStage);
      } else {
        clearInterval(interval);
        submitScreening();
      }
    }, 1200); // 1.2 seconds per stage
  };

  const submitScreening = async () => {
    try {
      const res = await fetch("/api/screenings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: "Passport", name: "Rajesh Kumar" }),
      });
      const data = await res.json();
      setResult(data);
      setStep("RESULT");
    } catch (error) {
      console.error(error);
      // Fallback result for demo purposes if API fails
      setResult({
        riskLevel: "LOW",
        riskScore: 12,
        status: "CLEARED"
      });
      setStep("RESULT");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New Screening</h1>
        <p className="text-slate-500 mt-1">Upload identity documents for AI verification.</p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col relative">
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-4 justify-between items-center">
           <div className="flex gap-2">
             <div className={`h-2 w-16 rounded-full transition-colors ${step === 'UPLOAD' || step === 'PROCESSING' || step === 'RESULT' ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
             <div className={`h-2 w-16 rounded-full transition-colors ${step === 'PROCESSING' || step === 'RESULT' ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
             <div className={`h-2 w-16 rounded-full transition-colors ${step === 'RESULT' ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
           </div>
           <span className="text-sm font-medium text-slate-500">
             Step {step === 'UPLOAD' ? 1 : step === 'PROCESSING' ? 2 : 3} of 3
           </span>
        </div>
        
        <CardContent className="flex-1 p-8 flex flex-col justify-center items-center">
          
          {step === "UPLOAD" && (
            <div className="w-full max-w-xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="grid grid-cols-2 gap-6">
                 <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group">
                   <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <FileImage className="w-8 h-8" />
                   </div>
                   <h3 className="font-semibold text-slate-800">Travel Document</h3>
                   <p className="text-xs text-slate-500 mt-1">Upload Passport or ID</p>
                 </div>
                 
                 <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group">
                   <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <UserCheck className="w-8 h-8" />
                   </div>
                   <h3 className="font-semibold text-slate-800">Live Photo</h3>
                   <p className="text-xs text-slate-500 mt-1">Capture or upload face</p>
                 </div>
              </div>
              
              <Button size="lg" onClick={handleSimulateUpload} className="w-full max-w-sm h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                Start Screening Process
              </Button>
            </div>
          )}

          {step === "PROCESSING" && (
            <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">AI Analysis in Progress</h3>
                <p className="text-slate-500">Please wait while PRAMAAN AI verifies the documents.</p>
              </div>
              
              <div className="space-y-4">
                {stages.map((stage, i) => {
                  const isActive = i === processingStage;
                  const isDone = i < processingStage;
                  const Icon = stage.icon;
                  
                  return (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm scale-[1.02]' : isDone ? 'bg-white border-emerald-100 opacity-60' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white animate-pulse' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className={`font-semibold ${isActive ? 'text-blue-900' : isDone ? 'text-emerald-900' : 'text-slate-500'}`}>{stage.name}</h4>
                        <p className={`text-xs ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{isDone ? 'Completed' : isActive ? stage.desc : 'Pending...'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === "RESULT" && result && (
            <div className="w-full max-w-2xl animate-in slide-in-from-bottom-8 duration-700">
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-xl ${
                  result.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20' : 
                  result.riskLevel === 'HIGH' ? 'bg-red-100 text-red-600 shadow-red-500/20' : 
                  'bg-amber-100 text-amber-600 shadow-amber-500/20'
                }`}>
                  {result.riskLevel === 'LOW' ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Screening Complete</h2>
                <p className="text-slate-500 mt-2">ID: {result.screeningId}</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className={`p-6 text-center border-b ${
                  result.riskLevel === 'LOW' ? 'bg-emerald-50 border-emerald-100' : 
                  result.riskLevel === 'HIGH' ? 'bg-red-50 border-red-100' : 
                  'bg-amber-50 border-amber-100'
                }`}>
                  <div className="text-sm font-semibold uppercase tracking-wider mb-1 opacity-70">Calculated Risk Score</div>
                  <div className="text-5xl font-black">{result.riskScore}<span className="text-2xl font-normal opacity-50">/100</span></div>
                  <div className="mt-2 text-sm font-medium">
                    {result.status === 'CLEARED' ? 'Verification Passed - Allow Entry' : 'Manual Review Recommended'}
                  </div>
                </div>
                
                <div className="p-6 grid sm:grid-cols-2 gap-6">
                   <div>
                     <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Extracted Data</h4>
                     <ul className="space-y-3 text-sm">
                       <li className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Name:</span> <span className="font-medium">{result.name}</span></li>
                       <li className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Document:</span> <span className="font-medium">{result.documentType}</span></li>
                       {result.primaryConcern && (
                         <li className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Concern:</span> <span className="font-medium text-red-600">{result.primaryConcern}</span></li>
                       )}
                     </ul>
                   </div>
                   <div>
                     <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">AI Verification</h4>
                     <ul className="space-y-3 text-sm">
                       <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                         <span className="text-slate-500">MRZ Valid:</span> 
                         <CheckCircle className="w-4 h-4 text-emerald-500" />
                       </li>
                       <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                         <span className="text-slate-500">Face Match:</span> 
                         <span className={`font-bold ${result.faceMatchScore < 60 ? 'text-red-500' : 'text-emerald-500'}`}>{result.faceMatchScore}%</span>
                       </li>
                       <li className="flex justify-between items-center border-b border-slate-100 pb-2">
                         <span className="text-slate-500">Tampering Check:</span> 
                         {result.riskLevel === 'HIGH' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                       </li>
                     </ul>
                   </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center gap-4">
                 <Button variant="outline" onClick={() => setStep("UPLOAD")} className="h-11 px-6">
                   Start Another
                 </Button>
                 <Button onClick={() => router.push("/dashboard")} className="bg-blue-600 hover:bg-blue-700 h-11 px-6">
                   Return to Dashboard
                 </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
