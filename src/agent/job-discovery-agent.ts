/**
 * Job Discovery Agent
 * LangChain agent for conversational job discovery
 */

import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { config } from '../config/config.js';
import { createSearchJobsTool } from './tools/search-jobs.tool.js';
import { createGetJobDetailsTool } from './tools/get-job-details.tool.js';
import { SYSTEM_PROMPT, MESSAGE_MODIFIER } from './prompts/agent-prompts.js';

/**
 * Create the job discovery agent with tools
 * @param token - JWT token for backend API authentication
 */
export function createJobDiscoveryAgent(token: string) {
  // Initialize the LLM model
  const model = new ChatOpenAI({
    model: config.agentModel,
    temperature: config.agentTemperature,
    apiKey: config.openaiApiKey,
    maxTokens: 2000,
  });

  // Create tools with the JWT token
  const tools = [
    createSearchJobsTool(token),
    createGetJobDetailsTool(token),
  ];

  // Create the ReAct agent
  // System prompt is included in messageModifier
  // @ts-expect-error - TypeScript deep instantiation issue with tool types
  const agent = createReactAgent({
    llm: model,
    tools: tools,
    messageModifier: `${SYSTEM_PROMPT}\n\n${MESSAGE_MODIFIER}`,
  });

  return agent;
}

/**
 * Run the agent with a user message
 * @param agent - The agent instance
 * @param userMessage - User's natural language query
 * @param conversationHistory - Optional conversation history for context
 */
export async function runAgent(
  agent: ReturnType<typeof createJobDiscoveryAgent>,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  try {
    // Build messages array - createReactAgent accepts simple format
    const messages: Array<{ role: string; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Invoke the agent with increased recursion limit
    const result = await agent.invoke(
      {
        messages: messages,
      },
      {
        configurable: {
          recursionLimit: 50, // Increase from default 25 to handle complex queries
        },
      }
    );

    // Extract the final response
    const lastMessage = result.messages[result.messages.length - 1];
    const response =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return {
      response,
      messages: result.messages,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Agent execution failed: ${errorMessage}`);
  }
}
