import React from 'react';

export default function DataDeletion() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Eliminación de Datos</h1>
      
      <div className="prose max-w-none">
        <p className="mb-4">
          Última actualización: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">Solicitud de Eliminación de Datos</h2>
          <p className="mb-4">
            Si desea eliminar sus datos personales de Klosync, puede hacerlo siguiendo estos pasos:
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">1. Eliminación Automática</h2>
          <p className="mb-4">
            Puede eliminar su cuenta y todos los datos asociados directamente desde la aplicación:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Inicie sesión en su cuenta de Klosync</li>
            <li>Vaya a Configuración → Cuenta</li>
            <li>Seleccione "Eliminar Cuenta"</li>
            <li>Confirme la eliminación</li>
          </ul>
          <p className="mb-4">
            <strong>Nota:</strong> Esta acción es irreversible y eliminará permanentemente:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Su perfil de usuario</li>
            <li>Todas las conversaciones y mensajes</li>
            <li>Configuraciones de mensajería</li>
            <li>Historial de interacciones</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">2. Solicitud Manual</h2>
          <p className="mb-4">
            Si no puede acceder a su cuenta o prefiere una solicitud manual, contáctenos:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p><strong>Email:</strong> emmagava10@gmail.com</p>
            <p><strong>Asunto:</strong> Solicitud de Eliminación de Datos - Klosync</p>
          </div>
          <p className="mb-4">
            En su solicitud, incluya:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Su dirección de email registrada</li>
            <li>Confirmación de que desea eliminar todos sus datos</li>
            <li>Cualquier información adicional que nos ayude a identificar su cuenta</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">3. Tiempo de Procesamiento</h2>
          <p className="mb-4">
            Las solicitudes de eliminación de datos se procesan de la siguiente manera:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Eliminación automática:</strong> Inmediata</li>
            <li><strong>Solicitud manual:</strong> Dentro de 30 días hábiles</li>
            <li><strong>Confirmación:</strong> Recibirá un email de confirmación una vez completada</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">4. Datos que se Conservan</h2>
          <p className="mb-4">
            Algunos datos pueden conservarse por razones legales o de seguridad:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Registros de transacciones (si aplica)</li>
            <li>Datos requeridos por ley</li>
            <li>Información necesaria para resolver disputas</li>
          </ul>
          <p className="mb-4">
            Estos datos se conservan de forma segura y se eliminan tan pronto como sea legalmente posible.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">5. Datos de Terceros</h2>
          <p className="mb-4">
            Para datos compartidos con plataformas de terceros (WhatsApp, Telegram, etc.):
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Debe solicitar la eliminación directamente a cada plataforma</li>
            <li>Klosync eliminará las referencias y configuraciones</li>
            <li>Los mensajes enviados a través de estas plataformas siguen sus políticas respectivas</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-3">6. Contacto</h2>
          <p className="mb-4">
            Para preguntas sobre la eliminación de datos o para ejercer sus derechos de privacidad:
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p><strong>Email:</strong> emmagava10@gmail.com</p>
            <p><strong>Aplicación:</strong> Klosync</p>
            <p><strong>Respuesta:</strong> Dentro de 48 horas</p>
          </div>
        </section>
      </div>
    </div>
  );
}