// Empty State Stories
// [pkg-10-empty-state-stories]

import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from '../EmptyState';
import { Search, Upload, Users, FileText } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    action: {
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No data found',
    description: 'There are no items to display at the moment.',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'No search results',
    description: 'Try adjusting your search criteria to find what you\'re looking for.',
    icon: <Search className="h-12 w-12" />,
  },
};

export const WithAction: Story = {
  args: {
    title: 'No files uploaded',
    description: 'Get started by uploading your first file.',
    icon: <Upload className="h-12 w-12" />,
    action: {
      label: 'Upload File',
      onClick: () => alert('Upload clicked!'),
    },
  },
};

export const WithSecondaryAction: Story = {
  args: {
    title: 'No team members',
    description: 'Invite your first team member to get started collaborating.',
    icon: <Users className="h-12 w-12" />,
    action: {
      label: 'Invite Member',
      onClick: () => alert('Invite clicked!'),
      variant: 'secondary',
    },
  },
};

export const DocumentsEmpty: Story = {
  args: {
    title: 'No documents yet',
    description: 'Create your first document to start organizing your content.',
    icon: <FileText className="h-12 w-12" />,
    action: {
      label: 'Create Document',
      onClick: () => alert('Create clicked!'),
    },
  },
};

export const ShortDescription: Story = {
  args: {
    title: 'Nothing here',
    icon: <Search className="h-12 w-12" />,
  },
};