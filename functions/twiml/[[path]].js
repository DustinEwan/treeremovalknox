// Cloudflare Pages Function to serve TwiML
export async function onRequest(context) {
  const { request, params } = context;
  const path = params.path;
  
  // Serve voicemail.xml for /twiml/voicemail.xml or just /twiml/
  if (path === 'voicemail.xml' || path === '' || path === '/') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-us">
    Thank you for calling Tree Removal Knoxville. Nobody is available to answer your call right now, but if you leave your name, phone number, and a brief reason for your call, we'll get back to you as soon as possible. Thank you!
  </Say>
  <Hangup />
</Response>`;
    
    return new Response(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
  
  // Serve recording-status.xml for callbacks
  if (path === 'recording-status') {
    return new Response('<Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
  
  // Default: 404
  return new Response('Not Found', { status: 404 });
}
