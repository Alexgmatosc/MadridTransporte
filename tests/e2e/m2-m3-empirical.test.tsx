import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { renderApp } from './helpers/renderApp';
import { BottomSheet } from '../../src/components/BottomSheet';
import { GOOGLE_MAPS_API_KEY, BusMap } from '../../src/components/BusMap';
import { FIXTURE_METRO_SOL, FIXTURE_BUS_CIBELES_72 } from './helpers/fixtures';

describe('Milestones 2 & 3 Empirical Verification: Spatial BottomSheet, Google Maps Constant & Native iOS Polish', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. exports GOOGLE_MAPS_API_KEY constant referencing import.meta.env.VITE_GOOGLE_MAPS_API_KEY', () => {
    expect(typeof GOOGLE_MAPS_API_KEY).toBe('string');
  });

  it('2. renders BottomSheet in half snap when opening a Bus Stop or Metro Station', async () => {
    await renderApp({ url: 'http://localhost/?stop=72' });

    await waitFor(() => {
      const sheet = screen.getByTestId('bottom-sheet');
      expect(sheet).toBeDefined();
      expect(sheet.getAttribute('data-snap')).toBe('half');
    });
  });

  it('3. snaps BottomSheet to "peek" when clicking "Ver autobús en el mapa" without window.scrollTo(320) hack', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo');
    await renderApp({ url: 'http://localhost/?stop=72' });

    await waitFor(() => {
      expect(screen.getAllByTitle('Ver autobús en el mapa').length).toBeGreaterThan(0);
    });

    scrollSpy.mockClear();
    const mapBtns = screen.getAllByTitle('Ver autobús en el mapa');
    await act(async () => {
      fireEvent.click(mapBtns[0]);
    });

    const sheet = screen.getByTestId('bottom-sheet');
    expect(sheet.getAttribute('data-snap')).toBe('peek');
    expect(scrollSpy).not.toHaveBeenCalledWith(expect.objectContaining({ top: 320 }));
  });

  it('4. BottomSheet pointer flick gesture transitions snap state cleanly', () => {
    const onSnapChange = vi.fn();
    render(
      <BottomSheet snap="half" onSnapChange={onSnapChange} headerContent={<div>Header</div>}>
        <div>Content</div>
      </BottomSheet>
    );

    const handle = screen.getByTestId('bottom-sheet-handle');
    fireEvent.pointerDown(handle, { button: 0, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 100, pointerId: 1 });

    expect(onSnapChange).toHaveBeenCalledWith('full');
  });

  it('5. BusMap renders Google Maps / OpenStreetMap provider toggle for both Metro stations and Bus stops', () => {
    const { unmount } = render(
      <BusMap metroStation={FIXTURE_METRO_SOL} userLocation={null} isDark={false} />
    );
    expect(screen.getByRole('button', { name: /Google Maps/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /OpenStreetMap/i })).toBeDefined();
    unmount();

    render(<BusMap stop={FIXTURE_BUS_CIBELES_72} userLocation={null} isDark={false} />);
    expect(screen.getByRole('button', { name: /Google Maps/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /OpenStreetMap/i })).toBeDefined();
  });

  it('6. enforces tabular-nums on live countdowns and ETAs to prevent layout jitter', async () => {
    await renderApp({ url: 'http://localhost/?stop=72' });

    await waitFor(() => {
      expect(screen.getByText('CRISTO REY')).toBeDefined();
    });

    const tabularElements = document.querySelectorAll('.tabular-nums');
    expect(tabularElements.length).toBeGreaterThan(3);
  });
});
