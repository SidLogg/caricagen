'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StyleSelection from '@/components/steps/StyleSelection';
import FacialControls from '@/components/steps/FacialControls';
import BodyControls from '@/components/steps/BodyControls';
import DownloadSection from '@/components/steps/DownloadSection';
import { generateInitial, updateFacial, updateBody, Style } from '@/lib/mockAI';
import { Loader2 } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function Home() {
    const [step, setStep] = useState<Step>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState<string>('');

    // State for generation params (unused in mock but good for structure)
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);

    const handleStyleSelect = async (style: Style, files: File[]) => {
        setIsLoading(true);
        setSelectedStyle(style);
        try {
            const result = await generateInitial(style, files);
            setCurrentImage(result.imageUrl);
            setStep(2);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacialNext = async (exaggeration: number, prompt: string) => {
        setStep(3);
    };

    const handleFacialUpdate = async (exaggeration: number, prompt: string) => {
        // In a real app, this might debounce and update the preview
        // For now, mockAI.updateFacial just returns the image, so we don't need to await it for the UI to feel responsive
        // But let's simulate a quick update
        const newImage = await updateFacial(currentImage, exaggeration, prompt);
        setCurrentImage(newImage);
    };

    const handleBodyNext = async (exaggeration: number, prompt: string) => {
        setStep(4);
    };

    const handleBodyUpdate = async (exaggeration: number, prompt: string) => {
        const newImage = await updateBody(currentImage, exaggeration, prompt);
        setCurrentImage(newImage);
    };

    const handleReset = () => {
        setStep(1);
        setCurrentImage('');
        setSelectedStyle(null);
    };

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="border-b p-4 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                        C
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">Caricagen AI</h1>
                </div>
                <div className="flex gap-2 text-sm font-medium text-muted-foreground">
                    <span className={step >= 1 ? "text-primary" : ""}>1. Estilo</span>
                    <span>/</span>
                    <span className={step >= 2 ? "text-primary" : ""}>2. Face</span>
                    <span>/</span>
                    <span className={step >= 3 ? "text-primary" : ""}>3. Corpo</span>
                    <span>/</span>
                    <span className={step >= 4 ? "text-primary" : ""}>4. Download</span>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col relative">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-lg font-medium animate-pulse">Gerando sua arte...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 flex flex-col"
                        >
                            {step === 1 && <StyleSelection onNext={handleStyleSelect} />}
                            {step === 2 && (
                                <FacialControls
                                    image={currentImage}
                                    onNext={handleFacialNext}
                                    onUpdate={handleFacialUpdate}
                                />
                            )}
                            {step === 3 && (
                                <BodyControls
                                    image={currentImage}
                                    onNext={handleBodyNext}
                                    onUpdate={handleBodyUpdate}
                                />
                            )}
                            {step === 4 && (
                                <DownloadSection
                                    image={currentImage}
                                    onReset={handleReset}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </main>
    );
}
