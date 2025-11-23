import { NextResponse } from "next/server";

export const runtime = 'edge'; // Use Edge Runtime for better performance with Cloudflare

async function runCloudflareAI(model: string, input: any) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
        throw new Error("Missing Cloudflare credentials");
    }

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
            headers: { Authorization: `Bearer ${apiToken}` },
            method: "POST",
            body: JSON.stringify(input),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare API Error: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function POST(request: Request) {
    console.log("=== API Generate Called (Cloudflare Workers AI) ===");

    try {
        const { image, style, prompt, exaggeration, width, height } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Prepare prompts based on style
        let stylePrompt = "";
        let negativePrompt = "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, different face, different person, mutated";

        // CRITICAL: Keep strength LOW to preserve identity. 
        let strength = 0.45;

        // Adjust prompt based on exaggeration slider (0-100)
        let exaggerationPrompt = "";
        const exValue = exaggeration ? Number(exaggeration) : 50; // Default 50

        if (exValue < 30) {
            exaggerationPrompt = "subtle, slight caricature, realistic proportions";
            strength = 0.40; // Very close to original
        } else if (exValue < 70) {
            exaggerationPrompt = "moderately exaggerated features, funny, expressive";
            strength = 0.45; // Balanced
        } else {
            exaggerationPrompt = "highly exaggerated, big head, huge nose, distorted features, extreme caricature, comical";
            strength = 0.50; // Allow a bit more freedom for extreme exaggeration
        }

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = `2D cartoon character, flat colors, bold black outlines, cel-shaded, vector art style, vibrant, (preserve facial features:1.5), recognizable identity, ${exaggerationPrompt}`;
                negativePrompt += ", 3d, realistic, photo, shading, gradient";
                break;
            case "Cartoon 3D":
                stylePrompt = `3D Pixar Disney style character, cute, volumetric lighting, 3d render, cgi, smooth, highly detailed, (preserve identity:1.5), (same face:1.4), ${exaggerationPrompt}`;
                negativePrompt += ", 2d, flat, sketch, drawing";
                break;
            case "Caricatura 2D":
                stylePrompt = `funny caricature drawing, cartoon style, hand drawn, illustration, (preserve likeness:1.5), ${exaggerationPrompt}`;
                break;
            case "Caricatura Realista":
                stylePrompt = `realistic caricature, hyperrealistic, highly detailed, oil painting style, professional art, (preserve identity:1.6), (same person:1.5), ${exaggerationPrompt}`;
                strength = 0.40; // Realism needs strict adherence to photo
                break;
            default:
                stylePrompt = "cartoon character, preserve identity";
        }

        // Combine prompts
        const userPromptLower = prompt ? prompt.toLowerCase() : "";

        // Check for black and white request
        const isBlackAndWhite = userPromptLower.includes("preto e branco") ||
            userPromptLower.includes("black and white") ||
            userPromptLower.includes("monochrome") ||
            userPromptLower.includes("grayscale") ||
            userPromptLower.includes("escala de cinza");

        if (isBlackAndWhite) {
            // Remove conflicting style keywords
            stylePrompt = stylePrompt.replace(/vibrant, /g, "")
                .replace(/flat colors, /g, "")
                .replace(/colorful, /g, "")
                .replace(/colored, /g, "");

            stylePrompt += ", monochrome, black and white, grayscale, line art, ink drawing, no colors";
            negativePrompt += ", (color:1.6), (vibrant:1.5), (blue:1.2), (red:1.2), (green:1.2)";

            // DO NOT INCREASE STRENGTH. We rely on the input image being grayscale.
        }

        const finalPrompt = prompt && prompt.trim()
            ? `(${prompt.trim()}:1.5), ${stylePrompt}`
            : `${stylePrompt}, masterpiece, best quality`;

        console.log(`Generating with Style: ${style}, Strength: ${strength}`);
        console.log(`Final Prompt: ${finalPrompt}`);

        // Convert Base64 image to Array of Integers
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageArray = Array.from(new Uint8Array(imageBuffer));

        // Use Stable Diffusion v1.5 Inpainting/Img2Img model
        const model = "@cf/runwayml/stable-diffusion-v1-5-img2img";

        const input: any = {
            prompt: finalPrompt,
            image: imageArray, // Pass the image bytes
            strength: strength, // 0.0 to 1.0 (higher = more AI, less original)
            guidance: 7.5,
            negative_prompt: negativePrompt
        };

        // If dimensions are provided, pass them to the model to enforce output size
        if (width && height) {
            input.width = width;
            input.height = height;
        }

        const outputBuffer = await runCloudflareAI(model, input);
        const outputBase64 = `data:image/png;base64,${outputBuffer.toString('base64')}`;

        console.log("Generation complete");

        return NextResponse.json({ output: outputBase64 });

    } catch (error: any) {
        console.error("Generation Error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Check Cloudflare credentials or try a different image."
            },
            { status: 500 }
        );
    }
}
