'use client';

import { useState } from 'react';
import { Check, Download, FileImage, FileText, PenTool, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadSectionProps {
    image: string;
    onReset: () => void;
    onBack: () => void;
}

type Format = 'BITMAP' | 'PDF' | 'VECTOR_BW' | 'VECTOR_COLOR';

const FORMATS: { id: Format; label: string; desc: string; icon: any }[] = [
    { id: 'BITMAP', label: 'PNG HD', desc: 'Imagem em alta resolução (2x)', icon: FileImage },
    { id: 'PDF', label: 'PDF', desc: 'PNG HD + instruções para PDF', icon: FileText },
    { id: 'VECTOR_BW', label: 'VETOR P/B', desc: 'PNG HD + instruções para vetorizar', icon: PenTool },
    { id: 'VECTOR_COLOR', label: 'VETOR COLORIDO', desc: 'PNG HD + instruções para vetorizar', icon: PenTool },
];

export default function DownloadSection({ image, onReset, onBack }: DownloadSectionProps) {
    const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadImage = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const upscaleImage = (base64Image: string, scale: number = 2): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                // Upscale the image
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                // Use better image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png', 1.0));
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = base64Image;
        });
    };

    const handleDownload = async () => {
        if (!selectedFormat || !image) return;
        setIsDownloading(true);

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            
            if (selectedFormat === 'BITMAP') {
                // Download high-res PNG (2x upscale)
                const upscaled = await upscaleImage(image, 2);
                downloadImage(upscaled, `caricatura-hd-${timestamp}.png`);
                
            } else if (selectedFormat === 'PDF') {
                // Download as high-res PNG with note
                const upscaled = await upscaleImage(image, 2);
                downloadImage(upscaled, `caricatura-hd-${timestamp}.png`);
                setTimeout(() => {
                    alert('✅ Download concluído!\n\n💡 Dica: Para converter para PDF, use um conversor online como "PNG to PDF" ou abra a imagem e salve como PDF.');
                }, 500);
                
            } else if (selectedFormat === 'VECTOR_BW' || selectedFormat === 'VECTOR_COLOR') {
                // Download as high-res PNG with vectorization note
                const upscaled = await upscaleImage(image, 2);
                downloadImage(upscaled, `caricatura-hd-${timestamp}.png`);
                setTimeout(() => {
                    alert('✅ Download concluído!\n\n💡 Dica: Para vetorizar, use:\n• Adobe Illustrator (Image Trace)\n• Inkscape (gratuito)\n• Vectorizer.io (online)');
                }, 500);
            }
            
            setTimeout(() => {
                setIsDownloading(false);
            }, 1000);
            
        } catch (error) {
            console.error('Download error:', error);
            alert('❌ Erro ao fazer download. Tente novamente.');
            setIsDownloading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto p-6 h-[calc(100vh-100px)]">
            <div className="relative rounded-xl overflow-hidden bg-muted border flex items-center justify-center h-full min-h-[400px]">
                <img src={image} alt="Final Art" className="w-full h-full object-contain" />
            </div>

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

                    <div className="flex gap-3">
                        <button
                            onClick={onBack}
                            className="flex-1 px-6 py-3 rounded-lg font-medium border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} /> Voltar
                        </button>
                        <button
                            onClick={onReset}
                            className="flex-1 px-6 py-3 rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Nova Arte
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
