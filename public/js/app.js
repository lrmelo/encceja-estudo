import { loadExamData } from './modules/data-service.js';
import { QuizStore } from './modules/quiz-store.js';
import { QuizUI } from './modules/ui.js';

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
    <main style="padding: 32px; font-family: Arial, sans-serif;">
      <h1>Falha ao carregar a aplicacao</h1>
      <p>${error.message}</p>
      <p>Execute <code>npm run build:data</code> e recarregue a pagina.</p>
    </main>
  `;
});
