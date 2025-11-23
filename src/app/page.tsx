'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StyleSelection from '@/components/steps/StyleSelection';
import FacialControls from '@/components/steps/FacialControls';
import BodyControls from '@/components/steps/BodyControls';
import DownloadSection from '@/components/steps/DownloadSection';
import { generateInitial, updateFacial, updateBody, Style } from '@/lib/ai';
import { Loader2 } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function Home() {
    const [step, setStep] = useState<Step>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [currentImage, setCurrentImage] = useState<string>('');
    const [originalImage, setOriginalImage] = useState<string>(''); // Store the original photo
    const [facialImage, setFacialImage] = useState<string>(''); // Store the facial caricature (step 2)
    const [bodyImage, setBodyImage] = useState<string>(''); // Store the body caricature (step 3)

    // State for generation params
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [selectedRatio, setSelectedRatio] = useState<string>("1:1");
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

    const handleStyleSelect = async (style: Style, files: File[], aspectRatio: string) => {
        setIsLoading(true);
        setSelectedStyle(style);
        setSelectedRatio(aspectRatio);
        try {
            // Calculate dimensions based on aspect ratio
            let width = 512;
            let height = 512;

            if (aspectRatio && aspectRatio !== "Original") {
                const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
                const targetRatio = wRatio / hRatio;

                if (targetRatio > 1) { // Landscape
                    height = 512;
                    width = Math.round(512 * targetRatio);
                } else if (targetRatio < 1) { // Portrait
                    width = 512;
                    height = Math.round(512 / targetRatio);
                }

                // Ensure multiples of 8
                width = Math.round(width / 8) * 8;
                height = Math.round(height / 8) * 8;
            }

            setImageDimensions({ width, height });

            const result = await generateInitial(style, files, aspectRatio);

            // Store the cropped original image for future updates
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Original = e.target?.result as string;
                // Import and use the crop function to ensure consistency
                const { cropImageToRatio } = await import('@/lib/ai');
                const croppedOriginal = await cropImageToRatio(base64Original, aspectRatio);
                setOriginalImage(croppedOriginal);
            };
            reader.readAsDataURL(files[0]);

            setCurrentImage(result.imageUrl);
            setStep(2);
        } catch (error: any) {
            console.error(error);
            const errorMessage = error?.message || "Erro desconhecido";
            alert(`Erro ao gerar imagem: ${errorMessage}\n\nVerifique os logs do Vercel para mais detalhes.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacialNext = async (exaggeration: number, prompt: string) => {
        // Save the facial image before moving to body step
        setFacialImage(currentImage);
        
        // If we already have a body image, show it, otherwise show facial
        if (bodyImage) {
            setCurrentImage(bodyImage);
        }
        
        setStep(3);
    };

    const handleFacialUpdate = async (exaggeration: number, prompt: string) => {
        // CRITICAL FIX: Always use the ORIGINAL image as the source, not the current cartoon.
        // This prevents the "degradation loop" where the image gets worse and worse.
        if (!originalImage) return;

        // Pass dimensions to maintain aspect ratio
        const newImage = await updateFacial(
            originalImage, 
            exaggeration, 
            prompt,
            imageDimensions?.width,
            imageDimensions?.height
        );
        setCurrentImage(newImage);
        setFacialImage(newImage); // Update facial image state
    };

    const handleBodyNext = async (exaggeration: number, prompt: string) => {
        setStep(4);
    };

    const handleBodyUpdate = async (exaggeration: number, prompt: string) => {
        // For body generation, use the FACIAL caricature (from step 2), not the body image
        // This ensures we always start from the good facial caricature
        const sourceImage = facialImage || currentImage;
        if (!sourceImage) return;

        // Pass dimensions to maintain aspect ratio
        const newImage = await updateBody(
            sourceImage, 
            exaggeration, 
            prompt,
            imageDimensions?.width,
            imageDimensions?.height
        );
        setCurrentImage(newImage);
        setBodyImage(newImage); // Save body image separately
    };

    const handleReset = () => {
        setStep(1);
        setCurrentImage('');
        setOriginalImage('');
        setFacialImage('');
        setBodyImage('');
        setSelectedStyle(null);
        setImageDimensions(null);
    };

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="border-b p-4 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                        C
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">Caricagen AI <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded ml-2">v1.1</span></h1>
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
                                    image={facialImage || currentImage}
                                    onNext={handleFacialNext}
                                    onUpdate={handleFacialUpdate}
                                    onBack={() => setStep(1)}
                                />
                            )}
                            {step === 3 && (
                                <BodyControls
                                    image={bodyImage || currentImage}
                                    onNext={handleBodyNext}
                                    onUpdate={handleBodyUpdate}
                                    onBack={() => {
                                        // When going back, restore facial image
                                        if (facialImage) {
                                            setCurrentImage(facialImage);
                                        }
                                        setStep(2);
                                    }}
                                />
                            )}
                            {step === 4 && (
                                <DownloadSection
                                    image={currentImage}
                                    onReset={handleReset}
                                    onBack={() => setStep(3)}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </main>
    );
}
