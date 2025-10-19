const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

app.innerHTML = `
  <main>
    <h1>Modular Machine Architect</h1>
    <p>TypeScript + Vite project scaffold is ready.</p>
  </main>
`;
