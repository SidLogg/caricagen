'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, RefreshCw, Wand2 } from 'lucide-react';

interface FacialControlsProps {
    image: string;
    onNext: (exaggeration: number, prompt: string) => void;
    onUpdate: (exaggeration: number, prompt: string) => void;
    onBack: () => void;
}

export default function FacialControls({ image, onNext, onUpdate, onBack }: FacialControlsProps) {
    const [exaggeration, setExaggeration] = useState(20);
    const [prompt, setPrompt] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async () => {
        setIsUpdating(true);
        await onUpdate(exaggeration, prompt);
        setIsUpdating(false);
    };

    const getExaggerationLabel = (val: number) => {
        if (val === 0) return 'Nenhum';
        if (val <= 20) return 'Super Leve';
        if (val <= 40) return 'Leve';
        if (val <= 60) return 'Moderada';
        if (val <= 80) return 'Exagerada';
        return 'Super Exagerada';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto p-6 h-[calc(100vh-100px)]">
            <div className="relative rounded-xl overflow-hidden bg-muted/30 border flex items-center justify-center h-full min-h-[400px] p-4">
                {/* Image Container */}
                <div className="relative flex items-center justify-center w-full h-full">
                    <img
                        src={image}
                        alt="Generated Art"
                        className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                    />

                    {isUpdating && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-md">
                            <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="animate-spin text-white w-12 h-12" />
                                <span className="text-white font-bold">Gerando...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col justify-center space-y-8">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Arte Facial</h2>
                    <p className="text-muted-foreground">Ajuste o nível de exagero e detalhes.</p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="font-medium">Nível de Exagero</label>
                        <span className="text-primary font-bold">{exaggeration}% - {getExaggerationLabel(exaggeration)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={exaggeration}
                        onChange={(e) => setExaggeration(Number(e.target.value))}
                        onMouseUp={handleUpdate} // Trigger update when user releases slider
                        onTouchEnd={handleUpdate} // For mobile
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="font-medium">Prompt Adicional (Opcional)</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Sorriso mais largo, olhos brilhantes..."
                        className="w-full p-3 rounded-lg border bg-background min-h-[100px] focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        {isUpdating ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
                        Gerar Preview
                    </button>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onBack}
                        className="bg-secondary text-secondary-foreground px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <ArrowLeft size={20} /> Voltar
                    </button>
                    <button
                        onClick={() => onNext(exaggeration, prompt)}
                        className="flex-1 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        Próximo: Corpo <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
