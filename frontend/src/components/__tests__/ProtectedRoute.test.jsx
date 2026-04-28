import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { vi } from 'vitest';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const renderRoute = () =>
  render(
    <MemoryRouter>
      <ProtectedRoute>
        <div>secure-content</div>
      </ProtectedRoute>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders secure content when auth state is valid', async () => {
    localStorage.setItem('token', 'token');
    useAuth.mockReturnValue({ isAuthenticated: true, loading: false, user: { id: 'u1' } });
    renderRoute();
    expect(await screen.findByText('secure-content')).toBeInTheDocument();
  });

  it('redirects when token exists but auth state is invalid', async () => {
    localStorage.setItem('token', 'stale-token');
    useAuth.mockReturnValue({ isAuthenticated: false, loading: false, user: null });
    renderRoute();
    expect(screen.queryByText('secure-content')).not.toBeInTheDocument();
  });
});
