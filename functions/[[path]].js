export async function onRequest(context) {
  const { params, request, env } = context;
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  // === ROUTE: /twiml/voicemail.xml ===
  if (pathSegments.length > 0 && pathSegments[0] === 'twiml' && (pathSegments[1] === 'voicemail.xml' || pathSegments[1] === '' || pathSegments.length === 1)) {
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
  if (path === 'twiml/record-complete' && request.method === 'POST') {
    const formData = await request.formData();
    const recordingSid = formData.get('RecordingSid');
    const recordingUrl = formData.get('RecordingUrl');
    const recordingStatus = formData.get('RecordingStatus');
    const callSid = formData.get('CallSid');
    const from = formData.get('From');
    
    console.log('=== RECORDING COMPLETE ===');
    console.log('Call SID:', callSid);
    console.log('From:', from);
    console.log('Recording SID:', recordingSid);
    console.log('Recording URL:', recordingUrl);
    console.log('Status:', recordingStatus);

    // Send SMS notification with recording link
    try {
      const twilioClient = context.Twilio;
      const accountSid = context.env.TWILIO_ACCOUNT_SID;
      const authToken = context.env.TWILIO_AUTH_TOKEN;
      twilioClient.init(accountSid, authToken);
      
      await twilioClient.messages.create({
        body: `Voicemail: ${from} left a message. Listen: ${recordingUrl}`,
        to: '+18654320729',
        from: '+18654320729'
      });
      console.log('SMS sent successfully');
    } catch (e) {
      console.error('SMS send failed:', e.message);
    }

    // Store recording info (in real prod, store in S3/DynamoDB)
    const record = { recordingSid, recordingUrl, callSid, from, recordingStatus, timestamp: new Date().toISOString() };
    console.log('Recording record:', JSON.stringify(record));

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

  // === ROUTE: /twiml/transcribe-callback (POST from Record transcribe) ===
  if (path === 'twiml/transcribe-callback' && request.method === 'POST') {
    const formData = await request.formData();
    const recordingSid = formData.get('RecordingSid');
    const transcriptionId = formData.get('TranscriptionSid');
    const transcriptionStatus = formData.get('TranscriptionStatus');
    const transcriptionText = formData.get('TranscriptionText') || '';
    const from = formData.get('From');

    console.log('=== TRANSCRIPTION CALLBACK ===');
    console.log('Recording SID:', recordingSid);
    console.log('Transcription Status:', transcriptionStatus);
    console.log('Text:', transcriptionText);
    console.log('From:', from);

    // Send SMS with transcription text
    if (transcriptionStatus === 'completed' && transcriptionText) {
      try {
        const twilioClient = context.Twilio;
        const accountSid = context.env.TWILIO_ACCOUNT_SID;
        const authToken = context.env.TWILIO_AUTH_TOKEN;
        twilioClient.init(accountSid, authToken);
        
        const preview = transcriptionText.substring(0, 500) + (transcriptionText.length > 500 ? '...' : '');
        await twilioClient.messages.create({
          body: `Voicemail from ${from}:\n\n${preview}`,
          to: '+18654320729',
          from: '+18654320729'
        });
        console.log('Transcription SMS sent');
      } catch (e) {
        console.error('Transcription SMS failed:', e.message);
      }
    }

    const twiml = `<Response></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  // === ROUTE: /twiml/provider.xml (forwarding to human) ===
  if (pathSegments.length > 0 && pathSegments[0] === 'twiml' && pathSegments[1] === 'provider.xml') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Generative" language="en-US">Incoming call from Tree Removal Knoxville.</Say>
  <Dial>
    <Number>+18654320729</Number>
  </Dial>
  <Redirect>/twiml/voicemail.xml</Redirect>
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  return new Response('Not Found', { status: 404 });
}
