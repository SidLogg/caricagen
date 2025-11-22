import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export async function POST(request: Request) {
    console.log("=== API Generate Called (Hugging Face Hybrid Approach) ===");

    if (!process.env.HUGGINGFACE_API_TOKEN) {
        return NextResponse.json(
            { error: "HUGGINGFACE_API_TOKEN not configured in .env.local" },
            { status: 500 }
        );
    }

    try {
        const { image, style, prompt } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

        // Prepare the image
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageBlob = new Blob([imageBuffer]);

        // STEP 1: Get DETAILED description of the person
        let personDescription = "a person";
        try {
            const description = await hf.imageToText({
                data: imageBlob,
                model: "Salesforce/blip-image-captioning-base",
            });
            personDescription = description.generated_text || "a person";
            console.log("Detailed description:", personDescription);
        } catch (e) {
            console.warn("Description failed, using generic");
        }

        // STEP 2: Enhance description with facial details
        // We create a very detailed prompt that captures the person's identity
        const identityPrompt = `portrait of ${personDescription}, detailed facial features, accurate likeness, recognizable face`;

        // Map styles to artistic prompts
        let stylePrompt = "";
        let negativePrompt = "ugly, blurry, low quality, distorted, deformed, bad anatomy, multiple people, crowd";

        switch (style) {
            case "Cartoon 2D":
                stylePrompt = "in 2d cartoon style, animated character, vibrant colors, simple shapes, flat design, vector art, bold outlines, cel shading";
                negativePrompt += ", realistic, photo, photograph, 3d";
                break;
            case "Cartoon 3D":
                stylePrompt = "in 3d pixar style, disney character design, cgi animation, rendered, smooth surfaces, cute, toy story aesthetic";
                negativePrompt += ", realistic, photo, photograph, 2d, flat";
                break;
            case "Caricatura 2D":
                stylePrompt = "as caricature drawing, exaggerated facial features, funny proportions, big expressive head, comic art style, hand drawn, sketch";
                negativePrompt += ", realistic, photo, photograph, normal proportions";
                break;
            case "Caricatura Realista":
                stylePrompt = "as realistic caricature, detailed rendering, exaggerated proportions, professional portrait art, hyperrealistic style, oil painting quality";
                negativePrompt += ", photo, photograph, normal proportions";
                break;
            default:
                stylePrompt = "as cartoon character, animated style";
        }

        // STEP 3: Combine everything into a powerful prompt
        const fullPrompt = `${identityPrompt} ${stylePrompt}, ${prompt || ""}, high quality, masterpiece, professional art, single person, clear face`;

        console.log("Final generation prompt:", fullPrompt);

        // STEP 4: Generate with text-to-image (which IS supported)
        const result = await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: fullPrompt,
            parameters: {
                negative_prompt: negativePrompt,
                num_inference_steps: 35,
                guidance_scale: 8.0,
                width: 1024,
                height: 1024,
            }
        });

        // Convert blob to base64
        const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

        console.log("Generation complete");

        return NextResponse.json({ output: base64Image });

    } catch (error: any) {
        console.error("Generation Error:", error);

        return NextResponse.json(
            {
                error: "Failed to generate image",
                details: error?.message || "Unknown error",
                hint: "Ensure HUGGINGFACE_API_TOKEN is valid. The API generates based on a detailed description of your photo."
            },
            { status: 500 }
        );
    }
}
