import { useState } from "react";

interface Props {
  session: any;
  contract: any;
  onContinue: () => void;
}

export default function SigningDetailsStep({ session, contract, onContinue }: Props) {
  const [agreed, setAgreed] = useState(false);

  const hasPdf = !!contract.pdf_url;
  const hasHtml = !!(contract.rendered_html || contract.content);

  return (
    <div className="space-y-6">
      {/* Contract preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{contract.title}</h1>
            <p className="text-sm text-gray-500 font-mono">{contract.contract_number}</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPdf && (
              <a
                href={contract.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                📥 Download PDF
              </a>
            )}
            {contract.expires_at && (
              <span className="text-xs text-gray-400">
                Vervalt: {new Date(contract.expires_at).toLocaleDateString("nl-NL")}
              </span>
            )}
          </div>
        </div>

        {/* PDF viewer */}
        {hasPdf && (
          <div className="border-t border-gray-100 pt-4">
            <iframe
              src={`${contract.pdf_url}#toolbar=1&navpanes=0`}
              className="w-full rounded-lg border border-gray-200"
              style={{ height: "70vh", minHeight: 500 }}
              title="Contract PDF"
            />
          </div>
        )}

        {/* HTML content fallback */}
        {!hasPdf && hasHtml && (
          <div
            className="prose prose-sm max-w-none border-t border-gray-100 pt-4 max-h-[60vh] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: contract.rendered_html || contract.content || "" }}
          />
        )}

        {/* No content */}
        {!hasPdf && !hasHtml && (
          <div className="border-t border-gray-100 pt-4 text-center py-12 text-gray-400">
            <p>Geen contractinhoud beschikbaar.</p>
          </div>
        )}
      </div>

      {/* Signer info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Uw gegevens</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-blue-600">Naam:</span>
            <p className="font-medium text-blue-900">{session.signer_name}</p>
          </div>
          <div>
            <span className="text-blue-600">E-mail:</span>
            <p className="font-medium text-blue-900">{session.signer_email}</p>
          </div>
          <div>
            <span className="text-blue-600">Telefoon:</span>
            <p className="font-medium text-blue-900">{session.signer_phone || "—"}</p>
          </div>
          <div>
            <span className="text-blue-600">Rol:</span>
            <p className="font-medium text-blue-900">{session.signer_role || "Ondertekenaar"}</p>
          </div>
        </div>
      </div>

      {/* Confirm read */}
      <label className="flex gap-3 cursor-pointer bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">
          Ik heb het bovenstaande contract gelezen en wil doorgaan naar verificatie en ondertekening.
        </span>
      </label>

      <button
        onClick={onContinue}
        disabled={!agreed}
        className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        Doorgaan naar verificatie
      </button>
    </div>
  );
}
