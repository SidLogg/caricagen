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

// Helper to crop image to specific aspect ratio
const cropImageToRatio = (base64Image: string, ratioStr: string): Promise<string> => {
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

                let renderWidth = img.width;
                let renderHeight = img.height;
                let offsetX = 0;
                let offsetY = 0;

                // Center Crop Logic
                if (imgRatio > targetRatio) {
                    // Image is wider than target -> Crop width
                    renderWidth = img.height * targetRatio;
                    renderHeight = img.height;
                    offsetX = (img.width - renderWidth) / 2;
                    offsetY = 0;
                } else {
                    // Image is taller than target -> Crop height
                    renderWidth = img.width;
                    renderHeight = img.width / targetRatio;
                    offsetX = 0;
                    offsetY = (img.height - renderHeight) / 2;
                }

                // Output Dimensions (Fixed to SD friendly sizes)
                // We use a larger base to ensure quality
                const baseSize = 768;
                let finalWidth, finalHeight;

                if (targetRatio > 1) { // Landscape (e.g. 16:9)
                    finalHeight = 512;
                    finalWidth = Math.round(512 * targetRatio);
                } else if (targetRatio < 1) { // Portrait (e.g. 9:16)
                    finalWidth = 512;
                    finalHeight = Math.round(512 / targetRatio);
                } else { // Square
                    finalWidth = 512;
                    finalHeight = 512;
                }

                // Ensure multiples of 64
                finalWidth = Math.floor(finalWidth / 64) * 64;
                finalHeight = Math.floor(finalHeight / 64) * 64;

                canvas.width = finalWidth;
                canvas.height = finalHeight;

                // Draw
                ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight, 0, 0, finalWidth, finalHeight);

                const result = canvas.toDataURL('image/png');
                console.log(`[Crop] Success: ${finalWidth}x${finalHeight}`);
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
        if (aspectRatio && aspectRatio !== "Original") {
            console.log("[AI] Cropping...");
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
                // We do NOT send width/height to API anymore to avoid conflicts.
                // The image itself is already resized.
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

export async function updateFacial(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    try {
        let imageToSend = currentImage;
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes("preto e branco") ||
            promptLower.includes("black and white") ||
            promptLower.includes("monochrome") ||
            promptLower.includes("grayscale")) {
            imageToSend = await convertToGrayscale(currentImage);
        }

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageToSend,
                style: "Caricatura 2D",
                prompt: `facial features, ${prompt}`,
                exaggeration: exaggeration
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

export async function updateBody(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    try {
        let imageToSend = currentImage;
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes("preto e branco") ||
            promptLower.includes("black and white") ||
            promptLower.includes("monochrome") ||
            promptLower.includes("grayscale")) {
            imageToSend = await convertToGrayscale(currentImage);
        }

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageToSend,
                style: "Caricatura 2D",
                prompt: `full body, ${prompt}`,
                exaggeration: exaggeration
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
