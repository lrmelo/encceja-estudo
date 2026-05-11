export async function loadExamData() {
  const response = await fetch('./data/exams.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar a base de questoes.');
  }

  return response.json();
}
