export async function loadExamData() {
  const response = await fetch('./data/exams.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Não foi possível carregar a base de questões.');
  }

  return response.json();
}
