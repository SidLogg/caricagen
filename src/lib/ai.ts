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

        // API returns { output: base64String }
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
    try {
        // Map exaggeration level (0-100) to strength (1.0-2.5)
        // Higher exaggeration = lower image guidance (more creative freedom)
        const strength = 1.0 + (exaggeration / 100) * 1.5;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: currentImage,
                style: "Caricatura 2D", // We can infer this or pass it through if needed
                prompt: `facial features, ${prompt}`,
                strength,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update facial features');
        }

        const data = await response.json();
        return Array.isArray(data.output) ? data.output[0] : data.output;
    } catch (error) {
        console.error("Facial update failed:", error);
        // Return current image if update fails
        return currentImage;
    }
}

export async function updateBody(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    try {
        const strength = 1.0 + (exaggeration / 100) * 1.5;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: currentImage,
                style: "Caricatura 2D",
                prompt: `full body, ${prompt}`,
                strength,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update body');
        }

        const data = await response.json();
        return Array.isArray(data.output) ? data.output[0] : data.output;
    } catch (error) {
        console.error("Body update failed:", error);
        return currentImage;
    }
}
