import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type GestureResponderHandlers } from 'react-native';

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  /** Every row must be exactly this tall for the drop position maths to work. */
  rowHeight: number;
  gap: number;
  /** `dragHandlers` go on the grip you hold to drag. */
  renderItem: (item: T, dragHandlers: GestureResponderHandlers, dragging: boolean) => ReactNode;
  onReorder: (items: T[]) => void;
  onDragChange?: (dragging: boolean) => void;
};

type Drag = { from: number; to: number };

/**
 * A short vertical list you reorder by holding a row's grip and dragging.
 * Built on React Native's own PanResponder so it behaves the same on Android and web.
 */
export function ReorderableList<T>({ items, keyOf, rowHeight, gap, renderItem, onReorder, onDragChange }: Props<T>) {
  const [drag, setDrag] = useState<Drag | null>(null);
  // Mirrors `drag` without waiting for a re-render, so a fast release still
  // drops the row where the finger actually was.
  const dragNow = useRef<Drag | null>(null);
  const [offset] = useState(() => new Animated.Value(0));
  const step = rowHeight + gap;

  function update(next: Drag | null) {
    dragNow.current = next;
    setDrag(next);
  }

  function start(index: number) {
    offset.setValue(0);
    update({ from: index, to: index });
    onDragChange?.(true);
  }

  function move(index: number, dy: number) {
    offset.setValue(dy);
    const current = dragNow.current;
    const to = Math.max(0, Math.min(items.length - 1, Math.round(index + dy / step)));
    if (current && current.to !== to) update({ ...current, to });
  }

  function end() {
    const current = dragNow.current;
    if (current && current.to !== current.from) {
      const next = [...items];
      const [moved] = next.splice(current.from, 1);
      next.splice(current.to, 0, moved);
      onReorder(next);
    }
    update(null);
    offset.setValue(0);
    onDragChange?.(false);
  }

  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const isDragged = drag?.from === index;
        let shift = 0;
        if (drag && !isDragged) {
          if (drag.from < drag.to && index > drag.from && index <= drag.to) shift = -step;
          if (drag.from > drag.to && index >= drag.to && index < drag.from) shift = step;
        }

        return (
          <DragRow
            key={keyOf(item)}
            index={index}
            height={rowHeight}
            marginBottom={index === items.length - 1 ? 0 : gap}
            dragged={isDragged}
            shift={shift}
            offset={offset}
            onStart={start}
            onMove={move}
            onEnd={end}
            render={(handlers) => renderItem(item, handlers, isDragged)}
          />
        );
      })}
    </View>
  );
}

type RowProps = {
  index: number;
  height: number;
  marginBottom: number;
  dragged: boolean;
  shift: number;
  offset: Animated.Value;
  onStart: (index: number) => void;
  onMove: (index: number, dy: number) => void;
  onEnd: () => void;
  render: (handlers: GestureResponderHandlers) => ReactNode;
};

function DragRow({ index, height, marginBottom, dragged, shift, offset, onStart, onMove, onEnd, render }: RowProps) {
  // The responder must survive re-renders mid-drag, so it reads the latest
  // callbacks through a ref instead of being recreated.
  const latest = useRef({ index, onStart, onMove, onEnd });
  useEffect(() => {
    latest.current = { index, onStart, onMove, onEnd };
  });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => latest.current.onStart(latest.current.index),
        onPanResponderMove: (_, gesture) => latest.current.onMove(latest.current.index, gesture.dy),
        onPanResponderRelease: () => latest.current.onEnd(),
        onPanResponderTerminate: () => latest.current.onEnd(),
      }),
    [],
  );

  return (
    <Animated.View
      style={[
        { height, marginBottom },
        dragged ? [styles.lifted, { transform: [{ translateY: offset }] }] : { transform: [{ translateY: shift }] },
      ]}>
      {render(responder.panHandlers)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { userSelect: 'none' },
  lifted: { zIndex: 10, elevation: 8, opacity: 0.95 },
});
