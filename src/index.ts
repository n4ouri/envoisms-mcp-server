#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY = process.env.ENVOISMS_API_KEY;
const BASE_URL = process.env.ENVOISMS_BASE_URL || 'https://api.envoisms.ma';

if (!API_KEY) {
  console.error('Error: ENVOISMS_API_KEY environment variable is required.');
  process.exit(1);
}

const server = new Server(
  {
    name: 'envoisms-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_sms',
        description: 'Send an SMS or WhatsApp notification to Morocco (+212) or international numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number (e.g. +212612345678)' },
            message: { type: 'string', description: 'Message content' },
            from: { type: 'string', description: 'Optional Sender ID (default MonApp)' },
            channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'sms' },
          },
          required: ['to', 'message'],
        },
      },
      {
        name: 'send_otp',
        description: 'Generate and send a managed OTP verification code.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number (e.g. +212612345678)' },
            brand: { type: 'string', description: 'Brand name displayed in the OTP message' },
            channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'sms' },
          },
          required: ['to'],
        },
      },
      {
        name: 'check_otp',
        description: 'Validate an OTP code against a pending verification session.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session ID returned from send_otp' },
            code: { type: 'string', description: 'The user-submitted verification code' },
          },
          required: ['session_id', 'code'],
        },
      },
      {
        name: 'get_balance',
        description: 'Check real-time account balance in MAD and EUR.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'send_sms': {
      const res = await fetch(`${BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'send_otp': {
      const res = await fetch(`${BASE_URL}/v1/verify/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'check_otp': {
      const res = await fetch(`${BASE_URL}/v1/verify/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'get_balance': {
      const res = await fetch(`${BASE_URL}/v1/billing/balance`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
