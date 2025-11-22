'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Style } from '@/lib/mockAI';

interface StyleSelectionProps {
    onNext: (style: Style, files: File[]) => void;
}

const STYLES: { id: Style; label: string; color: string }[] = [
    { id: 'Cartoon 2D', label: 'Cartoon 2D', color: 'bg-blue-500' },
    { id: 'Cartoon 3D', label: 'Cartoon 3D', color: 'bg-purple-500' },
    { id: 'Caricatura 2D', label: 'Caricatura 2D', color: 'bg-orange-500' },
    { id: 'Caricatura Realista', label: 'Caricatura Realista', color: 'bg-green-500' },
];

export default function StyleSelection({ onNext }: StyleSelectionProps) {
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = (acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
    });

    const handleNext = () => {
        if (selectedStyle && files.length > 0) {
            onNext(selectedStyle, files);
        }
    };

    return (
        <div className="space-y-8 w-full max-w-4xl mx-auto p-6">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Escolha seu Estilo</h2>
                <p className="text-muted-foreground">Selecione o tipo de arte que deseja gerar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {STYLES.map((style) => (
                    <motion.div
                        key={style.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedStyle(style.id)}
                        className={cn(
                            "cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-[3/4] flex flex-col justify-end p-4",
                            selectedStyle === style.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-border",
                            style.color
                        )}
                    >
                        {/* Placeholder for preview image */}
                        <div className="absolute inset-0 opacity-20 bg-black" />

                        <div className="relative z-10 text-white font-bold text-lg">
                            {style.label}
                        </div>
                        {selectedStyle === style.id && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                <Check size={16} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            <div className="space-y-4">
                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-4 bg-muted rounded-full">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium">Arraste fotos aqui ou clique para enviar</p>
                        <p className="text-sm text-muted-foreground">Suporta envio múltiplo (JPG, PNG)</p>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {files.map((file, i) => (
                            <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border bg-muted">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!selectedStyle || files.length === 0}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                >
                    Gerar Arte Inicial
                </button>
            </div>
        </div>
    );
}
