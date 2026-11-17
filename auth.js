// This Express app uses Auth.js Core directly; the NextAuth wrapper requires a
// Next.js runtime, which this standalone Express server does not have.
const { Auth } = require("@auth/core");
const Google = require("@auth/core/providers/google").default;

const authSecret = (process.env.AUTH_SECRET || process.env.SECRET || "").trim();
const googleClientId = (process.env.AUTH_GOOGLE_ID || process.env.CLIENT_ID || "").trim();
const googleClientSecret = (process.env.AUTH_GOOGLE_SECRET || process.env.CLIENT_SECRET || "").trim();
const configured = Boolean(authSecret && googleClientId && googleClientSecret);

const config = {
  secret: authSecret,
  trustHost: true,
  basePath: "/api/auth",
  providers: configured
    ? [Google({ clientId: googleClientId, clientSecret: googleClientSecret })]
    : [],
  session: { strategy: "jwt" },
};

async function handle(request) {
  return Auth(request, config);
}

module.exports = {
  handle,
  config,
  configured,
};
