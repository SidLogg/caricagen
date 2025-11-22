import { NextResponse } from "next/server";

// Helper to upload image to Catbox
async function uploadToCatbox(buffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', '');
    formData.append('fileToUpload', new Blob([buffer as any]), 'image.png');

    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload image');
    }

    return (await response.text()).trim();
}

export async function POST(request: Request) {
    console.log("=== API Generate Called (Pollinations.ai Optimized) ===");

    try {
        const { image, style, prompt } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Prepare image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Upload to get public URL
        console.log("Uploading image...");
        const imageUrl = await uploadToCatbox(imageBuffer);

        // Optimized prompts for Pollinations.ai
        let stylePrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2D cartoon character, flat colors, bold black outlines, animated style, cel-shaded, vector art, vibrant palette, simple shapes";
                break;
            case "Cartoon 3D":
                stylePrompt = "3D Pixar Disney character, CGI render, smooth shading, cute proportions, Toy Story style, volumetric lighting, 3D model";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature illustration, exaggerated facial features, oversized head, funny cartoon, comic book art, hand-drawn, humorous portrait";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature painting, exaggerated features, detailed rendering, oil painting, professional portrait, hyperrealistic";
                break;
            default:
                stylePrompt = "cartoon character illustration";
        }

        // Build optimized final prompt
        let finalPrompt = stylePrompt;

        if (prompt && prompt.trim()) {
            // User prompt gets priority with quality keywords
            finalPrompt = `${stylePrompt}, ${prompt.trim()}, detailed, high quality, professional artwork`;
        } else {
            finalPrompt = `${stylePrompt}, masterpiece quality, professional art`;
        }

        const encodedPrompt = encodeURIComponent(finalPrompt);
        const seed = Math.floor(Math.random() * 1000000);

        // Use Pollinations with enhance=true for better quality
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&model=turbo&nologo=true&enhance=true&image=${encodeURIComponent(imageUrl)}`;

        console.log("Generating with prompt:", finalPrompt);

        const pollResponse = await fetch(pollinationsUrl);

        if (!pollResponse.ok) {
            throw new Error(`Pollinations error: ${pollResponse.statusText}`);
        }

        const arrayBuffer = await pollResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        console.log("Generation complete");

        return NextResponse.json({ output: base64Image });

    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Image generation failed. Please try with a different photo or style."
            },
            { status: 500 }
        );
    }
}
