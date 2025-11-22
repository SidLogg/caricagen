import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Fal.ai) ===");
    console.log("ENV Check:", {
        hasToken: !!process.env.FAL_KEY,
        tokenPrefix: process.env.FAL_KEY?.substring(0, 10)
    });

    if (!process.env.FAL_KEY) {
        console.error("FAL_KEY is not set");
        return NextResponse.json(
            { error: "FAL_KEY not configured. Get a free key at https://fal.ai/dashboard/keys" },
            { status: 500 }
        );
    }

    try {
        fal.config({
            credentials: process.env.FAL_KEY
        });

        const { image, style, prompt, strength } = await request.json();
        console.log("Request received:", { style, hasImage: !!image, strength });

        // Upload the base64 image to Fal.ai storage first
        console.log("Uploading image to Fal.ai storage...");
        const imageUrl = await fal.storage.upload(image);
        console.log("Image uploaded to:", imageUrl);

        // Map styles to specific prompts
        let stylePrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2d cartoon character, animated style, vibrant colors, simple shapes, flat design, vector art";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar character, disney style, cute, rendered, cgi animation, toy story style";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature drawing, exaggerated features, funny, sketch style, hand drawn, comic style";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, detailed, exaggerated proportions, professional art, hyperrealistic";
                break;
            default:
                stylePrompt = "cartoon character";
        }

        const fullPrompt = `${stylePrompt}, ${prompt || "high quality, masterpiece"}`;

        // Strength: 0 = identical to input, 1 = completely new
        // We want high strength for caricature effect but still preserve identity
        const imageStrength = strength ? strength / 100 * 0.6 + 0.2 : 0.5; // Range: 0.2-0.8

        console.log("Calling Fal.ai with prompt:", fullPrompt);
        console.log("Image strength:", imageStrength);

        // Using Fal.ai's SDXL with image-to-image (completely free)
        const result: any = await fal.subscribe("fal-ai/fast-sdxl", {
            input: {
                prompt: fullPrompt,
                image_url: imageUrl,
                strength: imageStrength,
                num_inference_steps: 30,
                guidance_scale: 7.5,
                negative_prompt: "ugly, blurry, low quality, distorted, deformed, bad anatomy, photorealistic, photo",
            },
            logs: true,
        });

        console.log("Fal.ai response:", result);

        const outputUrl = result.images?.[0]?.url || result.image?.url;

        if (!outputUrl) {
            throw new Error("No image URL in response");
        }

        return NextResponse.json({ output: outputUrl });
    } catch (error: any) {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", {
            message: error?.message,
            body: error?.body,
            stack: error?.stack
        });

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Get a free Fal.ai key at https://fal.ai/dashboard/keys"
            },
            { status: 500 }
        );
    }
}
