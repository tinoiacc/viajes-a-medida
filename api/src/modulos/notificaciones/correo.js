const escapar = (t) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// HU-03, criterio 2: envía el código al correo del cliente.
// Sin clave de Resend configurada, el envío se simula en la consola.
export async function enviarCodigoSeguimiento({ email, nombre, codigo }) {
  const asunto = `Tu solicitud de viaje: ${codigo}`;
  const html = `
    <p>Hola ${escapar(nombre)}:</p>
    <p>Recibimos tu solicitud de viaje. Tu código de seguimiento es <strong>${codigo}</strong>.</p>
    <p>Con este código y tu apellido podés consultar el estado de tu solicitud en cualquier momento.</p>`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[correo simulado] Para: ${email} | Asunto: ${asunto}`);
    return;
  }

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE || 'onboarding@resend.dev',
        to: email,
        subject: asunto,
        html,
      }),
    });
    if (!respuesta.ok) console.error('No se pudo enviar el correo:', await respuesta.text());
  } catch (e) {
    // Un fallo del correo no debe impedir que la solicitud quede registrada
    console.error('No se pudo enviar el correo:', e.message);
  }
}