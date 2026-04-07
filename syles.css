:root {
  --bg: #f5f6f8;
  --card: #ffffff;
  --panel: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --border: #d1d5db;
  --border-strong: #9ca3af;
  --error: #b91c1c;
  --ok: #065f46;
  --ok-bg: #ecfdf5;
  --ok-border: #a7f3d0;
  --warn-bg: #fffbeb;
  --warn-border: #fcd34d;
  --button: #111827;
  --button-text: #ffffff;
  --button-secondary: #e5e7eb;
  --button-secondary-text: #111827;
  --button-disabled: #9ca3af;
  --summary-bg: #f9fafb;
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: var(--bg);
  color: var(--text);
}

body {
  min-height: 100vh;
}

.page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 18px;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

h1 {
  margin: 0 0 10px;
  font-size: 2rem;
}

h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
}

h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.intro {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.top-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
  align-items: start;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full {
  grid-column: 1 / -1;
}

label {
  font-weight: 600;
  margin-bottom: 8px;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--text);
  background: #fff;
}

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid transparent;
  border-color: var(--border-strong);
}

textarea {
  min-height: 100px;
  resize: vertical;
}

.error {
  min-height: 18px;
  margin: 6px 0 0;
  font-size: 0.9rem;
  color: var(--error);
}

.legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 0.95rem;
}

#calendar {
  margin-top: 10px;
}

.fc {
  max-width: 100%;
}

.availability-box,
.summary {
  margin-top: 18px;
  padding: 14px;
  border-radius: 12px;
}

.availability-box {
  background: var(--warn-bg);
  border: 1px solid var(--warn-border);
}

.summary {
  background: var(--summary-bg);
  border: 1px solid var(--border);
}

.summary pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, monospace;
  font-size: 0.92rem;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 12px 18px;
  font-weight: 600;
  cursor: pointer;
}

#checkButton {
  background: var(--button-secondary);
  color: var(--button-secondary-text);
}

#submitButton {
  background: var(--button);
  color: var(--button-text);
}

button:disabled {
  background: var(--button-disabled);
  color: #fff;
  cursor: not-allowed;
}

.status {
  margin-top: 16px;
  min-height: 24px;
  color: var(--muted);
  line-height: 1.5;
}

.status.success {
  color: var(--ok);
  background: var(--ok-bg);
  border: 1px solid var(--ok-border);
  border-radius: 10px;
  padding: 10px 12px;
}

.status.error {
  color: var(--error);
}

@media (max-width: 1100px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .page {
    padding: 18px 12px;
  }

  .card,
  .panel {
    padding: 16px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .field.full {
    grid-column: auto;
  }

  h1 {
    font-size: 1.6rem;
  }

  .actions {
    flex-direction: column;
  }

  .actions button {
    width: 100%;
  }
}
