import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.ts';

export function SheetJoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    api.joinSheet(code)
      .then(res => navigate(`/sheets/${res.id}`, { replace: true }))
      .catch(e => setError(e.message || 'Code invalide'));
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0c0c] text-gray-300 p-4">
      {error ? (
        <>
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={() => navigate('/sheets')} className="px-4 py-2 rounded-lg bg-[#1a6b3c] text-white">
            Retour aux feuilles
          </button>
        </>
      ) : (
        <p>Ouverture de la feuille...</p>
      )}
    </div>
  );
}
