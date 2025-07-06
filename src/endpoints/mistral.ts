import { Hono } from "hono";
import { ChatMistralAI } from "@langchain/mistralai";
import { z } from "zod";

// Define the schema using Zod
const RussianPrepositionSchema = z.object({
  sentence: z.string().describe("a Russian sentence"),
  word: z.string().describe("the preposition in the sentence"),
  question: z
    .string()
    .describe("question why the preposition requires prepositional case"),
  options: z
    .array(
      z.object({
        case: z.enum(["prepositional", "dative", "accusative", "genitive"]),
        label: z.string(),
      })
    )
    .length(4),
  correct: z.number().int().min(0).max(3),
  explanation: z.string().describe("short explanation in French"),
});
type RussianPreposition = z.infer<typeof RussianPrepositionSchema>;

export const mistralEndpoint = new Hono().post("/mistral", async (c) => {
  const { prompt } = await c.req.json();
  if (!prompt) return c.json({ error: "Prompt is required" }, 400);

  const MISTRAL_API_KEY = c.env.MISTRAL_API_KEY || "";

  // Initialize the model
  const llm = new ChatMistralAI({
    apiKey: MISTRAL_API_KEY,
    model: "mistral-small-2501",
    temperature: 2.0,
  });

  // Bind the schema to the model using withStructuredOutput
  const structuredLLM = llm.withStructuredOutput(RussianPrepositionSchema);

  // Define the system prompt
  const systemPrompt = `
You are a language tutor teaching Russian to French students. For any user input, generate a JSON object with the following structure:
{
  "sentence": "<a Russian sentence>",
  "word": "<the preposition in the sentence>",
  "question": "Pourquoi la préposition '<word>' demande-t-elle le prépositionnel ?",
  "options": [
    { "case": "prepositional", "label": "Règle grammaticale fixe" },
    { "case": "dative", "label": "Pour indiquer le destinataire" },
    { "case": "accusative", "label": "Pour indiquer l'objet" },
    { "case": "genitive", "label": "Pour exprimer la possession" }
  ],
  "correct": <index of the correct option>,
  "explanation": "<short explanation in French>"
}
The output must be valid JSON and match the structure above. Use a random Russian sentence and preposition for each input.`;

  try {
    // Invoke the model
    const result = await structuredLLM.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ]);

    // Return the structured result
    return c.json(result);
  } catch (err) {
    return c.json(
      {
        error: "Mistral API error",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});
