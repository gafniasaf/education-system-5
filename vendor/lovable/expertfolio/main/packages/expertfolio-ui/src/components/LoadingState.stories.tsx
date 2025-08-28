// Loading State Stories
// [pkg-10-loading-state-stories]

import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState, TableSkeleton } from '../LoadingState';

const meta: Meta<typeof LoadingState> = {
  title: 'Components/LoadingState',
  component: LoadingState,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Spinner: Story = {
  args: {
    variant: 'spinner',
    size: 'md',
  },
};

export const SpinnerWithText: Story = {
  args: {
    variant: 'spinner',
    size: 'md',
    children: 'Loading data...',
  },
};

export const Dots: Story = {
  args: {
    variant: 'dots',
  },
};

export const DotsWithText: Story = {
  args: {
    variant: 'dots',
    children: 'Processing...',
  },
};

export const Skeleton: Story = {
  args: {
    variant: 'skeleton',
  },
};

export const SmallSpinner: Story = {
  args: {
    variant: 'spinner',
    size: 'sm',
  },
};

export const LargeSpinner: Story = {
  args: {
    variant: 'spinner',
    size: 'lg',
    children: 'Loading large dataset...',
  },
};

// Table Skeleton Stories
const TableSkeletonMeta: Meta<typeof TableSkeleton> = {
  title: 'Components/TableSkeleton',
  component: TableSkeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Table: StoryObj<typeof TableSkeleton> = {
  ...TableSkeletonMeta,
  args: {
    rows: 5,
    cols: 4,
  },
};

export const WideTable: StoryObj<typeof TableSkeleton> = {
  ...TableSkeletonMeta,
  args: {
    rows: 8,
    cols: 6,
  },
};

export const SmallTable: StoryObj<typeof TableSkeleton> = {
  ...TableSkeletonMeta,
  args: {
    rows: 3,
    cols: 3,
  },
};