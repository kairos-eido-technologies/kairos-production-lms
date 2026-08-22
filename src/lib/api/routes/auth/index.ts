import { loginRoute } from "./login";
import { registerRoute } from "./register";
import { logoutRoute } from "./logout";
import { sessionRoute } from "./session";
import { verifyEmailRoute, resendCodeRoute } from "./verify-email";
import { forgotPasswordRoute } from "./forgot-password";
import { resetPasswordRoute } from "./reset-password";

export const authApiRoutes: Record<
  string,
  Record<string, (request: Request) => Promise<Response>>
> = {
  "/api/auth/login": { POST: loginRoute },
  "/api/auth/register": { POST: registerRoute },
  "/api/auth/logout": { POST: logoutRoute },
  "/api/auth/session": { GET: sessionRoute },
  "/api/auth/verify-email": { POST: verifyEmailRoute },
  "/api/auth/resend-code": { POST: resendCodeRoute },
  "/api/auth/forgot-password": { POST: forgotPasswordRoute },
  "/api/auth/reset-password": { POST: resetPasswordRoute },
};
