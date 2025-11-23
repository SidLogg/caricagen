export type Style = 'Cartoon 2D' | 'Cartoon 3D' | 'Caricatura 2D' | 'Caricatura Realista';

export interface GenerationResult {
    imageUrl: string;
    style: Style;
}

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// Helper to convert image to Grayscale using Canvas
const convertToGrayscale = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Image); // Fallback
                return;
            }
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Image); // Fallback
        img.src = base64Image;
    });
};

// Helper to crop image to specific aspect ratio (exported for use in components)
// Always outputs 512x512 with the content cropped to the target aspect ratio
export const cropImageToRatio = (base64Image: string, ratioStr: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("No Context");

                const [wRatio, hRatio] = ratioStr.split(':').map(Number);
                if (!wRatio || !hRatio) throw new Error("Invalid Ratio");

                const targetRatio = wRatio / hRatio;
                const imgRatio = img.width / img.height;

                let sourceX = 0;
                let sourceY = 0;
                let sourceWidth = img.width;
                let sourceHeight = img.height;

                // Center Crop Logic - crop the source image to match target ratio
                if (imgRatio > targetRatio) {
                    // Image is wider than target -> Crop width
                    sourceWidth = img.height * targetRatio;
                    sourceHeight = img.height;
                    sourceX = (img.width - sourceWidth) / 2;
                    sourceY = 0;
                } else {
                    // Image is taller than target -> Crop height
                    sourceWidth = img.width;
                    sourceHeight = img.width / targetRatio;
                    sourceX = 0;
                    sourceY = (img.height - sourceHeight) / 2;
                }

                // Always output 512x512 for Cloudflare compatibility
                canvas.width = 512;
                canvas.height = 512;

                // Fill with white background first
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, 512, 512);

                // Calculate how to fit the cropped content into 512x512
                let destX = 0;
                let destY = 0;
                let destWidth = 512;
                let destHeight = 512;

                if (targetRatio > 1) {
                    // Landscape - fit width, center vertically
                    destHeight = 512 / targetRatio;
                    destY = (512 - destHeight) / 2;
                } else if (targetRatio < 1) {
                    // Portrait - fit height, center horizontally
                    destWidth = 512 * targetRatio;
                    destX = (512 - destWidth) / 2;
                }

                // Draw the cropped image
                ctx.drawImage(
                    img,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    destX, destY, destWidth, destHeight
                );

                const result = canvas.toDataURL('image/png');
                console.log(`[Crop] Success: 512x512 with ${ratioStr} content`);
                resolve(result);

            } catch (e) {
                console.error("[Crop] Error:", e);
                resolve(base64Image); // Return original on error
            }
        };
        img.onerror = () => {
            console.error("[Crop] Failed to load image");
            resolve(base64Image);
        };
        img.src = base64Image;
    });
};

export async function generateInitial(style: Style, files: File[], aspectRatio: string = "1:1"): Promise<GenerationResult> {
    try {
        console.log("[AI] Starting generation. Ratio:", aspectRatio);

        // Convert first file to base64
        let imageBase64 = await fileToBase64(files[0]);

        // Crop to aspect ratio if needed
        // The cropped image will be sent to the model, which will generate 512x512
        // but the content will respect the aspect ratio
        if (aspectRatio && aspectRatio !== "Original") {
            console.log("[AI] Cropping to aspect ratio:", aspectRatio);
            imageBase64 = await cropImageToRatio(imageBase64, aspectRatio);
        }

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageBase64,
                style,
                prompt: "best quality, masterpiece",
                // Not sending width/height - Cloudflare model doesn't support custom dimensions
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate image');
        }

        const data = await response.json();
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

        return {
            imageUrl: outputUrl,
            style,
        };
    } catch (error) {
        console.error("[AI] Generation failed:", error);
        throw error;
    }
}

export async function updateFacial(
    currentImage: string, 
    exaggeration: number, 
    prompt: string,
    width?: number,
    height?: number
): Promise<string> {
    try {
        let imageToSend = currentImage;
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes("preto e branco") ||
            promptLower.includes("black and white") ||
            promptLower.includes("monochrome") ||
            promptLower.includes("grayscale")) {
            imageToSend = await convertToGrayscale(currentImage);
        }

        // Build facial prompt - if user provides prompt, use it directly
        const facialPrompt = prompt && prompt.trim() 
            ? prompt.trim() 
            : "expressive facial features, detailed face";

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageToSend,
                style: "Caricatura 2D",
                prompt: facialPrompt,
                exaggeration: exaggeration
                // Not sending width/height - model doesn't support it
            }),
        });

        if (!response.ok) throw new Error('Failed to update facial features');
        const data = await response.json();
        return Array.isArray(data.output) ? data.output[0] : data.output;
    } catch (error) {
        console.error("Facial update failed:", error);
        return currentImage;
    }
}

export async function updateBody(
    currentImage: string, 
    exaggeration: number, 
    prompt: string,
    width?: number,
    height?: number
): Promise<string> {
    try {
        // IMPORTANTE: A geração de corpo a partir de busto não funciona bem com o modelo Cloudflare
        // O modelo img2img só consegue TRANSFORMAR o que existe, não ADICIONAR conteúdo novo
        // Para adicionar corpo, seria necessário:
        // 1. Usar a foto ORIGINAL completa (não o busto)
        // 2. Ou usar modelos mais avançados (DALL-E 3, Midjourney, SD-XL com ControlNet)
        
        // Por enquanto, vamos apenas aplicar transformações de estilo ao corpo existente
        let imageToSend = currentImage;
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes("preto e branco") ||
            promptLower.includes("black and white") ||
            promptLower.includes("monochrome") ||
            promptLower.includes("grayscale")) {
            imageToSend = await convertToGrayscale(currentImage);
        }

        // Build body prompt - if user provides prompt, use it directly
        const bodyPrompt = prompt && prompt.trim() 
            ? prompt.trim() 
            : "full body character, detailed clothing";

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageToSend,
                style: "Caricatura 2D",
                prompt: bodyPrompt,
                exaggeration: exaggeration,
                bodyMode: true
            }),
        });

        if (!response.ok) throw new Error('Failed to update body');
        const data = await response.json();
        return Array.isArray(data.output) ? data.output[0] : data.output;
    } catch (error) {
        console.error("Body update failed:", error);
        return currentImage;
    }
}
