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
        const imageStrength = strength ? (2.5 - strength) / 2.5 : 0.4; // Convert to 0-1 range, inverted

        console.log("Calling Fal.ai with prompt:", fullPrompt);
        console.log("Image strength:", imageStrength);

        // Using Fal.ai's SDXL with image-to-image (completely free)
        const result: any = await fal.subscribe("fal-ai/fast-sdxl", {
            input: {
                prompt: fullPrompt,
                image_url: image,
                strength: imageStrength,
                num_inference_steps: 25,
                guidance_scale: 7.5,
                negative_prompt: "ugly, blurry, low quality, distorted, deformed, bad anatomy",
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
