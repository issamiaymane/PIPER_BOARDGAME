export interface LLMResponse {
  coach_line: string;
  choice_presentation: string;
  detected_signals: string[];
  tone_used: string;
}

export class LLMClient {

  async generateResponse(
    systemPrompt: string,
    _context: any
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key handled by proxy
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Generate your response following the system prompt instructions.'
          }
        ]
      })
    });

    const data = await response.json();

    // Extract JSON from response
    const text = data.content.find((c: any) => c.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON');
    }

    return JSON.parse(jsonMatch[0]);
  }
}
