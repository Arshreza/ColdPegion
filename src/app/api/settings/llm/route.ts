import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const llmConfigSchema = z.object({
  apiBaseUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().min(1, "API Key is required"),
  modelName: z.string().min(1, "Model name is required"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await db.llmConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json(null);
    }

    // Do NOT send the decrypted API key to the client for security, 
    // just send a boolean indicating if it exists.
    return NextResponse.json({
      id: config.id,
      apiBaseUrl: config.apiBaseUrl,
      modelName: config.modelName,
      isValid: config.isValid,
      hasKey: !!config.apiKey,
    });
  } catch (error) {
    console.error("Error fetching LLM config:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // If we are passing a mask string (like bullets), the user didn't change the key
    // We should ignore the masked key and only update URL/Model.
    let apiKeyToSave: string | undefined;
    
    // Check if the api key is the masked version "••••••••••••..."
    if (body.apiKey && !body.apiKey.startsWith("••••")) {
      apiKeyToSave = encrypt(body.apiKey);
    }
    
    // Overwrite the body key temporarily to pass schema validation if they didn't change it
    const validationBody = { ...body };
    if (!validationBody.apiKey) validationBody.apiKey = "placeholder";

    const { apiBaseUrl, modelName } = llmConfigSchema.parse(validationBody);

    const updateData: any = {
      apiBaseUrl,
      modelName,
      isValid: true, // we assume it's valid for now, future enhancement: test connection
    };

    if (apiKeyToSave) {
      updateData.apiKey = apiKeyToSave;
    }

    let config = await db.llmConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (config) {
      config = await db.llmConfig.update({
        where: { userId: session.user.id },
        data: updateData,
      });
    } else {
      if (!apiKeyToSave) {
         return NextResponse.json({ error: "API Key is required for new configurations" }, { status: 400 });
      }
      
      config = await db.llmConfig.create({
        data: {
          userId: session.user.id,
          apiBaseUrl,
          modelName,
          apiKey: apiKeyToSave,
          isValid: true,
        },
      });
    }

    return NextResponse.json({
      id: config.id,
      apiBaseUrl: config.apiBaseUrl,
      modelName: config.modelName,
      isValid: config.isValid,
      hasKey: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating LLM config:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
