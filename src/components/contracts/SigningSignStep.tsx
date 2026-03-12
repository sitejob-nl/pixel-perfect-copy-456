import { useState } from "react";
import SignatureCanvas from "./SignatureCanvas";

interface Props {
  baseUrl: string;
  token: string;
  onSigned: (result: any) => void;
  onError: (msg: string) => void;
}

export default function SigningSignStep({ baseUrl, token, onSigned, onError }: Props) {
  const [signatureType, setSignatureType] = useState<"draw" | "type">("draw");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const canSign = consentAccepted && (signatureType === "draw" ? !!signatureData : !!typedName.trim());

  const handleSign = async () => {
    setSigning(true);
    setError("");
    try {
      let geo: { lat: number; lng: number } | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { /* optional */ }

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
      onSigned(data);
    } catch (e: any) {
      const msg = e.message || "Ondertekening mislukt";
      setError(msg);
      onError(msg);
    }
    setSigning(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Handtekening plaatsen</h2>

        {/* Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSignatureType("draw")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              signatureType === "draw"
                ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                : "bg-gray-100 text-gray-600 border-2 border-transparent"
            }`}
          >
            ✍️ Tekenen
          </button>
          <button
            onClick={() => setSignatureType("type")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        disabled={signing || !canSign}
        className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors text-lg"
      >
        {signing ? "Ondertekenen..." : "✅ Onderteken contract"}
      </button>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
