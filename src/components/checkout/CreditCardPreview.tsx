import React, { useState } from 'react';
import { CreditCard, Shield } from 'lucide-react';

interface CreditCardPreviewProps {
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cvv: string;
}

const CreditCardPreview = ({ cardNumber, cardName, cardExpiry, cvv }: CreditCardPreviewProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted || '•••• •••• •••• ••••';
  };

  const getCardBrand = (number: string) => {
    const firstDigit = number.charAt(0);
    if (firstDigit === '4') return 'Visa';
    if (firstDigit === '5') return 'Mastercard';
    if (firstDigit === '3') return 'Amex';
    return 'Card';
  };

  return (
    <div className="perspective-1000 w-full max-w-sm mx-auto">
      <div 
        className={`relative w-full h-56 transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onMouseEnter={() => cvv && setIsFlipped(true)}
        onMouseLeave={() => setIsFlipped(false)}
      >
        {/* Frente do cartão */}
        <div className="absolute inset-0 w-full h-full backface-hidden">
          <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-xl p-6 text-white shadow-2xl border border-white/10">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-8 h-8 text-white/80" />
                <span className="text-sm font-medium text-white/80">{getCardBrand(cardNumber)}</span>
              </div>
              <Shield className="w-6 h-6 text-white/60" />
            </div>
            
            <div className="space-y-4">
              <div className="text-xl font-mono tracking-wider">
                {formatCardNumber(cardNumber)}
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-white/60 uppercase tracking-wide">Nome do Titular</div>
                  <div className="text-sm font-medium">
                    {cardName || 'SEU NOME AQUI'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60 uppercase tracking-wide">Validade</div>
                  <div className="text-sm font-medium font-mono">
                    {cardExpiry || 'MM/AAAA'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute top-6 right-6 w-12 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded opacity-80"></div>
          </div>
        </div>

        {/* Verso do cartão */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
          <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-xl shadow-2xl border border-white/10">
            <div className="w-full h-12 bg-black mt-6"></div>
            <div className="p-6">
              <div className="bg-white/10 rounded p-2 mb-4">
                <div className="text-xs text-white/60 uppercase tracking-wide mb-1">CVV</div>
                <div className="text-right font-mono text-lg">
                  {cvv ? '•'.repeat(cvv.length) : '•••'}
                </div>
              </div>
              <div className="text-xs text-white/60">
                Por favor, não compartilhe estas informações com terceiros.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardPreview;