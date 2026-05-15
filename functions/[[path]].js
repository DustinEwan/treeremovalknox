export async function onRequest(context) {
  const { params, request } = context;
  const method = request.method;
  const path = params.path || '(no path param)';
  const url = request.url;
  
  // Debug: return the captured path
  return new Response(JSON.stringify({
    method: method,
    path: path,
    url: url,
    params: params
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
