interface Props {
  result: any;
  signedAt: string;
}

export default function SigningDoneStep({ result, signedAt }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-200 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">✅</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Contract ondertekend</h2>
      <p className="text-gray-600 mb-4">
        Uw handtekening is geregistreerd. U ontvangt een bevestiging per e-mail.
      </p>
      {result?.document_hash && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-500 mb-4 break-all">
          Document hash: {result.document_hash}
        </div>
      )}
      <p className="text-xs text-gray-400">
        Ondertekend op: {new Date(signedAt).toLocaleString("nl-NL")}
      </p>
    </div>
  );
}
