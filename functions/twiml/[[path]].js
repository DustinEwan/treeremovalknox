export async function onRequest(context) {
  const { params, request, env } = context;
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  const TWILIO_SID = env.TWILIO_ACCOUNT_SID || "";
  const TWILIO_TOKEN = env.TWILIO_AUTH_TOKEN || "";
  const NOTIFY_NUMBER = env.NOTIFY_NUMBER || "+1865806729";

  function authHeader() {
    return "Basic " + btoa(TWILIO_SID + ":" + TWILIO_TOKEN);
  }

  function sendSMS(to, body) {
    fetch("https://api.twilio.com/2010-04-01/Accounts/" + TWILIO_SID + "/Messages.json", {
      method: "POST",
      headers: {
        "Authorization": authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: "+18658060729",
        Body: body,
      }),
    }).then(r => r.json()).then(d => {
      console.log("SMS to " + to + ":", d.status || d.error?.message || d.sid);
    }).catch(e => console.error("SMS error:", e.message));
  }

  // === ROUTE: /twiml/voicemail.xml ===
  if (pathSegments.length > 0 && pathSegments[0] === 'voicemail.xml' || (pathSegments.length === 1 && pathSegments[0] === '')) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Generative" language="en-US">
    Thank you for calling Tree Removal Knoxville. Nobody is available to answer your call right now, but if you leave your name, phone number, and a brief reason for your call, we'll get back to you as soon as possible. Thank you!
  </Say>
  <Record action="/twiml/record-complete" method="POST" transcribe="true" transcribeCallback="/twiml/transcribe-callback" timeout="30" maxLength="120" playBeep="true" />
  <Say>Thank you, your message has been recorded. Goodbye.</Say>
  <Hangup />
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  }

  // === ROUTE: /twiml/record-complete (POST from Record verb) ===
  if (path === 'record-complete' && request.method === 'POST') {
    const formData = await request.formData();
    const recordingSid = formData.get('RecordingSid');
    const recordingUrl = formData.get('RecordingUrl');
    const recordingStatus = formData.get('RecordingStatus');
    const callSid = formData.get('CallSid');
    const from = formData.get('From');
    const duration = formData.get('RecordingDuration');

    console.log('=== RECORDING COMPLETE ===');
    console.log('Call SID:', callSid);
    console.log('From:', from);
    console.log('Recording SID:', recordingSid);
    console.log('Recording URL:', recordingUrl);
    console.log('Duration:', duration + 's');

    sendSMS(NOTIFY_NUMBER, "Voicemail from " + from + ": " + recordingUrl);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Generative" language="en-US">Thank you, your message has been recorded. Goodbye.</Say>
  <Hangup />
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // === ROUTE: /twiml/transcribe-callback (POST from Twilio) ===
  if (path === 'transcribe-callback' && request.method === 'POST') {
    const formData = await request.formData();
    const transcriptionStatus = formData.get('TranscriptionStatus');
    const transcriptionText = formData.get('TranscriptionText') || '';
    const from = formData.get('From');

    console.log('=== TRANSCRIPTION ===');
    console.log('Status:', transcriptionStatus);
    console.log('From:', from);
    console.log('Text:', transcriptionText);

    if (transcriptionStatus === 'completed' && transcriptionText) {
      const body = "Voicemail from " + from + ":\n\n" + transcriptionText.substring(0, 1550);
      sendSMS(NOTIFY_NUMBER, body);
    }

    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // === ROUTE: /twiml/provider.xml ===
  if (pathSegments.length > 0 && pathSegments[0] === 'provider.xml') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Generative" language="en-US">Incoming call from Tree Removal Knoxville.</Say>
  <Dial>
    <Number>+18658060729</Number>
  </Dial>
  <Redirect>/twiml/voicemail.xml</Redirect>
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // === ROUTE: /twiml/record-complete (GET - TwiML response) ===
  if (path === 'record-complete' && request.method === 'GET') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Generative" language="en-US">Thank you, your message has been recorded. Goodbye.</Say>
  <Hangup />
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // === ROUTE: /twiml/transcribe-callback (GET - TwiML response) ===
  if (path === 'transcribe-callback' && request.method === 'GET') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // No match - return 404
  return new Response('Not Found', { status: 404 });
}
