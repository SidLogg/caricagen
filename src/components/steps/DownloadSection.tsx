'use client';

import { useState } from 'react';
import { Check, Download, FileImage, FileText, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadSectionProps {
    image: string;
    onReset: () => void;
}

type Format = 'BITMAP' | 'PDF' | 'VECTOR_BW' | 'VECTOR_COLOR';

const FORMATS: { id: Format; label: string; desc: string; icon: any }[] = [
    { id: 'BITMAP', label: 'BITMAP', desc: 'JPG, PNG, 300dpi HD', icon: FileImage },
    { id: 'PDF', label: 'PDF', desc: 'Alta resolução', icon: FileText },
    { id: 'VECTOR_BW', label: 'VETOR P/B', desc: '.CDR/.AI Preto e Branco', icon: PenTool },
    { id: 'VECTOR_COLOR', label: 'VETOR COLORIDO', desc: '.CDR/.AI Colorido HD', icon: PenTool },
];

export default function DownloadSection({ image, onReset }: DownloadSectionProps) {
    const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = () => {
        if (!selectedFormat) return;
        setIsDownloading(true);

        // Simulate download delay
        setTimeout(() => {
            setIsDownloading(false);
            // In a real app, this would trigger a file download
            alert(`Download iniciado: ${selectedFormat}`);
        }, 1500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto p-6 h-[calc(100vh-100px)]">
            {/* Result Area */}
            <div className="relative rounded-xl overflow-hidden bg-muted border flex items-center justify-center h-full min-h-[400px]">
                <img src={image} alt="Final Art" className="w-full h-full object-contain" />
            </div>

            {/* Download Options */}
            <div className="flex flex-col justify-center space-y-8">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Sua Arte está Pronta!</h2>
                    <p className="text-muted-foreground">Escolha o formato ideal para o seu uso.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {FORMATS.map((format) => {
                        const Icon = format.icon;
                        return (
                            <button
                                key={format.id}
                                onClick={() => setSelectedFormat(format.id)}
                                className={cn(
                                    "flex items-center p-4 rounded-xl border-2 transition-all text-left hover:border-primary/50",
                                    selectedFormat === format.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                                )}
                            >
                                <div className={cn("p-3 rounded-full mr-4", selectedFormat === format.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                    <Icon size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold">{format.label}</h3>
                                    <p className="text-sm text-muted-foreground">{format.desc}</p>
                                </div>
                                {selectedFormat === format.id && <Check className="text-primary" />}
                            </button>
                        );
                    })}
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        onClick={handleDownload}
                        disabled={!selectedFormat || isDownloading}
                        className="w-full bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? (
                            'Preparando Arquivo...'
                        ) : (
                            <>
                                <Download size={20} /> Baixar Agora
                            </>
                        )}
                    </button>

                    <button
                        onClick={onReset}
                        className="w-full px-8 py-3 rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Criar Nova Arte
                    </button>
                </div>
            </div>
        </div>
    );
}
