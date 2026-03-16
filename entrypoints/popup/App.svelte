<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DEFAULT_SETTINGS,
    FORMATS,
    getEffectiveDefaultFormat,
    type ImageFormat,
    type Settings,
  } from '../../utils/conversion';
  import { getSettings, setSettings } from '../../utils/storage';

  let settings = $state<Settings>({ ...DEFAULT_SETTINGS });
  let supportedFormats = $state<ImageFormat[]>([...FORMATS]);
  let avifUnsupported = $state(false);
  let loaded = $state(false);
  let saveTimer = 0;

  function queueSave(nextSettings: Settings): void {
    if (!loaded) {
      return;
    }

    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void setSettings(nextSettings);
    }, 250);
  }

  function updateQuality(key: 'jpegQuality' | 'webpQuality' | 'avifQuality', value: string): void {
    settings = { ...settings, [key]: Number(value) };
  }

  function updateDefaultFormat(value: string): void {
    settings = { ...settings, defaultFormat: value as ImageFormat };
  }

  function updateStripMetadata(value: boolean): void {
    settings = { ...settings, stripMetadata: value };
  }

  $effect(() => {
    queueSave(settings);
  });

  async function detectCanvasExportSupport(format: ImageFormat): Promise<boolean> {
    if (format === 'png' || format === 'jpeg') {
      return true;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), `image/${format}`, 1);
    });

    return blob?.type === `image/${format}`;
  }

  onMount(async () => {
    settings = await getSettings();
    supportedFormats = [];

    for (const format of FORMATS) {
      if (await detectCanvasExportSupport(format)) {
        supportedFormats.push(format);
      }
    }

    avifUnsupported = !supportedFormats.includes('avif');
    settings = {
      ...settings,
      defaultFormat: getEffectiveDefaultFormat(settings.defaultFormat, supportedFormats),
    };
    loaded = true;

    return () => {
      window.clearTimeout(saveTimer);
    };
  });
</script>

<svelte:head>
  <title>SaveAsType</title>
</svelte:head>

<div class="popup">
  <header class="hero">
    <div>
      <p class="eyebrow">SaveAsType</p>
      <h1>Image conversion settings</h1>
    </div>
    <p class="summary">All conversions happen locally in your browser.</p>
  </header>

  <section class="panel">
    <h2>Format quality</h2>

    <label class="field">
      <span>JPEG quality</span>
      <strong>{settings.jpegQuality}</strong>
      <input
        type="range"
        min="1"
        max="100"
        value={settings.jpegQuality}
        oninput={(event) => updateQuality('jpegQuality', (event.currentTarget as HTMLInputElement).value)}
      />
    </label>

    <label class="field">
      <span>WebP quality</span>
      <strong>{settings.webpQuality}</strong>
      <input
        type="range"
        min="1"
        max="100"
        value={settings.webpQuality}
        oninput={(event) => updateQuality('webpQuality', (event.currentTarget as HTMLInputElement).value)}
      />
    </label>

    <label class="field">
      <span>AVIF quality</span>
      <strong>{settings.avifQuality}</strong>
      <input
        type="range"
        min="1"
        max="100"
        value={settings.avifQuality}
        disabled={avifUnsupported}
        oninput={(event) => updateQuality('avifQuality', (event.currentTarget as HTMLInputElement).value)}
      />
    </label>

    {#if avifUnsupported}
      <p class="hint">AVIF export is unavailable in this browser, so it is hidden from the menu.</p>
    {/if}

    <div class="field static">
      <span>PNG</span>
      <strong>Lossless - no quality setting</strong>
    </div>
  </section>

  <section class="panel">
    <h2>Default format</h2>
    <div class="choices">
      {#each supportedFormats as format}
        <label class:selected={settings.defaultFormat === format}>
          <input
            type="radio"
            name="defaultFormat"
            value={format}
            checked={settings.defaultFormat === format}
            onchange={(event) => updateDefaultFormat((event.currentTarget as HTMLInputElement).value)}
          />
          <span>{format.toUpperCase()}</span>
        </label>
      {/each}
    </div>
  </section>

  <section class="panel">
    <h2>Options</h2>
    <label class="toggle">
      <div>
        <span>Strip metadata</span>
        <small>Canvas conversion strips metadata in v1.</small>
      </div>
      <input
        type="checkbox"
        checked={settings.stripMetadata}
        onchange={(event) => updateStripMetadata((event.currentTarget as HTMLInputElement).checked)}
      />
    </label>
  </section>

  <footer class="footer">
    <a href="https://github.com/" target="_blank" rel="noreferrer">GitHub repository</a>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    width: 320px;
    min-height: 100%;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(196, 225, 255, 0.95), transparent 42%),
      linear-gradient(180deg, #f6f8fb 0%, #eef2f7 100%);
    color: #122033;
  }

  .popup {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .hero {
    display: grid;
    gap: 6px;
  }

  .eyebrow {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #4c6683;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: 18px;
  }

  h2 {
    font-size: 13px;
  }

  .summary {
    font-size: 12px;
    color: #43546a;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: #6a4d1f;
  }

  .panel {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgba(86, 110, 135, 0.18);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 8px 24px rgba(22, 33, 49, 0.07);
  }

  .field {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 10px;
    align-items: center;
    font-size: 13px;
  }

  .field input[type='range'] {
    grid-column: 1 / -1;
    width: 100%;
  }

  .field strong {
    font-size: 12px;
    color: #4c6683;
  }

  .static {
    padding: 10px 12px;
    border-radius: 10px;
    background: #f1f6fb;
  }

  .choices {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .choices label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(86, 110, 135, 0.18);
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
  }

  .choices label.selected {
    border-color: #215d8c;
    background: #edf6ff;
  }

  .toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }

  .toggle small {
    display: block;
    margin-top: 4px;
    color: #4c6683;
  }

  .footer a {
    font-size: 12px;
    color: #215d8c;
    text-decoration: none;
  }

  .footer a:hover,
  .footer a:focus-visible {
    text-decoration: underline;
  }
</style>
