export async function onRequest(context) {
  const { params } = context;
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');
  
  // Serve TwiML for /twiml/voicemail.xml
  if (pathSegments.length > 0 && pathSegments[0] === 'twiml' && (pathSegments[1] === 'voicemail.xml' || pathSegments[1] === '' || pathSegments.length === 1)) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.en-US-Neural2-A" language="en-US">
    Thank you for calling Tree Removal Knoxville. Nobody is available to answer your call right now, but if you leave your name, phone number, and a brief reason for your call, we'll get back to you as soon as possible. Thank you!
  </Say>
  <Record maxLength="120" playBeep="false" trim="do-not-trim" />
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
  if (path === 'twiml/recording-status') {
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
