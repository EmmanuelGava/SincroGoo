"use client";
import { useState } from "react";

export default function PruebaTelegram() {
  const [form, setForm] = useState({
    id: "123456789",
    first_name: "Juan",
    last_name: "Pérez",
    username: "juanperez",
    text: "Hola, quiero información!"
  });
  const [loading, setLoading] = useState(false);
  const [respuesta, setRespuesta] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRespuesta(null);
    // Simula el payload real de Telegram
    const payload = {
      update_id: 1,
      message: {
        message_id: 1,
        from: {
          id: Number(form.id),
          is_bot: false,
          first_name: form.first_name,
          last_name: form.last_name,
          username: form.username,
          language_code: "es"
        },
        chat: {
          id: Number(form.id),
          first_name: form.first_name,
          last_name: form.last_name,
          username: form.username,
          type: "private"
        },
        date: Math.floor(Date.now() / 1000),
        text: form.text
      }
    };
    try {
      const res = await fetch("/api/integrations/incoming/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setRespuesta(JSON.stringify(data, null, 2));
    } catch (err) {
      setRespuesta("Error en la petición");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Prueba Webhook Telegram</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input name="id" value={form.id} onChange={handleChange} placeholder="ID de Telegram" required />
        <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Nombre" required />
        <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Apellido" />
        <input name="username" value={form.username} onChange={handleChange} placeholder="Username" />
        <input name="text" value={form.text} onChange={handleChange} placeholder="Mensaje" required />
        <button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar mensaje simulado"}</button>
      </form>
      {respuesta && (
        <pre style={{ marginTop: 20, background: "#f7f7f7", padding: 12, borderRadius: 4 }}>{respuesta}</pre>
      )}
    </div>
  );
} 