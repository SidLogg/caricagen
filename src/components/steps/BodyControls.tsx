'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';

interface BodyControlsProps {
    image: string;
    onNext: (exaggeration: number, prompt: string) => void;
    onUpdate: (exaggeration: number, prompt: string) => void;
}

export default function BodyControls({ image, onNext, onUpdate }: BodyControlsProps) {
    const [exaggeration, setExaggeration] = useState(20);
    const [prompt, setPrompt] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsUpdating(true);
            onUpdate(exaggeration, prompt);
            setTimeout(() => setIsUpdating(false), 500);
        }, 500);
        return () => clearTimeout(timer);
    }, [exaggeration, prompt]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {/* Preview Area */}
            <div className="relative rounded-xl overflow-hidden bg-muted border flex items-center justify-center h-full min-h-[400px]">
                <div className="relative w-full h-full">
                    <img src={image} alt="Generated Art" className="w-full h-full object-contain" />
                    {isUpdating && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <RefreshCw className="animate-spin text-white w-12 h-12" />
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Area */}
            <div className="flex flex-col justify-center space-y-8">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Arte Corporal</h2>
                    <p className="text-muted-foreground">Defina a pose, cenário e acessórios.</p>
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
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="font-medium">Prompt de Corpo e Cenário</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Segurando uma guitarra, fundo de palco de rock, vestindo jaqueta de couro..."
                        className="w-full p-3 rounded-lg border bg-background min-h-[100px] focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>

                <div className="pt-4">
                    <button
                        onClick={() => onNext(exaggeration, prompt)}
                        className="w-full bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        Gerar Corpo e Finalizar <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
