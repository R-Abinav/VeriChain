export interface AnalysisRequest{
    claim: string;
}

export interface AnalysisResponse{
    verdict: "TRUE" | "FALSE" | "UNCLEAR";
    confidence: number;
    analysis: string;
    sources: string[];
}

export interface FactCheckSubmit{
    claim: string;
    aiAnalysis: string;
    confidenceScore: number;
}