import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hugging Face) ===");
    console.log("ENV Check:", {
        hasToken: !!process.env.HUGGINGFACE_API_TOKEN,
        tokenPrefix: process.env.HUGGINGFACE_API_TOKEN?.substring(0, 5)
    });

    if (!process.env.HUGGINGFACE_API_TOKEN) {
        console.error("HUGGINGFACE_API_TOKEN is not set");
        return NextResponse.json(
            { error: "HUGGINGFACE_API_TOKEN not configured. Get a free token at https://huggingface.co/settings/tokens" },
            { status: 500 }
        );
    }

    try {
        const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

        const { image, style, prompt } = await request.json();
        console.log("Request received:", { style, hasImage: !!image });

        // Map styles to specific prompts
        let stylePrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2d cartoon character, animated style, vibrant colors, simple shapes, flat design";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar character, disney style, cute, rendered, cgi animation";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature drawing, exaggerated features, funny, sketch style, hand drawn";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, detailed, exaggerated proportions, professional art";
                break;
            default:
                stylePrompt = "cartoon character";
        }

        const fullPrompt = `${stylePrompt}, ${prompt || "high quality, masterpiece"}`;

        console.log("Calling Hugging Face with prompt:", fullPrompt);

        // Using Stable Diffusion XL - completely free on Hugging Face
        const result = await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: fullPrompt,
            parameters: {
                negative_prompt: "ugly, blurry, low quality, distorted",
                num_inference_steps: 30,
            }
        });

        // Convert blob to base64
        const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        console.log("Hugging Face response received, image size:", buffer.length);

        return NextResponse.json({ output: base64Image });
    } catch (error: any) {
        console.error("=== AI Generation Error ===");
        console.error("Error details:", {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
            stack: error?.stack
        });

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Get a free Hugging Face token at https://huggingface.co/settings/tokens"
            },
            { status: 500 }
        );
    }
}
