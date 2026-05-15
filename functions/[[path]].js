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

  // === ROUTE: /twiml/record-complete (POST from Record verb when recording is done) ===
  if (path === 'twiml/record-complete' && request.method === 'POST') {
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
    console.log('Status:', recordingStatus);

    // Send SMS notification with recording link
    try {
      const sid = env.TWILIO_ACCOUNT_SID;
      const token = env.TWILIO_AUTH_TOKEN;
      const notifyNumber = env.NOTIFY_NUMBER;
      
      const auth = btoa(sid + ':' + token);
      const resp = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: notifyNumber,
          From: '+18654320729',
          Body: 'Voicemail from ' + from + ': ' + recordingUrl,
        }),
      });
      const smsData = await resp.json();
      console.log('SMS sent:', smsData.status || smsData.error?.message);
    } catch (e) {
      console.error('SMS send failed:', e.message);
    }

    // Return TwiML to tell caller recording is done
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

  // === ROUTE: /twiml/transcribe-callback (POST from Twilio when transcription is done) ===
  if (path === 'twiml/transcribe-callback' && request.method === 'POST') {
    const formData = await request.formData();
    const recordingSid = formData.get('RecordingSid');
    const transcriptionStatus = formData.get('TranscriptionStatus');
    const transcriptionText = formData.get('TranscriptionText') || '';
    const from = formData.get('From');

    console.log('=== TRANSCRIPTION CALLBACK ===');
    console.log('Status:', transcriptionStatus);
    console.log('From:', from);
    console.log('Text:', transcriptionText);

    // Send SMS with transcription text
    if (transcriptionStatus === 'completed' && transcriptionText) {
      try {
        const sid = env.TWILIO_ACCOUNT_SID;
        const token = env.TWILIO_AUTH_TOKEN;
        const notifyNumber = env.NOTIFY_NUMBER;
        
        const auth = btoa(sid + ':' + token);
        // Twilio SMS body limit is 1600 chars, truncate if needed
        const body = 'Voicemail from ' + from + ':\n\n' + transcriptionText.substring(0, 1550);
        const resp = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + auth,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: notifyNumber,
            From: '+18654320729',
            Body: body,
          }),
        });
        const smsData = await resp.json();
        console.log('Transcription SMS sent:', smsData.status || smsData.error?.message);
      } catch (e) {
        console.error('Transcription SMS failed:', e.message);
      }
    }

    // Empty response — Twilio just needs 200 OK
    return new Response('<Response></Response>', {
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
