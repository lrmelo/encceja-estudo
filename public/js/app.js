import { loadExamData } from './modules/data-service.js';
import { QuizStore } from './modules/quiz-store.js';
import { QuizUI } from './modules/ui.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function main() {
  const payload = await loadExamData();
  const store = new QuizStore(payload);
  const ui = new QuizUI(store);

  ui.bindEvents();
  ui.render();
}

main().catch((error) => {
  console.error(error);
  document.body.innerHTML = `
    <main class="fallback-view">
      <section class="fallback-card" role="alert">
        <h1>Falha ao carregar a aplicação</h1>
        <p>${escapeHtml(error.message)}</p>
        <p>Execute <code>npm.cmd run build:data</code> e recarregue a página.</p>
      </section>
    </main>
  `;
});
