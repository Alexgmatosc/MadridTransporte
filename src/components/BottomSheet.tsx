import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, Map as MapIcon, List } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export type SnapPoint = 'peek' | 'half' | 'full';

export interface BottomSheetProps {
  snap: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
  peekHeight?: number;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VELOCITY_THRESHOLD = 0.45; // px/ms

export const BottomSheet: React.FC<BottomSheetProps> = ({
  snap,
  onSnapChange,
  peekHeight = 148,
  headerContent,
  children,
  className = '',
}) => {
  const [windowHeight, setWindowHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight || 844;
    }
    return 844;
  });

  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Drag tracking refs
  const startYRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Content touch decoupling refs
  const contentTouchStartYRef = useRef<number | null>(null);
  const isContentDraggingSheetRef = useRef<boolean>(false);

  // Window resize tracking
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight || 844);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute snap heights so the map at the top of the screen is ALWAYS clearly visible in 'half' and 'peek'
  const resolvedPeekHeight = Math.max(130, peekHeight);
  const halfHeight = Math.round(windowHeight * 0.50);
  const fullHeight = Math.round(Math.min(windowHeight - 68, windowHeight * 0.88));

  // Translate offset per snap point (0 = fully expanded to fullHeight)
  const getTranslateYForSnap = useCallback(
    (point: SnapPoint): number => {
      switch (point) {
        case 'full':
          return 0;
        case 'half':
          return Math.max(0, fullHeight - halfHeight);
        case 'peek':
          return Math.max(0, fullHeight - resolvedPeekHeight);
      }
    },
    [fullHeight, halfHeight, resolvedPeekHeight]
  );

  const currentSnapTranslateY = getTranslateYForSnap(snap);

  // Calculate commit snap based on velocity or distance
  const calculateTargetSnap = useCallback(
    (velocity: number, currentOffset: number): SnapPoint => {
      // 1. High-velocity flick commit (|v| > 0.45 px/ms)
      if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
        if (velocity > 0) {
          // Downward swipe -> lower snap point
          if (snap === 'full') return 'half';
          if (snap === 'half') return 'peek';
          return 'peek';
        } else {
          // Upward swipe -> higher snap point
          if (snap === 'peek') return 'half';
          if (snap === 'half') return 'full';
          return 'full';
        }
      }

      // 2. Slow release: distance commit to closest snap point
      const currentVisualTranslateY = currentSnapTranslateY + currentOffset;
      const currentVisibleHeight = fullHeight - currentVisualTranslateY;

      const distPeek = Math.abs(currentVisibleHeight - resolvedPeekHeight);
      const distHalf = Math.abs(currentVisibleHeight - halfHeight);
      const distFull = Math.abs(currentVisibleHeight - fullHeight);

      if (distPeek <= distHalf && distPeek <= distFull) {
        return 'peek';
      }
      if (distHalf <= distPeek && distHalf <= distFull) {
        return 'half';
      }
      return 'full';
    },
    [snap, currentSnapTranslateY, fullHeight, resolvedPeekHeight, halfHeight]
  );

  // Commit snap change with haptic feedback
  const commitSnap = useCallback(
    (velocity: number, offset: number) => {
      const nextSnap = calculateTargetSnap(velocity, offset);
      if (nextSnap !== snap) {
        triggerHaptic('selection');
        onSnapChange(nextSnap);
      }
      setDragOffset(0);
      setIsDragging(false);
      isDraggingRef.current = false;
      velocityYRef.current = 0;
    },
    [calculateTargetSnap, snap, onSnapChange]
  );

  // --- Pointer Drag on Header / Pill ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    // Allow child buttons/links inside headerContent to be clicked normally
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, [role="button"]')) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Graceful fallback
    }

    setIsDragging(true);
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityYRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    const dy = e.clientY - lastYRef.current;

    if (dt > 0) {
      velocityYRef.current = dy / dt;
    }
    lastYRef.current = e.clientY;
    lastTimeRef.current = now;

    const rawDelta = e.clientY - startYRef.current;
    const baseTranslateY = getTranslateYForSnap(snap);
    const candidateTranslateY = baseTranslateY + rawDelta;

    // Rubber-band resistance if dragged beyond full or peek bounds
    let adjustedDelta = rawDelta;
    if (candidateTranslateY < 0) {
      const overshoot = -candidateTranslateY;
      adjustedDelta = -baseTranslateY - overshoot * 0.25;
    } else {
      const maxTranslateY = getTranslateYForSnap('peek');
      if (candidateTranslateY > maxTranslateY) {
        const overshoot = candidateTranslateY - maxTranslateY;
        adjustedDelta = maxTranslateY - baseTranslateY + overshoot * 0.25;
      }
    }

    setDragOffset(adjustedDelta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    commitSnap(velocityYRef.current, dragOffset);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    commitSnap(0, dragOffset);
  };

  // --- Scroll Decoupling for Content Container (Upward & Downward) ---
  const handleContentTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    contentTouchStartYRef.current = e.touches[0].clientY;
    lastYRef.current = e.touches[0].clientY;
    lastTimeRef.current = performance.now();
    velocityYRef.current = 0;
    isContentDraggingSheetRef.current = false;
  };

  const handleContentTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (contentTouchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - contentTouchStartYRef.current;
    const scrollTop = contentRef.current?.scrollTop ?? 0;

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityYRef.current = (currentY - lastYRef.current) / dt;
    }
    lastYRef.current = currentY;
    lastTimeRef.current = now;

    if (!isContentDraggingSheetRef.current) {
      // 1. If sheet is in 'peek' or 'half' and user swipes UP, expand the sheet first
      if (snap !== 'full' && deltaY < -8 && scrollTop <= 0) {
        isContentDraggingSheetRef.current = true;
        setIsDragging(true);
        isDraggingRef.current = true;
        startYRef.current = currentY;
      }
      // 2. If content is scrolled to the very top and user swipes DOWN, collapse the sheet
      else if (scrollTop <= 0 && deltaY > 8) {
        isContentDraggingSheetRef.current = true;
        setIsDragging(true);
        isDraggingRef.current = true;
        startYRef.current = currentY;
      }
    }

    if (isContentDraggingSheetRef.current) {
      const rawDelta = currentY - startYRef.current;
      const baseTranslateY = getTranslateYForSnap(snap);
      const candidateTranslateY = baseTranslateY + rawDelta;
      const maxTranslateY = getTranslateYForSnap('peek');

      if (candidateTranslateY < 0) {
        setDragOffset(-baseTranslateY + candidateTranslateY * 0.25);
      } else if (candidateTranslateY > maxTranslateY) {
        setDragOffset(maxTranslateY - baseTranslateY + (candidateTranslateY - maxTranslateY) * 0.25);
      } else {
        setDragOffset(rawDelta);
      }
    }
  };

  const handleContentTouchEnd = () => {
    if (isContentDraggingSheetRef.current) {
      commitSnap(velocityYRef.current, dragOffset);
    }
    contentTouchStartYRef.current = null;
    isContentDraggingSheetRef.current = false;
  };

  const handleSelectSnap = (targetSnap: SnapPoint) => {
    triggerHaptic('selection');
    onSnapChange(targetSnap);
  };

  // Calculate final translateY
  const activeTranslateY = Math.max(
    -24,
    currentSnapTranslateY + (isDragging ? dragOffset : 0)
  );

  return (
    <div
      ref={sheetRef}
      role="region"
      aria-label="Detalles de parada y llegadas"
      data-snap={snap}
      data-testid="bottom-sheet"
      className={`max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 flex flex-col max-lg:rounded-t-[24px] max-lg:bg-white/95 max-lg:dark:bg-[#14161A]/95 max-lg:border-t max-lg:border-zinc-200/90 max-lg:dark:border-zinc-800 max-lg:shadow-[0_-10px_35px_-5px_rgba(0,0,0,0.22)] transition-colors will-change-transform select-none lg:static lg:h-auto! lg:transform-none! lg:bg-transparent! lg:dark:bg-transparent! lg:border-0! lg:shadow-none! lg:backdrop-blur-none! lg:select-auto ${className}`}
      style={{
        height: `${fullHeight}px`,
        transform: `translate3d(0, ${activeTranslateY}px, 0)`,
        transition: isDragging
          ? 'none'
          : 'transform 280ms cubic-bezier(0.2, 0.9, 0.4, 1.0)',
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      }}
    >
      {/* Drag Pill Handle + Quick Snap Switcher Bar (Mobile/Tablet) */}
      <div
        data-testid="bottom-sheet-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="w-full max-lg:pt-1.5 max-lg:pb-1.5 max-lg:px-3.5 flex flex-col items-center max-lg:cursor-grab max-lg:active:cursor-grabbing shrink-0 max-lg:border-b max-lg:border-zinc-100 max-lg:dark:border-zinc-800/80"
        style={{ touchAction: 'none' }}
      >
        {/* iOS Pill Indicator */}
        <div
          className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto mb-1.5 lg:hidden"
          style={{ touchAction: 'none' }}
        />

        {/* Quick 1-Tap Snap Mode Bar on Mobile so the user doesn't have to struggle with gestures */}
        <div className="flex lg:hidden items-center justify-between w-full gap-2">
          <button
            type="button"
            onClick={() => handleSelectSnap(snap === 'peek' ? 'half' : 'peek')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ios-press ${
              snap === 'peek'
                ? 'bg-[#0072CE] text-white shadow-2xs'
                : 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{snap === 'peek' ? 'Mapa ampliado' : 'Ver más mapa'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectSnap('half')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ios-press ${
                snap === 'half'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Mitad
            </button>
            <button
              type="button"
              onClick={() => handleSelectSnap(snap === 'full' ? 'half' : 'full')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ios-press ${
                snap === 'full'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{snap === 'full' ? 'Reducir' : 'Lista completa'}</span>
              {snap === 'full' ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {headerContent && <div className="w-full mt-1 lg:mt-0">{headerContent}</div>}
      </div>

      {/* Decoupled Content Scroll Container */}
      <div
        ref={contentRef}
        data-testid="bottom-sheet-content"
        onTouchStart={handleContentTouchStart}
        onTouchMove={handleContentTouchMove}
        onTouchEnd={handleContentTouchEnd}
        className="flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:px-3 max-lg:sm:px-4 max-lg:pt-2.5 select-auto flex flex-col gap-3.5"
        style={{
          overscrollBehaviorY: 'contain',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
