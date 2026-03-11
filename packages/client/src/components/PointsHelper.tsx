import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TRUMP_TABLE = [
  ['Valet', '20'],
  ['9', '14'],
  ['As', '11'],
  ['10', '10'],
  ['Roi', '4'],
  ['Dame', '3'],
  ['8', '0'],
  ['7', '0'],
];

const NON_TRUMP_TABLE = [
  ['As', '11'],
  ['10', '10'],
  ['Roi', '4'],
  ['Dame', '3'],
  ['Valet', '2'],
  ['9', '0'],
  ['8', '0'],
  ['7', '0'],
];

export function PointsHelper() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1a1a2e] border border-[#3a3a4e] text-gray-400 hover:text-white hover:border-[#2d8f54] transition text-sm font-bold cursor-pointer"
        title="Valeur des cartes"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] shadow-2xl p-4 sm:p-6 w-[90vw] max-w-sm"
            >
              <h3 className="text-white font-bold text-center mb-3 text-sm sm:text-base">Valeur des cartes</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Atout */}
                <div>
                  <div className="text-[#d4a843] font-semibold text-xs sm:text-sm text-center mb-1.5">Atout</div>
                  <table className="w-full text-xs sm:text-sm">
                    <tbody>
                      {TRUMP_TABLE.map(([card, pts]) => (
                        <tr key={card} className="border-b border-[#2a2a3e]/50">
                          <td className="text-gray-300 py-0.5">{card}</td>
                          <td className="text-white font-bold text-right py-0.5">{pts}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-[#3a3a4e]">
                        <td className="text-gray-400 py-1 font-medium">Total</td>
                        <td className="text-[#d4a843] font-bold text-right py-1">62</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Non-atout */}
                <div>
                  <div className="text-blue-400 font-semibold text-xs sm:text-sm text-center mb-1.5">Non-atout</div>
                  <table className="w-full text-xs sm:text-sm">
                    <tbody>
                      {NON_TRUMP_TABLE.map(([card, pts]) => (
                        <tr key={card} className="border-b border-[#2a2a3e]/50">
                          <td className="text-gray-300 py-0.5">{card}</td>
                          <td className="text-white font-bold text-right py-0.5">{pts}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-[#3a3a4e]">
                        <td className="text-gray-400 py-1 font-medium">Total</td>
                        <td className="text-blue-400 font-bold text-right py-1">30</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-3 text-gray-500 text-[10px] sm:text-xs text-center">
                Total : 152 pts + 10 (dernier pli) = 162
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-3 w-full py-2 rounded-lg bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white text-sm transition cursor-pointer"
              >
                Fermer
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
