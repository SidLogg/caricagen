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

export async function generateInitial(style: Style, files: File[]): Promise<GenerationResult> {
    try {
        // Convert first file to base64
        const imageBase64 = await fileToBase64(files[0]);

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageBase64,
                style,
                prompt: "best quality, masterpiece",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate image');
        }

        const data = await response.json();

        // Replicate returns an array of outputs usually, or a single string
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

        return {
            imageUrl: outputUrl,
            style,
        };
    } catch (error) {
        console.error("Generation failed:", error);
        throw error;
    }
}

export async function updateFacial(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    // For now, we'll just return the current image as re-generation is expensive/complex
    // In a full implementation, this would call the API again with img2img
    return currentImage;
}

export async function updateBody(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    return currentImage;
}
