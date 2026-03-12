import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SigningStepIndicator from "@/components/contracts/SigningStepIndicator";
import SigningDetailsStep from "@/components/contracts/SigningDetailsStep";
import SigningVerifyStep from "@/components/contracts/SigningVerifyStep";
import SigningSignStep from "@/components/contracts/SigningSignStep";
import SigningDoneStep from "@/components/contracts/SigningDoneStep";

type Step = "loading" | "error" | "details" | "verify" | "sign" | "done";

export default function ContractSigningPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("signing_token") || "";

  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fuvpmxxihmpustftzvgk.supabase.co"}/functions/v1/contract-signing`;

  useEffect(() => {
    if (!token) {
      setError("Geen geldig token gevonden");
      setStep("error");
      return;
    }

    fetch(`${baseUrl}?action=get&token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContract(data.contract);
        setSession(data.session);
        if (data.session?.status === "signed") {
          setStep("done");
        } else if (data.session?.sms_verified_at) {
          setStep("sign");
        } else {
          setStep("details");
        }
      })
      .catch((e) => {
        setError(e.message || "Kon contract niet laden");
        setStep("error");
      });
  }, [token, baseUrl]);

  const stepKey = step === "loading" || step === "error" ? "details" : step;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            SJ
          </div>
          <span className="font-semibold text-gray-900">SiteJob</span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-sm text-gray-500">Contract ondertekenen</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-4">
        {step !== "loading" && step !== "error" && (
          <SigningStepIndicator current={stepKey} />
        )}

        {step === "loading" && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Contract laden...</p>
          </div>
        )}

        {step === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">Fout</div>
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {step === "details" && contract && session && (
          <SigningDetailsStep
            session={session}
            contract={contract}
            onContinue={() => setStep("verify")}
          />
        )}

        {step === "verify" && (
          <SigningVerifyStep
            baseUrl={baseUrl}
            token={token}
            onVerified={() => setStep("sign")}
            onError={setError}
          />
        )}

        {step === "sign" && (
          <SigningSignStep
            baseUrl={baseUrl}
            token={token}
            onSigned={(data) => {
              setResult(data);
              setStep("done");
            }}
            onError={setError}
          />
        )}

        {step === "done" && (
          <SigningDoneStep
            result={result}
            signedAt={result?.signed_at || new Date().toISOString()}
          />
        )}
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        Beveiligd door SiteJob · eIDAS &amp; artikel 3:15a BW compliant
      </footer>
    </div>
  );
}
