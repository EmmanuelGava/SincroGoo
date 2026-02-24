import React from 'react';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Términos de Servicio</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          Última actualización: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar este servicio, usted acepta estar sujeto a estos términos y condiciones de uso.
            Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">2. Descripción del Servicio</h2>
          <p>
            Klosync proporciona una plataforma de mensajería unificada que permite a los usuarios gestionar 
            conversaciones de múltiples plataformas (WhatsApp, Telegram, Email) desde una sola interfaz. 
            Nos reservamos el derecho de modificar o descontinuar el servicio en cualquier momento con previo aviso.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">3. Cuentas de Usuario</h2>
          <p>
            Para utilizar nuestro servicio, debe crear una cuenta y proporcionar información precisa y completa.
            Usted es responsable de mantener la seguridad de su cuenta y contraseña.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">4. Uso Aceptable</h2>
          <p>
            Usted acepta no utilizar el servicio para:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Actividades ilegales o fraudulentas</li>
            <li>Distribuir malware o código dañino</li>
            <li>Interferir con la seguridad del servicio</li>
            <li>Violar los derechos de otros usuarios</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">5. Propiedad Intelectual</h2>
          <p>
            El servicio y su contenido original son y permanecerán propiedad exclusiva de la empresa y sus licenciantes.
            El servicio está protegido por derechos de autor, marcas comerciales y otras leyes.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">6. Limitación de Responsabilidad</h2>
          <p>
            En ningún caso seremos responsables por daños indirectos, incidentales, especiales o consecuentes
            que resulten del uso o la imposibilidad de usar el servicio.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">7. Cambios en los Términos</h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento.
            Los cambios entrarán en vigor inmediatamente después de su publicación en el servicio.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">8. Contacto</h2>
          <p>
            Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos a través de:
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