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
    console.log("=== API Generate Called (Pollinations.ai + Turbo) ===");

    try {
        const { image, style, prompt, strength } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // 1. Prepare the image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 2. Get a description of the image (Crucial for identity)
        // We try a more reliable model or fallback gracefully
        let personDescription = "a person with distinct facial features";

        if (process.env.HUGGINGFACE_API_TOKEN) {
            try {
                const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
                // Try a lighter/different model if BLIP fails
                const description = await hf.imageToText({
                    data: new Blob([imageBuffer]),
                    model: "nlpconnect/vit-gpt2-image-captioning",
                });
                if (description.generated_text) {
                    personDescription = description.generated_text;
                    console.log("Image described as:", personDescription);
                }
            } catch (e) {
                console.warn("HF Description failed, using fallback prompt.", e);
                // Fallback: We don't have a description, so we rely heavily on the image URL
            }
        }

        // 3. Upload to Catbox for Pollinations
        let imageUrl = "";
        try {
            imageUrl = await uploadToCatbox(imageBuffer);
            console.log("Image uploaded to:", imageUrl);
        } catch (e) {
            console.error("Upload failed:", e);
            return NextResponse.json({ error: "Failed to upload image for processing" }, { status: 500 });
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
                stylePrompt = "realistic caricature, hyperrealistic, highly detailed, exaggerated proportions, oil painting style, professional art, 8k resolution";
                break;
            default:
                stylePrompt = "cartoon style, professional art";
        }

        // We construct a prompt that emphasizes the person's description AND the style
        const fullPrompt = `${stylePrompt}, ${personDescription}, ${prompt || ""}, preserve facial features, retain identity, strong resemblance to input image`;
        const encodedPrompt = encodeURIComponent(fullPrompt);

        // 5. Call Pollinations.ai
        // We revert to 'turbo' because 'kontext' crashed (500). 'turbo' is reliable for img2img.
        // We remove 'strength' as it might have caused the crash or be unsupported.
        // We keep 'enhance=false' to strictly follow our prompt (especially the description).

        const seed = Math.floor(Math.random() * 1000000);

        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&model=turbo&nologo=true&enhance=false&image=${encodeURIComponent(imageUrl)}`;

        console.log("Calling Pollinations:", pollinationsUrl);

        // Fetch the image from Pollinations
        const pollResponse = await fetch(pollinationsUrl);
        if (!pollResponse.ok) {
            // If turbo fails, try flux as a last resort fallback?
            // But let's just report the error for now.
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
