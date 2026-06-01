# Use Better Auth for authentication

BFitLog will use Better Auth for username/password-style session authentication, mounted on the Hono API under `/api/auth/*`, with the Better Auth Expo plugin on the universal Expo client. This avoids hand-rolling password/session handling while still supporting the self-hosted Hono backend and Expo Android/Web clients; implementation must verify whether Better Auth cleanly supports username login or whether BFitLog needs an email-like internal identifier.
