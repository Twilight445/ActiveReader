import { handleUpload } from '@vercel/blob/client';

export const config = {
  runtime: 'nodejs', // switched to nodejs to fix compatibility issues
};

export default async function handler(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        // We only allow PDFs
        return {
          allowedContentTypes: ['application/pdf'],
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload finished:', blob.url);
      },
    });

    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}