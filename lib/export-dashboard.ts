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

  // SVG serialization reads the checked attribute, while controlled React inputs
  // update the checked property. Synchronize defaults only during capture so
  // unchecked filters do not appear checked in the exported image.
  const checkboxes = Array.from(node.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  const defaults = checkboxes.map((input) => input.defaultChecked);
  let blob: Blob | null;
  try {
    checkboxes.forEach((input) => { input.defaultChecked = input.checked; });
    blob = await toBlob(node, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter: (element) => !element.hasAttribute?.('data-export-ignore'),
    });
  } finally {
    checkboxes.forEach((input, index) => { input.defaultChecked = defaults[index]; });
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
