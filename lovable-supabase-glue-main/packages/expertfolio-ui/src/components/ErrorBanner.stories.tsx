// Error Banner Stories
// [pkg-10-error-banner-stories]

import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBanner } from '../ErrorBanner';

const meta: Meta<typeof ErrorBanner> = {
  title: 'Components/ErrorBanner',
  component: ErrorBanner,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onRetry: { action: 'retry clicked' },
    onDismiss: { action: 'dismiss clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: {
      message: 'Something went wrong while loading the data.',
      code: 'NETWORK_ERROR',
    },
  },
};

export const WithRequestId: Story = {
  args: {
    error: {
      message: 'Failed to save the changes. Please try again.',
      code: 'SAVE_ERROR',
      requestId: 'req_1234567890_abcdef123',
    },
  },
};

export const ServerError: Story = {
  args: {
    error: {
      message: 'The server is temporarily unavailable.',
      code: 'SERVER_ERROR',
      statusCode: 503,
      requestId: 'req_1234567890_server503',
    },
  },
};

export const NonRetryableError: Story = {
  args: {
    error: {
      message: 'You do not have permission to perform this action.',
      code: 'PERMISSION_DENIED',
      statusCode: 403,
      retryable: false,
    },
  },
};

export const WithRetryAction: Story = {
  args: {
    error: {
      message: 'Failed to connect to the server.',
      code: 'CONNECTION_ERROR',
      retryable: true,
    },
  },
};

export const LongMessage: Story = {
  args: {
    error: {
      message: 'This is a very long error message that might wrap to multiple lines to test how the component handles longer text content and maintains good readability.',
      code: 'LONG_ERROR',
      requestId: 'req_1234567890_longmessage',
    },
  },
};