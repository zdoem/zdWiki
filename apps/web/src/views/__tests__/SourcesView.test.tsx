import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SourcesView } from '../SourcesView';

// Mock dependencies
vi.mock('@/store/consoleStore', () => ({
  useConsole: () => ({ openDetail: vi.fn() })
}));
vi.mock('@/lib/api', () => ({
  getApiBase: () => 'http://localhost:8000'
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  })
) as any;

describe('SourcesView Ingestion Modal', () => {
  it('opens modal and switches modes', async () => {
    render(<SourcesView />);
    
    // Open modal
    const ingestBtn = await screen.findByText('+ Ingest Raw Source');
    fireEvent.click(ingestBtn);
    
    // Check default mode (Paste Content)
    expect(screen.getByText('Raw Content')).toBeDefined();
    
    // Switch to Upload File
    const uploadTab = screen.getByText('Upload File');
    fireEvent.click(uploadTab);
    expect(screen.getByText('Source File')).toBeDefined();
    expect(screen.queryByText('Raw Content')).toBeNull();
  });

  it('handles file selection', async () => {
    render(<SourcesView />);
    
    // Open modal and switch to upload
    fireEvent.click(await screen.findByText('+ Ingest Raw Source'));
    fireEvent.click(screen.getByText('Upload File'));
    
    // Find file input
    const fileInput = document.querySelector('input[type="file"]');
    
    // Create a mock file
    const file = new File(['hello'], 'hello.md', { type: 'text/markdown' });
    
    // Upload file
    await userEvent.upload(fileInput as HTMLElement, file);
    
    // Check if filename is displayed
    expect(await screen.findByText('hello.md')).toBeDefined();
    expect(screen.getByText('text/markdown')).toBeDefined();
  });

  it('displays live telemetry process log on ingest submission', async () => {
    render(<SourcesView />);
    
    // Open modal
    fireEvent.click(await screen.findByText('+ Ingest Raw Source'));
    
    // Fill in paste title & content
    const titleInput = screen.getByPlaceholderText('e.g. RFC 9110 HTTP Semantics Specification');
    const contentArea = screen.getByPlaceholderText('Paste raw Markdown or technical documentation text here...');
    fireEvent.change(titleInput, { target: { value: 'Test RFC' } });
    fireEvent.change(contentArea, { target: { value: 'Specification Body' } });
    
    // Click Ingest Source
    const submitBtn = screen.getByRole('button', { name: 'Ingest Source' });
    fireEvent.click(submitBtn);
    
    // Verify telemetry section rendered
    expect(await screen.findByText('PIPELINE_TELEMETRY')).toBeDefined();
    expect(screen.getByText('INIT')).toBeDefined();
  });
});
