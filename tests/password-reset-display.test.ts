import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const render = (user: unknown) => execFileSync(process.execPath, ["-e", `
require('tsx/cjs');
require.extensions['.css'] = module => { module.exports = new Proxy({}, {get: (_, key) => key === '__esModule' ? false : String(key)}); };
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {AuthContext} = require('./context/AuthContext.tsx');
const PasswordReset = require('./components/account/PasswordReset.tsx').default;
process.stdout.write(renderToStaticMarkup(React.createElement(AuthContext.Provider, {value: {user: JSON.parse(process.argv[1]), loading: false}}, React.createElement(PasswordReset))));
`, JSON.stringify(user)], { encoding: "utf8", cwd: process.cwd() });

test("signed-out recovery asks only for an email address and offers a path back to login", () => {
  const html = render(null);
  for (const value of ["Reset your password.", "Email address", "Send reset link", 'href="/login"']) assert.ok(html.includes(value), value);
  assert.ok(!html.includes('type="password"'));
});

test("signed-in password recovery shows accessible matching password fields and explains Google remains separate", () => {
  const html = render({ id: "example-user", email: "alex@example.test", app_metadata: { provider: "google" } });
  for (const value of ["Choose a new password.", "New password", "Confirm new password", "Save new password", "your Google password stays the same", 'minLength="8"', 'maxLength="128"', 'autoComplete="new-password"', 'aria-label="Show password"']) assert.ok(html.includes(value), value);
  assert.equal((html.match(/type="password"/g) || []).length, 2);
  assert.ok(!html.includes('type="email"'));
});
