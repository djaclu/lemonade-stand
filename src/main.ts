import './style.css';
import { initViewer } from './viewer';
import { initNewsletter } from './newsletter';

// Optional: override title/subtitle from URL or config
const params = new URLSearchParams(window.location.search);
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
if (titleEl && params.has('title')) titleEl.textContent = params.get('title') ?? '';
if (subtitleEl && params.has('subtitle')) subtitleEl.textContent = params.get('subtitle') ?? '';

initViewer();
initNewsletter();
