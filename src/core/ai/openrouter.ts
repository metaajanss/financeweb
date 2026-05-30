const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
}

export class OpenRouterClient {
    private apiKey: string;
    private siteUrl: string;
    private siteName: string;

    constructor(apiKey: string, siteUrl: string, siteName: string) {
        this.apiKey = apiKey;
        this.siteUrl = siteUrl;
        this.siteName = siteName;
    }

    async chatCompletion(request: ChatCompletionRequest) {
        const headers = {
            "Authorization": `Bearer ${this.apiKey}`,
            "HTTP-Referer": this.siteUrl,
            "X-Title": this.siteName,
            "Content-Type": "application/json",
        };

        try {
            const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
                method: "POST",
                headers,
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenRouter API Error: ${error.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("OpenRouter Request Failed:", error);
            throw error;
        }
    }

    async listModels() {
        const response = await fetch(`${OPENROUTER_API_URL}/models`, {
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
            }
        });
        return await response.json();
    }
}
