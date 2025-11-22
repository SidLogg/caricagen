export type Style = 'Cartoon 2D' | 'Cartoon 3D' | 'Caricatura 2D' | 'Caricatura Realista';

export interface GenerationResult {
    imageUrl: string;
    style: Style;
}

const MOCK_IMAGES = {
    'Cartoon 2D': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'Cartoon 3D': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'Caricatura 2D': 'https://api.dicebear.com/7.x/big-smile/svg?seed=Felix',
    'Caricatura Realista': 'https://api.dicebear.com/7.x/micah/svg?seed=Felix',
};

export async function generateInitial(style: Style, files: File[]): Promise<GenerationResult> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                imageUrl: MOCK_IMAGES[style],
                style,
            });
        }, 2000); // Simulate 2s delay
    });
}

export async function updateFacial(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => {
            // In a real app, this would send the params to the backend.
            // Here we just return the same image or a slightly modified one if we had one.
            resolve(currentImage);
        }, 1000);
    });
}

export async function updateBody(currentImage: string, exaggeration: number, prompt: string): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(currentImage);
        }, 1000);
    });
}
