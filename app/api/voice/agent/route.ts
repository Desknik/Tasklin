import { NextRequest, NextResponse } from 'next/server';
import { VoiceAgentRequest, VoiceAgentResponse, VoiceAgentCredentials } from '@/types/calendar';

export async function POST(request: NextRequest) {
  try {
    const body: VoiceAgentRequest = await request.json();
    
    if (!body.text || !body.text.trim()) {
      return NextResponse.json({
        status: 'error',
        type: 'unknown',
        message: 'Texto não fornecido'
      } as VoiceAgentResponse, { status: 400 });
    }

    // Get voice agent credentials from localStorage (sent in headers)
    const endpointUrl = request.headers.get('x-voice-endpoint');
    const authToken = request.headers.get('x-voice-token');

    if (!endpointUrl) {
      return NextResponse.json({
        status: 'error',
        type: 'unknown',
        message: 'Endpoint do Voice Agent não configurado. Vá para Configurações para configurar o assistente de voz.'
      } as VoiceAgentResponse, { status: 400 });
    }

    // Send request to n8n voice agent
    const agentRequest = {
      text: body.text.trim(),
      timestamp: body.timestamp,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(agentRequest),
    });

    if (!response.ok) {
      throw new Error(`Voice agent responded with status: ${response.status}`);
    }

    const agentResponse: VoiceAgentResponse = await response.json();
    
    // Validate response structure
    if (!agentResponse.status || !agentResponse.type || !agentResponse.message) {
      throw new Error('Invalid response structure from voice agent');
    }

    return NextResponse.json(agentResponse);

  } catch (error) {
    console.error('Voice agent error:', error);
    
    return NextResponse.json({
      status: 'error',
      type: 'unknown',
      message: error instanceof Error 
        ? `Erro ao conectar com o assistente de voz: ${error.message}`
        : 'Erro desconhecido ao processar comando de voz'
    } as VoiceAgentResponse, { status: 500 });
  }
}
