import { NextResponse } from "next/server";
import Replicate from "replicate";

export async function POST(request: Request) {
    console.log("=== API Generate Called ===");
    console.log("ENV Check:", {
        hasToken: !!process.env.REPLICATE_API_TOKEN,
        tokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 5)
    });

    if (!process.env.REPLICATE_API_TOKEN) {
        console.error("REPLICATE_API_TOKEN is not set");
        return NextResponse.json(
            { error: "REPLICATE_API_TOKEN not configured in Vercel Environment Variables" },
            { status: 500 }
        );
    }

    try {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        const { image, style, prompt } = await request.json();
        console.log("Request received:", { style, hasImage: !!image });

        // Map styles to specific prompts
        let stylePrompt = "";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "2d cartoon character, animated style, vibrant colors, simple shapes";
                break;
            case "Cartoon 3D":
                stylePrompt = "3d pixar character, disney style, cute, rendered";
                break;
            case "Caricatura 2D":
                stylePrompt = "caricature drawing, exaggerated features, funny, sketch style";
                break;
            case "Caricatura Realista":
                stylePrompt = "realistic caricature, detailed, exaggerated proportions";
                break;
            default:
                stylePrompt = "cartoon character";
        }

        const fullPrompt = `${stylePrompt}, ${prompt || "high quality"}`;

        console.log("Calling Replicate with prompt:", fullPrompt);

        // Using a simpler, more reliable model
        const output = await replicate.run(
            "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
            {
                input: {
                    prompt: fullPrompt,
                    input_image: image,
                    num_steps: 20,
                    style_strength_ratio: 20,
                    num_outputs: 1,
                }
            }
        );

        console.log("Replicate response:", output);

        return NextResponse.json({ output });
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
                hint: "Check Vercel Function Logs for more details"
            },
            { status: 500 }
        );
    }
}
