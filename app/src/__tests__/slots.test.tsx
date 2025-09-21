import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SlotDashboardPage from '../slots';
import { mockRouter, resetMockRouter } from '@/test/router-mock';

describe('SlotDashboardPage CTA', () => {
  it('routes to interviewer form with slot intent when creating interviewer slot', async () => {
    resetMockRouter();

    render(<SlotDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /Идут сейчас/i }));
    const languageSelect = screen.getByLabelText('Язык') as HTMLSelectElement;
    fireEvent.change(languageSelect, { target: { value: '🇨🇳 Chinese' } });

    expect(await screen.findByText('Слотов нет — создайте свой')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Стать интервьюером' }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/interviewer',
      query: expect.objectContaining({
        language: '🇨🇳 Chinese',
        tab: 'live',
        role: 'interviewer',
        showUtc: 'true',
        onlyFree: 'false',
        onlyWithParticipants: 'false'
      })
    });
  });

  it('routes to candidate form when creating candidate slot', async () => {
    resetMockRouter();

    render(<SlotDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /Идут сейчас/i }));
    const languageSelect = screen.getByLabelText('Язык') as HTMLSelectElement;
    fireEvent.change(languageSelect, { target: { value: '🇨🇳 Chinese' } });

    expect(await screen.findByText('Слотов нет — создайте свой')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Кандидат' }));
    mockRouter.push.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Стать кандидатом' }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/interview',
      query: expect.objectContaining({
        language: '🇨🇳 Chinese',
        tab: 'live',
        role: 'candidate'
      })
    });
  });
});
