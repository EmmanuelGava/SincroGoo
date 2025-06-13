'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
// import Image from 'next/image'; // Comentado porque no se utiliza

export default function SignIn() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Verificar si hay un error en los parámetros de búsqueda
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      console.error('Error en inicio de sesión detectado:', errorParam);
      
      if (errorParam === 'OAuthSignin') {
        setError('Error al intentar conectar con Google. Por favor, inténtalo de nuevo.');
      } else if (errorParam === 'OAuthCallback') {
        setError('Error en la respuesta de Google. Por favor, inténtalo de nuevo.');
      } else if (errorParam === 'AccessDenied') {
        setError('Acceso denegado. No tienes permiso para acceder.');
      } else if (errorParam === 'CredentialsSignin') {
        setError('Email o contraseña incorrectos. Por favor, verifica tus datos.');
      } else {
        setError(`Error de autenticación. Código: ${errorParam}`);
      }
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
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
      setGoogleLoading(false);
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setCredentialsLoading(false);

    if (result?.error) {
      console.error('Credentials sign-in error from next-auth:', result.error);
      setError(result.error === 'CredentialsSignin' ? 'Email o contraseña incorrectos.' : result.error || 'Error desconocido al iniciar sesión.');
    } else if (result?.ok) {
      window.location.href = searchParams?.get('callbackUrl') || '/';
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
            Usa tu email o cuenta de Google para acceder.
          </p>
        </div>
        
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleCredentialsSignIn} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={credentialsLoading || googleLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {credentialsLoading ? (
              <div className="w-5 h-5 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            ) : (
              'Iniciar Sesión con Email'
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              O continúa con
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || credentialsLoading}
          className="flex w-full justify-center items-center py-3 px-4 text-gray-800 dark:text-white rounded-lg border border-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {googleLoading ? (
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