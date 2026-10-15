import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import StatusBadge from '../components/common/StatusBadge';
import KpiCard from '../components/common/KpiCard';
import { Package } from 'lucide-react';

describe('Retail Demand Intelligence Frontend', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders login page when unauthenticated without revealing credentials', () => {
    render(<App />);

    // Brand and subtitle
    expect(screen.getAllByText(/Retail Demand/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Intelligence/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Forecast smarter\./i)).toBeDefined();

    // Verify Sign In form elements are present
    expect(screen.getByPlaceholderText('name@company.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter your account password')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();

    // Verify credentials are NOT displayed on the login page
    expect(screen.queryByText('san@gmail.com')).toBeNull();
    expect(screen.queryByText('123456')).toBeNull();

    // Verify link to Create Account exists
    expect(screen.getByText(/Create Account/i)).toBeDefined();
  });

  it('renders application navigation when user is authenticated', () => {
    localStorage.setItem(
      'retail_auth_user',
      JSON.stringify({ email: 'san@gmail.com', name: 'San', role: 'Planner' })
    );

    render(<App />);

    // Key navigation links
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Datasets')).toBeDefined();
    expect(screen.getByText('Preprocessing')).toBeDefined();
    expect(screen.getByText('TFT Training')).toBeDefined();
    expect(screen.getByText('Demand Forecasting')).toBeDefined();
    expect(screen.getByText('Model Evaluation')).toBeDefined();
    expect(screen.getByText('Inventory Planning')).toBeDefined();
    expect(screen.getByText('Model Management')).toBeDefined();
    expect(screen.getByText('Reports & Export')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('renders StatusBadge with appropriate styles', () => {
    const { container: c1 } = render(<StatusBadge status="completed" />);
    expect(c1.textContent).toContain('completed');

    const { container: c2 } = render(<StatusBadge status="reorder_now" />);
    expect(c2.textContent).toContain('Reorder Now');

    const { container: c3 } = render(<StatusBadge status="critical_stockout" />);
    expect(c3.textContent).toContain('Critical Stockout');
  });

  it('renders KpiCard with title, value, and badge', () => {
    render(
      <KpiCard
        title="Active SKUs"
        value="4 Products"
        subtext="Catalog items"
        icon={Package}
        badge={{ text: 'Verified', type: 'wine' }}
      />
    );

    expect(screen.getByText('Active SKUs')).toBeDefined();
    expect(screen.getByText('4 Products')).toBeDefined();
    expect(screen.getByText('Catalog items')).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
  });
});
