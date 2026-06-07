export default function HomePage() {
  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 520,
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface)",
          padding: 24,
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
          Check-In Board
        </p>
        <h1 style={{ fontSize: 28, margin: "8px 0" }}>Financeiro MVP</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
          App separado para controlar aluguéis, despesas e repasses por cliente
          e apartamento.
        </p>
      </section>
    </main>
  );
}
