'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Verificar si hay un error en los parámetros de búsqueda
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      console.error('Error en inicio de sesión:', errorParam);
      
      if (errorParam === 'OAuthSignin') {
        setError('Error al conectar con Google. Por favor, inténtalo de nuevo.');
      } else if (errorParam === 'OAuthCallback') {
        setError('Error en la respuesta de Google. Por favor, inténtalo de nuevo.');
      } else if (errorParam === 'AccessDenied') {
        setError('Acceso denegado. No tienes permiso para acceder.');
      } else {
        setError(`Error de autenticación: ${errorParam}`);
      }
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Incluir los scopes necesarios para Google Sheets y Drive
      await signIn('google', { 
        callbackUrl: '/',
        redirect: true,
        scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
      });
      
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setError('Error al conectar con Google. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            Iniciar Sesión
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Conecta con Google para empezar a crear tus proyectos
          </p>
        </div>
        
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-100">
            {error}
          </div>
        )}
        
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full justify-center items-center py-3 px-4 text-gray-800 dark:text-white rounded-lg border border-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              </span>
              Continuar con Google
            </>
          )}
        </button>
        
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Al iniciar sesión aceptas nuestros{' '}
          <a href="/terminos" className="text-blue-500 hover:underline">
            Términos y Condiciones
          </a>
        </div>
      </div>
    </div>
  );
} 