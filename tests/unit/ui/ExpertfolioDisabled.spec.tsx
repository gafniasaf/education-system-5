/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Render the server component by importing the compiled file to ensure no import-time errors.
// For unit test, we can simulate disabled state by calling the default export as a function
import Page from '../../../apps/web/src/app/labs/expertfolio/page';

describe('Expertfolio labs page (disabled)', () => {
  test('shows disabled message when flag off', async () => {
    // Ensure env flag is off
    delete process.env.FEATURE_EXPERTFOLIO;
    // @ts-ignore - default export is a server component function
    const element = await Page();
    // Render the JSX for assertion (jsdom)
    render(element as any);
    expect(await screen.findByText(/Expertfolio is disabled/i)).toBeInTheDocument();
  });
});


