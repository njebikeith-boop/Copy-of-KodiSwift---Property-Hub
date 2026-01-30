import { GoogleGenAI, Type } from "@google/genai";

export const getAdvisoryInsights = async (propertyPerformanceData: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analyze the following per-property performance data: ${JSON.stringify(propertyPerformanceData)}. 
      1. Identify the 'Star Performer' and why.
      2. Identify the 'Underperformer' and provide a specific turnaround strategy.
      3. Provide 2 cross-portfolio optimization tips.
      Focus on the Kenyan real estate market dynamics (Nairobi, Kiambu, etc.).`,
      config: {
        systemInstruction: "You are a senior real estate analyst specialized in the East African property market. Provide individual property critiques and comparative strategy insights in a structured JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            propertyCritiques: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  propertyName: { type: Type.STRING },
                  status: { type: Type.STRING, description: "e.g., Optimal, At Risk, Underperforming" },
                  analysis: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                },
                required: ["propertyName", "status", "analysis", "recommendation"]
              }
            },
            portfolioStrategy: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                topTip: { type: Type.STRING }
              },
              required: ["summary", "topTip"]
            }
          },
          required: ["propertyCritiques", "portfolioStrategy"]
        }
      }
    });

    return JSON.parse(response.text || '{"propertyCritiques": [], "portfolioStrategy": {}}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { propertyCritiques: [], portfolioStrategy: {} };
  }
};