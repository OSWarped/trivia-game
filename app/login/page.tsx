'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store token in cookie (HttpOnly flag should be set by backend)
        const { token, roles } = result;

        if (token) {
          // Store token in cookie using document.cookie
          document.cookie = `token=${token}; path=/; secure; HttpOnly`; // Secure and HttpOnly flags for better security

          // Perform redirect based on user roles
          if (roles.includes('ADMIN')) {
            router.push('/admin/dashboard');
          } else if (roles.includes('HOST')) {
            router.push('/dashboard/host');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setError(result.error || 'Login failed.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong.');
    }
  }

  return (
    <div className="form-container">
      <h1 className="form-heading">Login</h1>
      <form className="form" onSubmit={handleLogin}>
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="submit-button" type="submit">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
