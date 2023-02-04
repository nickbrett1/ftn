export default async function handler() {
  return new Response(JSON.stringify({ name: 'Hello World' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
