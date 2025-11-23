'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Style } from '@/lib/ai';

interface StyleSelectionProps {
    onNext: (style: Style, files: File[], aspectRatio: string) => void;
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
    const [aspectRatio, setAspectRatio] = useState<string>("1:1");

    const ASPECT_RATIOS = [
        { id: "1:1", label: "Quadrado (1:1)", icon: "square" },
        { id: "9:16", label: "Story (9:16)", icon: "smartphone" },
        { id: "16:9", label: "Paisagem (16:9)", icon: "monitor" },
        { id: "3:4", label: "Retrato (3:4)", icon: "portrait" },
        { id: "4:3", label: "Clássico (4:3)", icon: "image" },
    ];

    const onDrop = (acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
    });

    const handleNext = () => {
        if (selectedStyle && files.length > 0) {
            // Pass aspect ratio to parent/next step
            // Note: We need to update the interface in the parent component too, 
            // but for now we pass it as an additional argument if supported, 
            // or we handle it in the AI lib.
            // Let's assume onNext signature will be updated.
            // @ts-ignore
            onNext(selectedStyle, files, aspectRatio);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
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
                            "cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-[3/4] flex flex-col justify-end",
                            selectedStyle === style.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-border"
                        )}
                    >
                        <img
                            src={`/examples/${style.id.toLowerCase().replace(' ', '-')}.png`}
                            alt={style.label}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="relative z-10 text-white font-bold text-lg p-4">
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
                <h3 className="text-xl font-bold">Proporção da Arte</h3>
                <div className="flex flex-wrap gap-3">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg border font-medium transition-all flex items-center gap-2",
                                aspectRatio === ratio.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted"
                            )}
                        >
                            {ratio.label}
                        </button>
                    ))}
                </div>
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
                            <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border bg-muted group">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="preview"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={() => removeFile(i)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                    aria-label="Remover foto"
                                >
                                    <X size={14} />
                                </button>
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
