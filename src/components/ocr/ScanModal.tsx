import React, { useState, useRef } from 'react';
import { OcrService, ExtractedSalesData } from '../../lib/ocrService';
import {
  Upload,
  Sparkles,
  X,
  Check,
  Loader2,
  ScanLine,
  Camera,
} from 'lucide-react';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ExtractedSalesData) => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedSalesData | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setIsLoading(true);
    setStatusMessage('Memproses gambar dengan AI OCR Engine...');
    try {
      const result = await OcrService.processBillImage(base64);
      setExtractedData(result);
      setStatusMessage('Data berhasil dideteksi! Silakan periksa hasil ekstraksi.');
    } catch {
      setStatusMessage('Gagal mengekstrak struk. Gunakan nilai perkiraan atau input manual.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApplyData(extractedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-2xl overflow-hidden transition">
        {/* Header */}
        <div className="p-4 border-b border-amber-200/80 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-1.5">
                <span>AI OCR Scanner Struk / Bill</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-200 text-amber-900 border border-amber-300">
                  Mistral &bull; Gemini
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Pindai foto struk kasir POS Cinema XXI untuk input otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition flex flex-col items-center justify-center space-y-3 bg-[#faf8f4]"
            >
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-800">
                  Klik untuk Pilih Gambar Struk / Bill POS
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung JPG, PNG, Kamera Mobile &bull; OCR Otomatis
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 flex items-center space-x-1.5 shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Galeri / Kamera</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-amber-200 max-h-48 flex justify-center bg-slate-50">
                <img
                  src={imagePreview}
                  alt="Struk POS"
                  className="object-contain max-h-48 w-auto"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setExtractedData(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoading && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center space-x-3 text-amber-800 text-xs font-bold">
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-amber-600" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {extractedData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>{extractedData.confidence || 'Terdeteksi Sukses'}</span>
                    </span>
                    {extractedData.detectedText && (
                      <span className="text-[10px] text-slate-500">{extractedData.detectedText}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">OMSET CINEMA</span>
                      <span className="font-black text-amber-800 text-sm">
                        Rp {extractedData.omsetCinema?.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">OMSET F&B</span>
                      <span className="font-black text-emerald-800 text-sm">
                        Rp {extractedData.omsetFnB?.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">TOTAL BILL</span>
                      <span className="font-black text-cyan-800 text-sm">
                        {extractedData.bill} Struk
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-bold">PENONTON</span>
                      <span className="font-black text-purple-800 text-sm">
                        {extractedData.penonton} Orang
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Batal
          </button>
          {extractedData && (
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan ke Form Sales</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
