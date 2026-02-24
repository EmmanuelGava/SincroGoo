import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          Última actualización: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">1. Información que Recopilamos</h2>
          <p>
            Klosync recopila información necesaria para proporcionar servicios de mensajería unificada:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Información de la cuenta (nombre, correo electrónico)</li>
            <li>Mensajes enviados y recibidos a través de nuestras integraciones</li>
            <li>Metadatos de conversaciones (fechas, estados de entrega)</li>
            <li>Información de configuración de plataformas de mensajería (WhatsApp, Telegram, Email)</li>
            <li>Tokens de acceso para plataformas de terceros (almacenados de forma segura)</li>
            <li>Datos de uso del servicio y análisis</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">2. Cómo Utilizamos su Información</h2>
          <p>
            Utilizamos la información recopilada para:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Proporcionar y mantener nuestros servicios</li>
            <li>Mejorar y personalizar su experiencia</li>
            <li>Comunicarnos con usted</li>
            <li>Garantizar la seguridad de nuestros servicios</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">3. Protección de Datos</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger sus datos personales
            contra el acceso no autorizado, la alteración, la divulgación o la destrucción.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">4. Sus Derechos</h2>
          <p>
            Usted tiene derecho a:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Acceder a sus datos personales</li>
            <li>Rectificar sus datos personales</li>
            <li>Solicitar la eliminación de sus datos</li>
            <li>Oponerse al procesamiento de sus datos</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">5. Contacto</h2>
          <p>
            Si tiene preguntas sobre esta Política de Privacidad, puede contactarnos a través de:
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <p><strong>Email:</strong> emmagava10@gmail.com</p>
            <p><strong>Aplicación:</strong> Klosync</p>
            <p><strong>Sitio web:</strong> klosync.vercel.app</p>
          </div>
        </section>
      </div>
    </div>
  );
} 