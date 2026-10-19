export function revenueExportFilename(dates: string[], compare: boolean): string {
  const validDates = dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  const period = validDates.length ? `_${validDates[0]}_${validDates[validDates.length - 1]}` : '';
  return `revenue-trend${period}${compare ? '_comparison' : ''}.png`;
}

/** Render only the dashboard card; all conversion/download happens in-browser. */
export async function exportDashboardPng(node: HTMLElement, filename: string): Promise<void> {
  const { toBlob } = await import('html-to-image');
  await document.fonts.ready;
  // Let React paint the exporting state, then finish finite chart transitions
  // so a quick Compare -> Export click never captures half-sized bars.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const animations = node.getAnimations({ subtree: true })
    .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
  await Promise.allSettled(animations.map((animation) => animation.finished));
  if (!node.isConnected) throw new Error('The dashboard is no longer visible. Please try again.');

  // Expand an off-screen copy so mobile exports include every day without
  // changing the visible dashboard or its horizontal scroll position.
  const chart = node.querySelector<HTMLElement>('[data-revenue-chart-canvas]');
  const styles = getComputedStyle(node);
  const frameWidth = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
    + node.offsetWidth - node.clientWidth;
  const width = Math.ceil(Math.max(node.offsetWidth, (chart?.scrollWidth ?? 0) + frameWidth));
  const capture = node.cloneNode(true) as HTMLElement;
  capture.setAttribute('aria-hidden', 'true');
  capture.setAttribute('inert', '');
  Object.assign(capture.style, {
    position: 'fixed', left: '-100000px', top: '0', width: `${width}px`,
    maxWidth: 'none', height: 'auto', margin: '0', pointerEvents: 'none',
  });
  const checkboxes = Array.from(node.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  capture.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input, index) => {
    input.checked = checkboxes[index].checked;
    input.defaultChecked = input.checked;
  });
  let blob: Blob | null;
  try {
    document.body.appendChild(capture);
    blob = await toBlob(capture, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      style: { position: 'static', left: 'auto', top: 'auto', pointerEvents: 'none' },
      filter: (element) => !element.hasAttribute?.('data-export-ignore'),
    });
  } finally {
    capture.remove();
  }
  if (!blob || blob.type !== 'image/png' || blob.size === 0) {
    throw new Error('Unable to create the PNG image. Please try again.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Keep the object URL alive long enough for the browser to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
