import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SignatureCanvas from "@/components/contracts/SignatureCanvas";

type SigningStep = "loading" | "error" | "read" | "verify" | "sign" | "done";

export default function ContractSigningPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("signing_token") || "";

  const [step, setStep] = useState<SigningStep>("loading");
  const [error, setError] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [smsCode, setSmsCode] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fuvpmxxihmpustftzvgk.supabase.co"}/functions/v1/contract-signing`;

  // Load contract data
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
        setStep(data.session?.status === "signed" ? "done" : "read");
      })
      .catch((e) => {
        setError(e.message || "Kon contract niet laden");
        setStep("error");
      });
  }, [token, baseUrl]);

  const handleSendSms = async () => {
    setSmsSending(true);
    try {
      const res = await fetch(`${baseUrl}?action=send_sms&token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (e: any) {
      setError(e.message);
    }
    setSmsSending(false);
  };

  const handleVerifySms = async () => {
    try {
      const res = await fetch(`${baseUrl}?action=verify_sms&token=${token}&code=${smsCode}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSmsVerified(true);
      setStep("sign");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSign = async () => {
    setSigning(true);
    try {
      let geo: any = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {}

      const sigData = signatureType === "draw" ? signatureData : typedName;

      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          token,
          signature_data: sigData,
          signature_type: signatureType,
          consent_accepted: true,
          geolocation: geo,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    }
    setSigning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">SJ</div>
          <span className="font-semibold text-gray-900">SiteJob</span>
          <span className="text-gray-300 mx-2">|</span>
          <span className="text-sm text-gray-500">Contract ondertekenen</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-4">
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

        {step === "read" && contract && session && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{contract.title}</h1>
                  <p className="text-sm text-gray-500 font-mono">{contract.contract_number}</p>
                </div>
                {contract.expires_at && (
                  <span className="text-xs text-gray-400">
                    Vervalt: {new Date(contract.expires_at).toLocaleDateString("nl-NL")}
                  </span>
                )}
              </div>

              {/* Contract HTML */}
              <div
                className="prose prose-sm max-w-none border-t border-gray-100 pt-4 max-h-[500px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: contract.rendered_html || contract.content || "" }}
              />
            </div>

            {/* Signer info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                U ondertekent als: <strong>{session.signer_name}</strong> ({session.signer_email})
              </p>
              <p className="text-xs text-blue-600 mt-1">Rol: {session.signer_role}</p>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors"
            >
              Doorgaan naar verificatie
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Identiteit bevestigen</h2>
            <p className="text-sm text-gray-600 mb-4">
              We sturen een verificatiecode naar uw telefoonnummer om uw identiteit te bevestigen.
            </p>

            {!smsSending && !smsCode && (
              <button
                onClick={handleSendSms}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 mb-4"
              >
                Verstuur verificatiecode
              </button>
            )}

            {smsSending && <p className="text-sm text-gray-500 mb-4">Code verzenden...</p>}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Verificatiecode</label>
              <input
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleVerifySms}
                disabled={smsCode.length < 6}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium disabled:opacity-50 hover:bg-blue-700"
              >
                Verifiëren
              </button>
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </div>
        )}

        {step === "sign" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Handtekening plaatsen</h2>

              {/* Signature type toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSignatureType("draw")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    signatureType === "draw"
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                      : "bg-gray-100 text-gray-600 border-2 border-transparent"
                  }`}
                >
                  ✍️ Tekenen
                </button>
                <button
                  onClick={() => setSignatureType("type")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    signatureType === "type"
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                      : "bg-gray-100 text-gray-600 border-2 border-transparent"
                  }`}
                >
                  ⌨️ Typen
                </button>
              </div>

              {signatureType === "draw" ? (
                <SignatureCanvas onSignatureChange={setSignatureData} />
              ) : (
                <div>
                  <input
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Uw volledige naam"
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 text-2xl text-center focus:outline-none focus:border-blue-400"
                    style={{ fontFamily: "'Dancing Script', cursive, serif", fontStyle: "italic" }}
                  />
                  <p className="text-xs text-gray-400 mt-2">Uw naam wordt gebruikt als getypte handtekening</p>
                </div>
              )}
            </div>

            {/* Consent */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  Ik verklaar dat ik het bovenstaande contract heb gelezen en ga akkoord met de inhoud.
                  Ik begrijp dat deze elektronische handtekening rechtsgeldig is conform{" "}
                  <strong>artikel 3:15a BW</strong> en de Europese <strong>eIDAS-verordening</strong>.
                </span>
              </label>
            </div>

            <button
              onClick={handleSign}
              disabled={signing || !consentAccepted || (signatureType === "draw" ? !signatureData : !typedName)}
              className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors text-lg"
            >
              {signing ? "Ondertekenen..." : "✅ Onderteken contract"}
            </button>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {step === "done" && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Contract ondertekend</h2>
            <p className="text-gray-600 mb-4">
              Uw handtekening is geregistreerd. U ontvangt een bevestiging per e-mail.
            </p>
            {result?.document_hash && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-500 mb-4">
                Document hash: {result.document_hash}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Ondertekend op: {new Date().toLocaleString("nl-NL")}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        Beveiligd door SiteJob · eIDAS & artikel 3:15a BW compliant
      </footer>
    </div>
  );
}
