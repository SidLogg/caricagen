import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

// Helper to upload image to Catbox (temporary host for AI processing)
async function uploadToCatbox(buffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', ''); // Anonymous
    formData.append('fileToUpload', new Blob([buffer as any]), 'image.png');

    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload image to temporary host');
    }

    const url = await response.text();
    return url.trim();
}

export async function POST(request: Request) {
    console.log("=== API Generate Called (Pollinations.ai + Kontext) ===");

    try {
        const { image, style, prompt, strength } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // 1. Prepare the image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 2. Get a description of the image (optional, improves prompt)
        let personDescription = "a person";
        if (process.env.HUGGINGFACE_API_TOKEN) {
            try {
                const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
                const description = await hf.imageToText({
                    data: new Blob([imageBuffer]),
                    model: "Salesforce/blip-image-captioning-large",
                });
                personDescription = description.generated_text || "a person";
                console.log("Image described as:", personDescription);
            } catch (e) {
                console.warn("HF Description failed, using default.", e);
            }
        }

        // 3. Upload to Catbox for Pollinations (since it needs a URL)
        let imageUrl = "";
        try {
            imageUrl = await uploadToCatbox(imageBuffer);
            console.log("Image uploaded to:", imageUrl);
        } catch (e) {
            console.error("Upload failed:", e);
        }

        // 4. Construct the Prompt
        let stylePrompt = "";
        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "flat 2d cartoon style, vibrant colors, simple shading, thick outlines, vector art, professional illustration";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar style, disney animation, cgi rendered, cute, smooth, volumetric lighting, high detail, 4k";
                break;
            case "Caricatura 2D":
                stylePrompt = "funny caricature, exaggerated features, big head, expressive, hand drawn sketch, humorous, artistic";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, hyperrealistic, highly detailed, exaggerated proportions, oil painting style, professional art";
                break;
            default:
                stylePrompt = "cartoon style, professional art";
        }

        const fullPrompt = `${stylePrompt}, ${personDescription}, ${prompt || ""}`;
        const encodedPrompt = encodeURIComponent(fullPrompt);

        // 5. Call Pollinations.ai
        // We use 'kontext' model as it is specifically documented for image-to-image (img2img) on Pollinations.
        // This should respect the input image much more than 'flux' or 'turbo'.

        const seed = Math.floor(Math.random() * 1000000);

        // Strength: 0.0 (original image) to 1.0 (complete noise/new image).
        // While undocumented for 'kontext', passing it might help if the backend supports it.
        // We default to 0.5 for a balance of style and identity.
        const imgStrength = strength ? strength / 100 : 0.5;

        // We append specific instructions to preserve identity
        const identityPrompt = "preserve facial features, retain identity, strong resemblance to input image";
        const finalPrompt = `${encodedPrompt}, ${identityPrompt}`;

        // Note: We pass 'model=kontext' for img2img.
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=1024&height=1024&seed=${seed}&model=kontext&nologo=true&enhance=false&image=${encodeURIComponent(imageUrl)}&strength=${imgStrength}`;

        console.log("Calling Pollinations:", pollinationsUrl);

        // Fetch the image from Pollinations
        const pollResponse = await fetch(pollinationsUrl);
        if (!pollResponse.ok) {
            throw new Error(`Pollinations API error: ${pollResponse.statusText}`);
        }

        const arrayBuffer = await pollResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        return NextResponse.json({ output: base64Image });

    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate image", details: error.message },
            { status: 500 }
        );
    }
}
