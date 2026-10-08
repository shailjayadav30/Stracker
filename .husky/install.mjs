// Installs git hooks on `npm install`. Skipped in production and CI,
// where husky (a devDependency) is not installed.
if (process.env.NODE_ENV === "production" || process.env.CI === "true") {
  process.exit(0);
}

try {
  const husky = (await import("husky")).default;
  console.log(husky());
} catch {
  // husky not installed (e.g. `npm ci --omit=dev`) — nothing to do
}
