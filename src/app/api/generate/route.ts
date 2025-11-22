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
        const imageUrl = await uploadToCatbox(imageBuffer);
        console.log("Image uploaded:", imageUrl);

        // Create style-specific prompt
        let stylePrompt = "";
        let model = "turbo"; // Default model

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "transform into 2d cartoon style, animated character, vibrant colors, bold outlines, cel shading, preserve facial features and identity";
                model = "turbo";
                break;
            case "Cartoon 3D":
                stylePrompt = "transform into 3d pixar disney style, cgi character, smooth render, cute, maintain face identity and features";
                model = "turbo";
                break;
            case "Caricatura 2D":
                stylePrompt = "transform into caricature drawing, exaggerated facial features, big head, funny proportions, comic art, keep face recognizable";
                model = "turbo";
                break;
            case "Caricatura Realista":
                stylePrompt = "transform into realistic caricature, exaggerated proportions, detailed rendering, professional portrait, preserve identity";
                model = "turbo";
                break;
            default:
                stylePrompt = "transform into cartoon style, preserve face";
        }

        const fullPrompt = `${stylePrompt}${prompt ? ', ' + prompt : ''}`;
        const encodedPrompt = encodeURIComponent(fullPrompt);
        const seed = Math.floor(Math.random() * 1000000);

        // Use Pollinations with image parameter for img2img
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&model=${model}&nologo=true&enhance=false&image=${encodeURIComponent(imageUrl)}`;

        console.log("Calling Pollinations:", pollinationsUrl);

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
