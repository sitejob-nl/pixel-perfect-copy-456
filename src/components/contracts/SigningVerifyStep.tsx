import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  baseUrl: string;
  token: string;
  onVerified: () => void;
  onError: (msg: string) => void;
}

export default function SigningVerifyStep({ baseUrl, token, onVerified, onError }: Props) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const sendCode = useCallback(async () => {
    if (resendCount >= 3) {
      setError("Maximum aantal verzendpogingen bereikt");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}?action=send_sms&token=${token}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        if (data.retry_after) setCountdown(data.retry_after);
      } else {
        setSent(true);
        setCountdown(60);
        setResendCount((c) => c + 1);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Kon code niet verzenden");
    }
    setSending(false);
  }, [baseUrl, token, resendCount]);

  const verifyCode = useCallback(async (code: string) => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}?action=verify_sms&token=${token}&code=${code}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        onVerified();
      }
    } catch {
      setError("Verificatie mislukt");
    }
    setVerifying(false);
  }, [baseUrl, token, onVerified]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (value && index === 5) {
      const code = next.join("");
      if (code.length === 6) verifyCode(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      const next = pasted.split("");
      setDigits(next);
      verifyCode(pasted);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-2">Identiteit bevestigen</h2>
      <p className="text-sm text-gray-600 mb-6">
        We sturen een verificatiecode naar uw e-mailadres om uw identiteit te bevestigen.
      </p>

      {!sent ? (
        <button
          onClick={sendCode}
          disabled={sending}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? "Verzenden..." : "Verstuur verificatiecode"}
        </button>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Voer de 6-cijferige code in</label>

          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-mono border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            ))}
          </div>

          <button
            onClick={() => verifyCode(digits.join(""))}
            disabled={verifying || digits.join("").length < 6}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {verifying ? "Verifiëren..." : "Verifiëren"}
          </button>

          {/* Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-400">
                Opnieuw versturen in {countdown}s
              </p>
            ) : resendCount < 3 ? (
              <button
                onClick={sendCode}
                disabled={sending}
                className="text-sm text-blue-600 hover:underline"
              >
                Code niet ontvangen? Opnieuw versturen
              </button>
            ) : (
              <p className="text-sm text-red-500">Maximum verzendpogingen bereikt</p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
    </div>
  );
}
