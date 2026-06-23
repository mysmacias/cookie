/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap', () => {
  it('returns a ref object', () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() => useFocusTrap(false, onEscape));
    expect(result.current).toHaveProperty('current');
  });
});
