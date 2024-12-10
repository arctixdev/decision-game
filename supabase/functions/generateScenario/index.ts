import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { Database } from "../_shared/database.types.ts";
import { CoreMessage, GenerateObjectResult } from "npm:ai";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { generateObject } from "npm:ai";
import { z } from "npm:zod";
import { createAnthropic } from "npm:@ai-sdk/anthropic";

const SYSTEMPROMPT =
  "Create a brief current event scenario (2-3 sentences) for a country leadership game. The user is the leader of a country, that is going downhill. Then provide exactly 2 response options, each between 1-4 words (these should be SUPER short). The response options should present different approaches to handling the situation. The below scenarios are the previous scenarios, Generate the NEXT scenario based on the previous scenario";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";

const SUPABASE_URL = Deno.env.get("URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  console.log(Deno.env.get("URL"));
  // const { scenarioId } = await req.json();
  const scenarioId = 17;
  try {
    const supabase = createClient<Database>(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        },
      },
    );

    const [scenario, previousMessages] = await getScenario(
      supabase,
      scenarioId,
    );

    return new Response(
      JSON.stringify({
        data: scenario,
        previousMessages,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

async function generateScenario(
  messages: CoreMessage[],
): Promise<
  GenerateObjectResult<{
    situation: string;
    optionA: string;
    optionB: string;
  }>
> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Invalid config");
  }
  const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
  const object = await generateObject({
    model: anthropic(ANTHROPIC_MODEL),
    schema: z.object({
      situation: z.string(),
      optionA: z.string(),
      optionB: z.string(),
    }),
    messages: [
      {
        role: "system",
        content: SYSTEMPROMPT,
      },
      ...messages,
    ],
  });
  console.log(object);
  return object;
}

const clientScenario = (
  situation: string,
  optionRows: { leading_choice: string | null; id: number }[],
) => (
  {
    situation,
    optionA: { text: optionRows[0].leading_choice, id: optionRows[0].id },
    optionB: { text: optionRows[1].leading_choice, id: optionRows[1].id },
  }
);

async function getPreviousScenarios(
  supabase: SupabaseClient<Database>,
  startId: number,
) {
  const { data, error } = await supabase.rpc("get_linked_rows", {
    start_id: startId,
  });

  data?.reverse();

  if (error) {
    throw error;
  }
  const previousScenarios: CoreMessage[] = data.flatMap((d) => {
    const content = d.content as { text: string } | null;

    const assistantMsg: CoreMessage | { role: string; content: undefined } = {
      role: "assistant",
      content: content?.text,
    };

    const r = [{ role: "user", content: d.leading_choice }, assistantMsg]
      .filter((m) =>
        m.content != undefined || m.content != null
      ) as CoreMessage[];
    return r;
  });

  return previousScenarios;
}

async function getScenario(
  supabase: SupabaseClient<Database>,
  scenarioId: number,
) {
  const { data, error } = await supabase.from("cards").select("*").eq(
    "id",
    scenarioId,
  );

  if (error) {
    throw error;
  }

  if (data == null || data.length == 0) {
    throw new Error("Could not find that scenario");
  }

  const scenario = data[0];
  if (scenario.content != null) {
    const { data: optionRows } = await supabase.from("cards").select(
      "leading_choice, id",
    )
      .eq("parent", scenarioId);

    if (!optionRows) {
      throw new Error("No options found for the scenario");
    }
    return [
      clientScenario(
        (scenario.content as { text: string }).text as string,
        optionRows,
      ),
      null,
    ];
  }

  // If the scenario is NOT already generated
  // We genrate it now

  const previousScenarios = await getPreviousScenarios(
    supabase,
    scenarioId,
  );

  const genaration = (await generateScenario(previousScenarios)).object;

  await supabase.from("cards").update({
    content: { text: genaration.situation },
  }).eq("id", scenarioId);

  const { data: optionRows } = await supabase.from("cards").insert(
    [
      {
        parent: scenarioId,
        leading_choice: genaration.optionA,
      },
      {
        parent: scenarioId,
        leading_choice: genaration.optionB,
      },
    ],
  ).select();

  if (!optionRows) {
    throw new Error("Failed to insert options");
  }
  return [clientScenario(genaration.situation, optionRows), previousScenarios];
}
