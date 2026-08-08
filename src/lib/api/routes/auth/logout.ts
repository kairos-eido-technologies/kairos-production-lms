export async function logoutRoute(request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
      },
    }
  );
}
