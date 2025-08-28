// File Input Stories
// [pkg-10-file-input-stories]

import type { Meta, StoryObj } from '@storybook/react';
import { FileInput } from '../FileInput';

const meta: Meta<typeof FileInput> = {
  title: 'Components/FileInput',
  component: FileInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onFilesChange: { action: 'files changed' },
    onError: { action: 'error occurred' },
    onRemove: { action: 'file removed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const MultipleFiles: Story = {
  args: {
    multiple: true,
    maxFiles: 5,
  },
};

export const ImagesOnly: Story = {
  args: {
    accept: 'image/*',
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
};

export const DocumentsOnly: Story = {
  args: {
    accept: '.pdf,.doc,.docx,.txt',
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
};

export const LargeSingleFile: Story = {
  args: {
    multiple: false,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const SmallFileLimit: Story = {
  args: {
    multiple: true,
    maxFiles: 3,
    maxSizeBytes: 1 * 1024 * 1024, // 1MB
  },
};