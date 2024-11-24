import { generateObject } from "ai";
import { z } from "zod";

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

console.time("generateText");
const { object } = await generateObject({
  model: anthropic("claude-3-haiku-20240307"),
  schema: z.object({
    situation: z.string(),
    choiceA: z.string(),
    choiceB: z.string(),
  }),
	messages: [
		{
			role: "system",
			content: "Create a brief current event scenario (2-3 sentences) for a country leadership game. The user is the leader of a country, that is going downhill. Then provide exactly 2 response options, each between 1-6 words. The response options should present different approaches to handling the situation.",
		}, 
		{
			role: "user",
			content: "The country is facing a severe drought, and the food supply is running low. The people are getting restless.",
		}
	]
});

// const { text } = await generateText({
// 	model: anthropic("claude-3-5-sonnet-20241022"),
// 	prompt: "Write a vegetarian lasagna recipe for 4 people.",
// });

console.timeEnd("generateText");
console.log(object);

const page = () => {
	return (
		<div>
			<p>Situation: {object.situation}</p>
			<p>Choice A: {object.choiceA}</p>
			<p>Choice B: {object.choiceB}</p>
		</div>
	);
};

export default page;
